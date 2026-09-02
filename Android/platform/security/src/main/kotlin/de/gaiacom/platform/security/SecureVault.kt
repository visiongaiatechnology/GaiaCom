// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security

import java.security.SecureRandom
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

class SecureVault private constructor(
    private val repository: VaultRepository,
    private val masterKey: ByteArray,
    val assurance: HardwareAssurance,
    secureRandom: SecureRandom,
) : AutoCloseable {
    private val lock = ReentrantReadWriteLock()
    private val cipher = AesGcmVaultCipher(secureRandom)
    private var closed = false

    fun write(recordId: VaultRecordId, plaintext: ByteArray) {
        lock.write {
            ensureOpen()
            val encrypted = cipher.encrypt(masterKey, plaintext, recordId.associatedData())
            try {
                repository.replace(recordId.storageKey, encrypted)
            } catch (exception: Exception) {
                throw VaultStorageException("vault record write failed", exception)
            } finally {
                encrypted.fill(0)
            }
        }
    }

    fun read(recordId: VaultRecordId): ByteArray? = lock.read {
        ensureOpen()
        val encrypted = try {
            repository.read(recordId.storageKey)
        } catch (exception: Exception) {
            throw VaultStorageException("vault record read failed", exception)
        } ?: return@read null
        try {
            cipher.decrypt(masterKey, encrypted, recordId.associatedData())
        } finally {
            encrypted.fill(0)
        }
    }

    fun delete(recordId: VaultRecordId): Boolean = lock.write {
        ensureOpen()
        try {
            repository.delete(recordId.storageKey)
        } catch (exception: Exception) {
            throw VaultStorageException("vault record deletion failed", exception)
        }
    }

    override fun close() {
        lock.write {
            if (!closed) {
                closed = true
                masterKey.fill(0)
            }
        }
    }

    private fun ensureOpen() {
        check(!closed) { "vault is closed" }
    }

    companion object {
        private const val ROOT_RECORD_ID = ".system/vault-master-key"

        fun open(
            repository: VaultRepository,
            keyProtector: VaultKeyProtector,
            secureRandom: SecureRandom = SecureRandom(),
        ): SecureVault {
            val rootRecord = readRootRecord(repository)
            val protectedKey = rootRecord?.let(::decodeProtectedKey)
                ?: initializeRootRecord(repository, keyProtector, secureRandom)
            val rawKey = try {
                keyProtector.unprotect(protectedKey)
            } catch (exception: VaultSecurityException) {
                throw exception
            } catch (exception: Exception) {
                throw VaultSecurityException("vault root key could not be unprotected", exception)
            }
            if (rawKey.size != AesGcmVaultCipher.MASTER_KEY_BYTES) {
                rawKey.fill(0)
                throw VaultSecurityException("vault root key has invalid length")
            }
            return SecureVault(repository, rawKey, protectedKey.assurance, secureRandom)
        }

        private fun initializeRootRecord(
            repository: VaultRepository,
            keyProtector: VaultKeyProtector,
            secureRandom: SecureRandom,
        ): ProtectedKey {
            val generated = ByteArray(AesGcmVaultCipher.MASTER_KEY_BYTES).also(secureRandom::nextBytes)
            val candidate = try {
                keyProtector.protect(generated)
            } finally {
                generated.fill(0)
            }
            val encoded = encodeProtectedKey(candidate)
            val created = try {
                repository.create(ROOT_RECORD_ID, encoded)
            } catch (exception: Exception) {
                throw VaultStorageException("vault root key initialization failed", exception)
            } finally {
                encoded.fill(0)
            }
            if (created) {
                return candidate
            }
            return readRootRecord(repository)?.let(::decodeProtectedKey)
                ?: throw VaultStorageException("vault root key initialization lost atomicity")
        }

        private fun readRootRecord(repository: VaultRepository): ByteArray? = try {
            repository.read(ROOT_RECORD_ID)
        } catch (exception: Exception) {
            throw VaultStorageException("vault root key read failed", exception)
        }

        private fun encodeProtectedKey(protectedKey: ProtectedKey): ByteArray {
            val bytes = protectedKey.bytes
            return try {
                byteArrayOf(protectedKey.assurance.ordinal.toByte()) + bytes
            } finally {
                bytes.fill(0)
            }
        }

        private fun decodeProtectedKey(encoded: ByteArray): ProtectedKey {
            try {
                if (encoded.size !in 2..(ProtectedKey.MAX_PROTECTED_KEY_BYTES + 1)) {
                    throw VaultSecurityException("protected vault key envelope has invalid size")
                }
                val assurance = HardwareAssurance.entries.getOrNull(encoded[0].toInt())
                    ?: throw VaultSecurityException("protected vault key assurance is invalid")
                return ProtectedKey(encoded.copyOfRange(1, encoded.size), assurance)
            } finally {
                encoded.fill(0)
            }
        }
    }
}
