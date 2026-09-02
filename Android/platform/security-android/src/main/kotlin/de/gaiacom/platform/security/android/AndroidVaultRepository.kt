// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.android

import android.content.Context
import android.system.ErrnoException
import android.system.Os
import android.system.OsConstants
import android.util.AtomicFile
import de.gaiacom.platform.security.VaultRepository
import de.gaiacom.platform.security.VaultSecurityException
import de.gaiacom.platform.security.VaultStorageException
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

class AndroidVaultRepository(context: Context) : VaultRepository {
    private val lock = ReentrantReadWriteLock()
    private val root = initializeRoot(context.applicationContext)

    override fun read(recordId: String): ByteArray? = lock.read {
        val destination = recordFile(recordId)
        if (!destination.exists()) {
            return@read null
        }
        rejectSymbolicLink(destination)
        val size = destination.length()
        if (!destination.isFile || size !in 1..MAX_RECORD_BYTES.toLong()) {
            throw VaultStorageException("vault record boundary is invalid")
        }
        try {
            AtomicFile(destination).openRead().use { input ->
                val value = input.readBytes()
                if (value.size.toLong() != size) {
                    value.fill(0)
                    throw VaultStorageException("vault record changed during read")
                }
                value
            }
        } catch (exception: VaultStorageException) {
            throw exception
        } catch (exception: Exception) {
            throw VaultStorageException("vault record read failed", exception)
        }
    }

    override fun create(recordId: String, value: ByteArray): Boolean = lock.write {
        validateValue(value)
        val destination = recordFile(recordId)
        if (destination.exists()) {
            rejectSymbolicLink(destination)
            return@write false
        }
        writeAtomic(destination, value)
        true
    }

    override fun replace(recordId: String, value: ByteArray) = lock.write {
        validateValue(value)
        val destination = recordFile(recordId)
        if (destination.exists()) {
            rejectSymbolicLink(destination)
        }
        writeAtomic(destination, value)
    }

    override fun delete(recordId: String): Boolean = lock.write {
        val destination = recordFile(recordId)
        if (!destination.exists()) {
            return@write false
        }
        rejectSymbolicLink(destination)
        AtomicFile(destination).delete()
        !destination.exists()
    }

    fun exists(recordId: String): Boolean = lock.read {
        val destination = recordFile(recordId)
        if (!destination.exists()) {
            return@read false
        }
        rejectSymbolicLink(destination)
        val size = destination.length()
        if (!destination.isFile || size !in 1..MAX_RECORD_BYTES.toLong()) {
            throw VaultStorageException("vault record boundary is invalid")
        }
        true
    }

    fun resetStorage() = lock.write {
        val children = root.listFiles()
            ?: throw VaultStorageException("vault directory could not be enumerated")
        children.forEach { child ->
            rejectSymbolicLink(child)
            if (!child.isFile || child.canonicalFile.parentFile != root) {
                throw VaultSecurityException("vault reset encountered an untrusted entry")
            }
        }
        children.forEach { child ->
            if (!child.delete() && child.exists()) {
                throw VaultStorageException("vault record reset failed")
            }
        }
        if (root.listFiles()?.isNotEmpty() != false) {
            throw VaultStorageException("vault reset verification failed")
        }
        applyMode(root, DIRECTORY_MODE)
    }

    private fun writeAtomic(destination: File, value: ByteArray) {
        val atomicFile = AtomicFile(destination)
        val output = try {
            atomicFile.startWrite()
        } catch (exception: Exception) {
            throw VaultStorageException("vault atomic write could not start", exception)
        }
        try {
            output.write(value)
            atomicFile.finishWrite(output)
            applyMode(destination, FILE_MODE)
        } catch (exception: Exception) {
            atomicFile.failWrite(output)
            throw VaultStorageException("vault atomic write failed", exception)
        }
    }

    private fun recordFile(recordId: String): File {
        require(recordId.length in 1..MAX_RECORD_ID_CHARS) { "vault record identifier length is invalid" }
        require(recordId.none { it.code < 0x20 || it.code == 0x7f }) { "vault record identifier is invalid" }
        val digest = MessageDigest.getInstance("SHA-256").digest(recordId.encodeToByteArray())
        val name = try {
            buildString(digest.size * 2 + FILE_SUFFIX.length) {
                digest.forEach { byte -> append(HEX[(byte.toInt() ushr 4) and 0x0f]).append(HEX[byte.toInt() and 0x0f]) }
                append(FILE_SUFFIX)
            }
        } finally {
            digest.fill(0)
        }
        val destination = File(root, name)
        if (destination.parentFile != root) {
            throw VaultSecurityException("vault record escaped application storage")
        }
        return destination
    }

    private fun validateValue(value: ByteArray) {
        require(value.size in 1..MAX_RECORD_BYTES) { "vault record exceeds size boundary" }
    }

    companion object {
        private const val DIRECTORY_NAME = "vault-v1"
        private const val FILE_SUFFIX = ".gcvault"
        private const val MAX_RECORD_BYTES = 16 * 1024 * 1024 + 64 * 1024
        private const val MAX_RECORD_ID_CHARS = 512
        private const val DIRECTORY_MODE = 0x1c0 // 0700
        private const val FILE_MODE = 0x180 // 0600
        private const val HEX = "0123456789abcdef"

        private fun initializeRoot(context: Context): File {
            val noBackupRoot = context.noBackupFilesDir
            rejectSymbolicLink(noBackupRoot)
            val root = File(noBackupRoot, DIRECTORY_NAME)
            if (!root.exists() && !root.mkdirs()) {
                throw VaultStorageException("vault directory could not be created")
            }
            rejectSymbolicLink(root)
            if (!root.isDirectory || root.canonicalFile.parentFile != noBackupRoot.canonicalFile) {
                throw VaultSecurityException("vault directory escaped application storage")
            }
            applyMode(root, DIRECTORY_MODE)
            return root.canonicalFile
        }

        private fun rejectSymbolicLink(file: File) {
            try {
                if (OsConstants.S_ISLNK(Os.lstat(file.absolutePath).st_mode)) {
                    throw VaultSecurityException("symbolic links are forbidden in the vault")
                }
            } catch (exception: ErrnoException) {
                if (exception.errno != OsConstants.ENOENT) {
                    throw VaultStorageException("vault path metadata could not be verified", exception)
                }
            }
        }

        private fun applyMode(file: File, mode: Int) {
            try {
                Os.chmod(file.absolutePath, mode)
            } catch (exception: ErrnoException) {
                throw VaultStorageException("vault filesystem permissions could not be enforced", exception)
            }
        }
    }
}
