// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.identity

import de.gaiacom.nativecore.mobileapi.KeyBundle
import de.gaiacom.nativecore.mobileapi.Mobileapi

internal object GomobileIdentityBinding : NativeIdentityBinding {
    override fun validateMnemonic(mnemonicUtf8: ByteArray): Boolean =
        Mobileapi.validateMnemonic(mnemonicUtf8)

    override fun deriveIdentity(mnemonicUtf8: ByteArray): NativeIdentityKeyBundle =
        GomobileIdentityKeyBundle(Mobileapi.deriveIdentity(mnemonicUtf8))

    override fun importIdentity(
        ed25519PrivateSeed: ByteArray,
        x25519Private: ByteArray,
        mlKem1024Private: ByteArray,
        mlDsa87Private: ByteArray,
    ): NativeIdentityKeyBundle = GomobileIdentityKeyBundle(
        Mobileapi.importIdentity(
            ed25519PrivateSeed,
            x25519Private,
            mlKem1024Private,
            mlDsa87Private,
        ),
    )
}

private class GomobileIdentityKeyBundle(
    private val native: KeyBundle,
) : NativeIdentityKeyBundle {
    override fun ed25519Public(): ByteArray = native.ed25519Public()

    override fun ed25519PrivateSeed(): ByteArray = native.ed25519PrivateSeed()

    override fun x25519Public(): ByteArray = native.x25519Public()

    override fun x25519Private(): ByteArray = native.x25519Private()

    override fun mlKem1024Public(): ByteArray = native.mlkem1024Public()

    override fun mlKem1024Private(): ByteArray = native.mlkem1024Private()

    override fun mlDsa87Public(): ByteArray = native.mldsa87Public()

    override fun mlDsa87Private(): ByteArray = native.mldsa87Private()

    override fun close() = native.close()
}
