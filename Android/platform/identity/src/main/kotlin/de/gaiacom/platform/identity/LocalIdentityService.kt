// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.identity

interface LocalIdentityService {
    fun validateMnemonic(mnemonicUtf8: ByteArray): Boolean

    fun deriveIdentity(mnemonicUtf8: ByteArray): LocalIdentityKeyMaterial

    fun importIdentity(
        ed25519PrivateSeed: ByteArray,
        x25519Private: ByteArray,
        mlKem1024Private: ByteArray,
        mlDsa87Private: ByteArray,
    ): LocalIdentityKeyMaterial
}

object LocalIdentityServiceFactory {
    @JvmStatic
    fun create(): LocalIdentityService = DefaultLocalIdentityService(GomobileIdentityBinding)
}

enum class LocalIdentityFailure {
    INVALID_MNEMONIC,
    VALIDATION_UNAVAILABLE,
    DERIVATION_FAILED,
    IMPORT_FAILED,
    NATIVE_KEY_MATERIAL_INVALID,
    MATERIAL_CLOSED,
    NATIVE_RELEASE_FAILED,
}

class LocalIdentityException(
    val failure: LocalIdentityFailure,
    cause: Throwable? = null,
) : IllegalStateException("local identity operation failed: ${failure.name}", cause)
