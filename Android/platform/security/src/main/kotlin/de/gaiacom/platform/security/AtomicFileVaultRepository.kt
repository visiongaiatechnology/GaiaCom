// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security

import java.io.IOException
import java.nio.charset.StandardCharsets
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.FileAlreadyExistsException
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.nio.file.StandardOpenOption
import java.nio.file.attribute.PosixFilePermission
import java.nio.file.attribute.PosixFilePermissions
import java.security.MessageDigest
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

class AtomicFileVaultRepository(rootDirectory: Path) : VaultRepository {
    private val lock = ReentrantReadWriteLock()
    private val root = initializeRoot(rootDirectory)

    override fun read(recordId: String): ByteArray? = lock.read {
        val path = recordPath(recordId)
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) {
            return@read null
        }
        rejectSymlink(path)
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
            throw VaultStorageException("vault record is not a regular file")
        }
        val size = Files.size(path)
        if (size !in 1..MAX_RECORD_BYTES.toLong()) {
            throw VaultStorageException("vault record size is invalid")
        }
        Files.readAllBytes(path)
    }

    override fun create(recordId: String, value: ByteArray): Boolean = lock.write {
        validateValue(value)
        val destination = recordPath(recordId)
        if (Files.exists(destination, LinkOption.NOFOLLOW_LINKS)) {
            rejectSymlink(destination)
            return@write false
        }
        val temporary = writeTemporary(value)
        try {
            move(temporary, destination, replace = false)
            true
        } catch (_: FileAlreadyExistsException) {
            false
        } finally {
            Files.deleteIfExists(temporary)
        }
    }

    override fun replace(recordId: String, value: ByteArray) = lock.write {
        validateValue(value)
        val destination = recordPath(recordId)
        if (Files.exists(destination, LinkOption.NOFOLLOW_LINKS)) {
            rejectSymlink(destination)
        }
        val temporary = writeTemporary(value)
        try {
            move(temporary, destination, replace = true)
        } finally {
            Files.deleteIfExists(temporary)
        }
    }

    override fun delete(recordId: String): Boolean = lock.write {
        val destination = recordPath(recordId)
        if (!Files.exists(destination, LinkOption.NOFOLLOW_LINKS)) {
            return@write false
        }
        rejectSymlink(destination)
        Files.delete(destination)
        true
    }

    private fun recordPath(recordId: String): Path {
        require(recordId.length in 1..MAX_RECORD_ID_CHARS) { "invalid vault record identifier length" }
        require(recordId.none { it.code < 0x20 || it.code == 0x7f }) { "invalid vault record identifier" }
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(recordId.toByteArray(StandardCharsets.UTF_8))
        val filename = buildString(digest.size * 2 + FILE_SUFFIX.length) {
            digest.forEach { byte -> append("%02x".format(byte.toInt() and 0xff)) }
            append(FILE_SUFFIX)
        }
        digest.fill(0)
        val destination = root.resolve(filename).normalize()
        if (destination.parent != root) {
            throw VaultSecurityException("vault record escaped storage root")
        }
        return destination
    }

    private fun writeTemporary(value: ByteArray): Path {
        val temporary = createPrivateTemporaryFile()
        try {
            Files.newOutputStream(temporary, StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING).use {
                output -> output.write(value)
            }
            return temporary
        } catch (exception: Exception) {
            Files.deleteIfExists(temporary)
            throw exception
        }
    }

    private fun createPrivateTemporaryFile(): Path = try {
        Files.createTempFile(
            root,
            TEMP_PREFIX,
            TEMP_SUFFIX,
            PosixFilePermissions.asFileAttribute(FILE_PERMISSIONS),
        )
    } catch (_: UnsupportedOperationException) {
        Files.createTempFile(root, TEMP_PREFIX, TEMP_SUFFIX)
    }

    private fun move(source: Path, destination: Path, replace: Boolean) {
        val baseOptions = if (replace) {
            arrayOf(StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        } else {
            arrayOf(StandardCopyOption.ATOMIC_MOVE)
        }
        try {
            Files.move(source, destination, *baseOptions)
        } catch (exception: AtomicMoveNotSupportedException) {
            throw VaultStorageException("vault filesystem does not support atomic replacement", exception)
        }
        applyOwnerOnlyPermissions(destination, FILE_PERMISSIONS)
    }

    private fun validateValue(value: ByteArray) {
        require(value.size in 1..MAX_RECORD_BYTES) { "vault record exceeds size boundary" }
    }

    private fun rejectSymlink(path: Path) {
        if (Files.isSymbolicLink(path)) {
            throw VaultSecurityException("symbolic links are forbidden in the vault")
        }
    }

    companion object {
        private const val MAX_RECORD_BYTES = VaultEnvelopeCodec.MAX_PLAINTEXT_BYTES + 64 * 1024
        private const val MAX_RECORD_ID_CHARS = 512
        private const val FILE_SUFFIX = ".gcvault"
        private const val TEMP_PREFIX = ".vault-write-"
        private const val TEMP_SUFFIX = ".tmp"
        private val DIRECTORY_PERMISSIONS = PosixFilePermissions.fromString("rwx------")
        private val FILE_PERMISSIONS = PosixFilePermissions.fromString("rw-------")

        private fun initializeRoot(input: Path): Path {
            val normalized = input.toAbsolutePath().normalize()
            validateExistingAncestors(normalized)
            try {
                Files.createDirectories(normalized, PosixFilePermissions.asFileAttribute(DIRECTORY_PERMISSIONS))
            } catch (_: UnsupportedOperationException) {
                Files.createDirectories(normalized)
            }
            if (Files.isSymbolicLink(normalized) || !Files.isDirectory(normalized, LinkOption.NOFOLLOW_LINKS)) {
                throw VaultSecurityException("vault root is not a trusted directory")
            }
            applyOwnerOnlyPermissions(normalized, DIRECTORY_PERMISSIONS)
            return normalized
        }

        private fun validateExistingAncestors(path: Path) {
            var current: Path? = path
            while (current != null) {
                if (Files.exists(current, LinkOption.NOFOLLOW_LINKS) && Files.isSymbolicLink(current)) {
                    throw VaultSecurityException("vault root contains a symbolic link")
                }
                current = current.parent
            }
        }

        private fun applyOwnerOnlyPermissions(path: Path, permissions: Set<PosixFilePermission>) {
            try {
                Files.setPosixFilePermissions(path, permissions)
            } catch (_: UnsupportedOperationException) {
                // Android/Linux supports POSIX permissions; non-POSIX test hosts use application-private ACLs.
            } catch (exception: IOException) {
                throw VaultStorageException("vault permissions could not be enforced", exception)
            }
        }
    }
}
