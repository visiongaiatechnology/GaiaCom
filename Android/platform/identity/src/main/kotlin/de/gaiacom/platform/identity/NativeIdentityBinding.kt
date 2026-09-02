// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.identity

internal interface NativeIdentityBinding {
    fun validateMnemonic(mnemonicUtf8: ByteArray): Boolean

    fun deriveIdentity(mnemonicUtf8: ByteArray): NativeIdentityKeyBundle

    fun importIdentity(
        ed25519PrivateSeed: ByteArray,
        x25519Private: ByteArray,
        mlKem1024Private: ByteArray,
        mlDsa87Private: ByteArray,
    ): NativeIdentityKeyBundle
}

internal interface NativeIdentityKeyBundle : AutoCloseable {
    fun ed25519Public(): ByteArray

    fun ed25519PrivateSeed(): ByteArray

    fun x25519Public(): ByteArray

    fun x25519Private(): ByteArray

    fun mlKem1024Public(): ByteArray

    fun mlKem1024Private(): ByteArray

    fun mlDsa87Public(): ByteArray

    fun mlDsa87Private(): ByteArray
}
