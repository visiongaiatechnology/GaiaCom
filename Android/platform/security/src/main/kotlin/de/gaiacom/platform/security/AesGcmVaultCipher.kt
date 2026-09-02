// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security

import java.security.GeneralSecurityException
import java.security.SecureRandom
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

internal class AesGcmVaultCipher(
    private val secureRandom: SecureRandom,
) {
    fun encrypt(masterKey: ByteArray, plaintext: ByteArray, associatedData: ByteArray): ByteArray {
        validateKey(masterKey)
        require(plaintext.size <= VaultEnvelopeCodec.MAX_PLAINTEXT_BYTES) { "vault plaintext exceeds size limit" }
        val nonce = ByteArray(NONCE_BYTES).also(secureRandom::nextBytes)
        return try {
            val cipher = newCipher(Cipher.ENCRYPT_MODE, masterKey, nonce, associatedData)
            VaultEnvelopeCodec.encode(VaultEnvelope(nonce, cipher.doFinal(plaintext)))
        } catch (exception: GeneralSecurityException) {
            throw VaultSecurityException("vault encryption failed", exception)
        } finally {
            nonce.fill(0)
        }
    }

    fun decrypt(masterKey: ByteArray, encoded: ByteArray, associatedData: ByteArray): ByteArray {
        validateKey(masterKey)
        val envelope = VaultEnvelopeCodec.decode(encoded)
        return try {
            val cipher = newCipher(Cipher.DECRYPT_MODE, masterKey, envelope.nonce, associatedData)
            cipher.doFinal(envelope.ciphertext)
        } catch (exception: AEADBadTagException) {
            throw VaultSecurityException("vault authentication failed", exception)
        } catch (exception: GeneralSecurityException) {
            throw VaultSecurityException("vault decryption failed", exception)
        } finally {
            envelope.nonce.fill(0)
            envelope.ciphertext.fill(0)
        }
    }

    private fun newCipher(
        mode: Int,
        masterKey: ByteArray,
        nonce: ByteArray,
        associatedData: ByteArray,
    ): Cipher = Cipher.getInstance(TRANSFORMATION).apply {
        init(mode, SecretKeySpec(masterKey, "AES"), GCMParameterSpec(TAG_BITS, nonce))
        updateAAD(associatedData)
    }

    private fun validateKey(masterKey: ByteArray) {
        if (masterKey.size != MASTER_KEY_BYTES) {
            throw VaultSecurityException("vault master key has invalid length")
        }
    }

    companion object {
        const val MASTER_KEY_BYTES = 32
        private const val NONCE_BYTES = 12
        private const val TAG_BITS = 128
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
