// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security

import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SecureVaultTest {
    @Test
    fun roundTripSurvivesVaultReopen() {
        val repository = MemoryRepository()
        val protector = TestKeyProtector()
        val id = VaultRecordId("identity", "primary-device")
        val plaintext = "private-device-material".encodeToByteArray()

        SecureVault.open(repository, protector).use { vault ->
            assertEquals(HardwareAssurance.TRUSTED_EXECUTION_ENVIRONMENT, vault.assurance)
            vault.write(id, plaintext)
            assertContentEquals(plaintext, vault.read(id))
        }
        SecureVault.open(repository, protector).use { reopened ->
            assertContentEquals(plaintext, reopened.read(id))
            assertTrue(reopened.delete(id))
            assertNull(reopened.read(id))
        }
    }

    @Test
    fun ciphertextIsBoundToNamespaceAndName() {
        val repository = MemoryRepository()
        val protector = TestKeyProtector()
        val original = VaultRecordId("mail", "account")
        val substituted = VaultRecordId("chat", "account")
        SecureVault.open(repository, protector).use { vault ->
            vault.write(original, "secret".encodeToByteArray())
            repository.copy(original.storageKey, substituted.storageKey)
            assertFailsWith<VaultSecurityException> { vault.read(substituted) }
        }
    }

    @Test
    fun tamperingFailsClosed() {
        val repository = MemoryRepository()
        val protector = TestKeyProtector()
        val id = VaultRecordId("security", "node-secrets")
        SecureVault.open(repository, protector).use { vault ->
            vault.write(id, ByteArray(64) { it.toByte() })
            repository.mutate(id.storageKey) { bytes -> bytes[bytes.lastIndex] = (bytes.last() + 1).toByte() }
            assertFailsWith<VaultSecurityException> { vault.read(id) }
        }
    }

    @Test
    fun closedVaultRejectsAccess() {
        val vault = SecureVault.open(MemoryRepository(), TestKeyProtector())
        vault.close()
        assertFailsWith<IllegalStateException> { vault.read(VaultRecordId("test", "closed")) }
    }
}

private class MemoryRepository : VaultRepository {
    private val records = ConcurrentHashMap<String, ByteArray>()

    override fun read(recordId: String): ByteArray? = records[recordId]?.copyOf()

    override fun create(recordId: String, value: ByteArray): Boolean =
        records.putIfAbsent(recordId, value.copyOf()) == null

    override fun replace(recordId: String, value: ByteArray) {
        records[recordId] = value.copyOf()
    }

    override fun delete(recordId: String): Boolean = records.remove(recordId) != null

    fun copy(source: String, destination: String) {
        records[destination] = requireNotNull(records[source]).copyOf()
    }

    fun mutate(recordId: String, operation: (ByteArray) -> Unit) {
        operation(requireNotNull(records[recordId]))
    }
}

private class TestKeyProtector : VaultKeyProtector {
    private val key = ByteArray(32) { index -> (index * 7 + 11).toByte() }
    private val random = SecureRandom()

    override fun protect(rawKey: ByteArray): ProtectedKey {
        val nonce = ByteArray(12).also(random::nextBytes)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
        }
        return ProtectedKey(
            nonce + cipher.doFinal(rawKey),
            HardwareAssurance.TRUSTED_EXECUTION_ENVIRONMENT,
        )
    }

    override fun unprotect(protectedKey: ProtectedKey): ByteArray {
        val encoded = protectedKey.bytes
        val nonce = encoded.copyOfRange(0, 12)
        val ciphertext = encoded.copyOfRange(12, encoded.size)
        return Cipher.getInstance("AES/GCM/NoPadding").run {
            init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
            doFinal(ciphertext)
        }
    }
}
