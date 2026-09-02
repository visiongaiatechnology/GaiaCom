// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security

enum class HardwareAssurance {
    STRONGBOX,
    TRUSTED_EXECUTION_ENVIRONMENT,
    SOFTWARE,
}

class ProtectedKey(
    encoded: ByteArray,
    val assurance: HardwareAssurance,
) {
    private val material = encoded.copyOf()

    init {
        require(material.isNotEmpty()) { "protected key must not be empty" }
        require(material.size <= MAX_PROTECTED_KEY_BYTES) { "protected key exceeds size limit" }
    }

    val bytes: ByteArray
        get() = material.copyOf()

    companion object {
        const val MAX_PROTECTED_KEY_BYTES: Int = 16 * 1024
    }
}

interface VaultKeyProtector {
    fun protect(rawKey: ByteArray): ProtectedKey

    fun unprotect(protectedKey: ProtectedKey): ByteArray
}

interface VaultRepository {
    fun read(recordId: String): ByteArray?

    fun create(recordId: String, value: ByteArray): Boolean

    fun replace(recordId: String, value: ByteArray)

    fun delete(recordId: String): Boolean
}

data class VaultRecordId(
    val namespace: String,
    val name: String,
) {
    init {
        require(VALID_COMPONENT.matches(namespace)) { "invalid vault namespace" }
        require(VALID_COMPONENT.matches(name)) { "invalid vault record name" }
    }

    val storageKey: String
        get() = "$namespace/$name"

    fun associatedData(): ByteArray = "gaiacom-vault-v1\u0000$namespace\u0000$name".encodeToByteArray()

    companion object {
        private val VALID_COMPONENT = Regex("[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}")
    }
}

open class VaultSecurityException(message: String, cause: Throwable? = null) : SecurityException(message, cause)

class VaultAuthenticationRequiredException(message: String, cause: Throwable? = null) :
    VaultSecurityException(message, cause)

class VaultKeyInvalidatedException(message: String, cause: Throwable? = null) :
    VaultSecurityException(message, cause)

class VaultHardwareUnavailableException(message: String, cause: Throwable? = null) :
    VaultSecurityException(message, cause)

class VaultStorageException(message: String, cause: Throwable? = null) : IllegalStateException(message, cause)
