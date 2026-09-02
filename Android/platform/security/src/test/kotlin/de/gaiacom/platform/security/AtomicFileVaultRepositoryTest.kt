// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security

import java.nio.file.Files
import kotlin.io.path.createTempDirectory
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AtomicFileVaultRepositoryTest {
    @Test
    fun persistsDefensiveCopiesWithOpaqueFilenames() {
        val root = createTempDirectory("gaiacom-vault-test-")
        try {
            val repository = AtomicFileVaultRepository(root)
            val source = byteArrayOf(1, 2, 3, 4)
            assertTrue(repository.create("mail/primary", source))
            source.fill(9)
            assertContentEquals(byteArrayOf(1, 2, 3, 4), repository.read("mail/primary"))
            assertFalse(repository.create("mail/primary", byteArrayOf(5)))
            assertTrue(repository.delete("mail/primary"))
            assertNull(repository.read("mail/primary"))
            assertTrue(Files.list(root).use { stream -> stream.noneMatch { it.fileName.toString().contains("mail") } })
        } finally {
            root.toFile().deleteRecursively()
        }
    }

    @Test
    fun replacementIsVisibleAsOneCompleteRecord() {
        val root = createTempDirectory("gaiacom-vault-test-")
        try {
            val repository = AtomicFileVaultRepository(root)
            repository.replace("security/root", ByteArray(128) { 1 })
            repository.replace("security/root", ByteArray(256) { 2 })
            assertContentEquals(ByteArray(256) { 2 }, repository.read("security/root"))
        } finally {
            root.toFile().deleteRecursively()
        }
    }
}
