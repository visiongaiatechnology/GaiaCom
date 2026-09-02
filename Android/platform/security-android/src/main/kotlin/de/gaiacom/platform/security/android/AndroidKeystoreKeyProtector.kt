// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.android

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.security.keystore.StrongBoxUnavailableException
import android.security.keystore.UserNotAuthenticatedException
import de.gaiacom.platform.security.HardwareAssurance
import de.gaiacom.platform.security.ProtectedKey
import de.gaiacom.platform.security.VaultAuthenticationRequiredException
import de.gaiacom.platform.security.VaultHardwareUnavailableException
import de.gaiacom.platform.security.VaultKeyInvalidatedException
import de.gaiacom.platform.security.VaultKeyProtector
import de.gaiacom.platform.security.VaultSecurityException
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.security.ProviderException
import java.util.concurrent.locks.ReentrantLock
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import kotlin.concurrent.withLock

class AndroidKeystoreKeyProtector(
    context: Context,
    private val alias: String = DEFAULT_ALIAS,
    private val authenticationWindowSeconds: Int = DEFAULT_AUTH_WINDOW_SECONDS,
    private val requireHardwareBacked: Boolean = true,
    private val preferStrongBox: Boolean = true,
) : VaultKeyProtector {
    private val applicationContext = context.applicationContext
    private val lock = ReentrantLock()
    private val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }

    init {
        require(ALIAS_PATTERN.matches(alias)) { "Android Keystore alias is invalid" }
        require(authenticationWindowSeconds in 1..MAX_AUTH_WINDOW_SECONDS) {
            "authentication window is invalid"
        }
    }

    override fun protect(rawKey: ByteArray): ProtectedKey = lock.withLock {
        require(rawKey.size == RAW_KEY_BYTES) { "vault root key has invalid length" }
        val key = loadOrCreateKey()
        val assurance = inspectAndValidate(key)
        val associatedData = associatedData(assurance)
        try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, key)
            cipher.updateAAD(associatedData)
            val ciphertext = cipher.doFinal(rawKey)
            val nonce = cipher.iv ?: throw VaultSecurityException("Android Keystore returned no nonce")
            try {
                val encoded = WrappedKeyEnvelopeCodec.encode(WrappedKeyEnvelope(nonce, ciphertext))
                return@withLock ProtectedKey(encoded, assurance)
            } finally {
                nonce.fill(0)
                ciphertext.fill(0)
            }
        } catch (exception: Exception) {
            throw mapCryptographicFailure("vault key protection failed", exception)
        } finally {
            associatedData.fill(0)
        }
    }

    override fun unprotect(protectedKey: ProtectedKey): ByteArray = lock.withLock {
        val key = loadExistingKey()
        val assurance = inspectAndValidate(key)
        if (assurance != protectedKey.assurance) {
            throw VaultSecurityException("vault hardware assurance changed")
        }
        val encoded = protectedKey.bytes
        val associatedData = associatedData(assurance)
        val envelope = try {
            WrappedKeyEnvelopeCodec.decode(encoded)
        } finally {
            encoded.fill(0)
        }
        try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_BITS, envelope.nonce))
            cipher.updateAAD(associatedData)
            return@withLock cipher.doFinal(envelope.ciphertext).also {
                if (it.size != RAW_KEY_BYTES) {
                    it.fill(0)
                    throw VaultSecurityException("unwrapped vault key has invalid length")
                }
            }
        } catch (exception: Exception) {
            throw mapCryptographicFailure("vault key unprotection failed", exception)
        } finally {
            associatedData.fill(0)
            envelope.nonce.fill(0)
            envelope.ciphertext.fill(0)
        }
    }

    fun hasKey(): Boolean = lock.withLock { keyStore.containsAlias(alias) }

    fun prepareKey(): HardwareAssurance = lock.withLock {
        inspectAndValidate(loadOrCreateKey())
    }

    fun deleteKey() = lock.withLock {
        try {
            if (keyStore.containsAlias(alias)) {
                keyStore.deleteEntry(alias)
            }
            if (keyStore.containsAlias(alias)) {
                throw VaultSecurityException("device-bound vault key reset verification failed")
            }
        } catch (exception: VaultSecurityException) {
            throw exception
        } catch (exception: Exception) {
            throw VaultSecurityException("device-bound vault key reset failed", exception)
        }
    }

    private fun loadOrCreateKey(): SecretKey {
        val existing = keyStore.getKey(alias, null)
        if (existing != null) {
            return existing as? SecretKey
                ?: throw VaultSecurityException("Android Keystore alias has an invalid key type")
        }
        val strongBoxAvailable = preferStrongBox && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
            applicationContext.packageManager.hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)
        return if (strongBoxAvailable) {
            try {
                generateKey(useStrongBox = true)
            } catch (_: StrongBoxUnavailableException) {
                generateKey(useStrongBox = false)
            } catch (exception: ProviderException) {
                generateKey(useStrongBox = false)
            }
        } else {
            generateKey(useStrongBox = false)
        }
    }

    private fun loadExistingKey(): SecretKey {
        val key = keyStore.getKey(alias, null)
            ?: throw VaultKeyInvalidatedException("device-bound vault key is unavailable")
        return key as? SecretKey
            ?: throw VaultSecurityException("Android Keystore alias has an invalid key type")
    }

    private fun generateKey(useStrongBox: Boolean): SecretKey {
        val builder = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setKeySize(KEY_BITS)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .setUserAuthenticationRequired(true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setUserAuthenticationParameters(
                authenticationWindowSeconds,
                KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL,
            )
        } else {
            @Suppress("DEPRECATION")
            builder.setUserAuthenticationValidityDurationSeconds(authenticationWindowSeconds)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            builder.setUnlockedDeviceRequired(true)
            builder.setIsStrongBoxBacked(useStrongBox)
        }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER)
        generator.init(builder.build())
        return generator.generateKey()
    }

    private fun inspectAndValidate(key: SecretKey): HardwareAssurance {
        val factory = SecretKeyFactory.getInstance(key.algorithm, KEYSTORE_PROVIDER)
        val info = factory.getKeySpec(key, KeyInfo::class.java) as KeyInfo
        if (info.keySize != KEY_BITS || !info.isUserAuthenticationRequired ||
            KeyProperties.PURPOSE_ENCRYPT and info.purposes == 0 ||
            KeyProperties.PURPOSE_DECRYPT and info.purposes == 0 ||
            KeyProperties.BLOCK_MODE_GCM !in info.blockModes ||
            KeyProperties.ENCRYPTION_PADDING_NONE !in info.encryptionPaddings
        ) {
            throw VaultSecurityException("Android Keystore key policy mismatch")
        }
        val assurance = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AndroidHardwareAssurance.fromSecurityLevel(info.securityLevel)
        } else if (isLegacyHardwareBacked(info)) {
            HardwareAssurance.TRUSTED_EXECUTION_ENVIRONMENT
        } else {
            HardwareAssurance.SOFTWARE
        }
        if (requireHardwareBacked && assurance == HardwareAssurance.SOFTWARE) {
            throw VaultHardwareUnavailableException("hardware-backed Android Keystore is required")
        }
        return assurance
    }

    @Suppress("DEPRECATION")
    private fun isLegacyHardwareBacked(info: KeyInfo): Boolean = info.isInsideSecureHardware

    private fun associatedData(assurance: HardwareAssurance): ByteArray =
        "$AAD_PREFIX\u0000$alias\u0000${assurance.name}".encodeToByteArray()

    private fun mapCryptographicFailure(message: String, exception: Exception): VaultSecurityException =
        when (exception) {
            is UserNotAuthenticatedException -> VaultAuthenticationRequiredException(message, exception)
            is KeyPermanentlyInvalidatedException -> VaultKeyInvalidatedException(message, exception)
            is AEADBadTagException -> VaultSecurityException("wrapped vault key authentication failed", exception)
            is GeneralSecurityException -> VaultSecurityException(message, exception)
            is VaultSecurityException -> exception
            else -> VaultSecurityException(message, exception)
        }

    companion object {
        private const val DEFAULT_ALIAS = "de.gaiacom.vault.device.v1"
        private const val DEFAULT_AUTH_WINDOW_SECONDS = 300
        private const val MAX_AUTH_WINDOW_SECONDS = 900
        private const val RAW_KEY_BYTES = 32
        private const val KEY_BITS = 256
        private const val TAG_BITS = 128
        private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val AAD_PREFIX = "gaiacom-android-vault-wrap-v1"
        private val ALIAS_PATTERN = Regex("[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}")
    }
}
