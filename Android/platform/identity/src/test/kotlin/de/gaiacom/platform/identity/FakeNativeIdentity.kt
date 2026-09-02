// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.identity

internal class RecordingIdentityBinding(
    private val bundle: NativeIdentityKeyBundle,
    var validationResult: Boolean = true,
) : NativeIdentityBinding {
    var validationInput: ByteArray? = null
    var derivationInput: ByteArray? = null
    var validationFailure: Exception? = null
    var derivationFailure: Exception? = null
    var importInputs: List<ByteArray>? = null
    var importFailure: Exception? = null

    override fun validateMnemonic(mnemonicUtf8: ByteArray): Boolean {
        validationInput = mnemonicUtf8
        validationFailure?.let { throw it }
        return validationResult
    }

    override fun deriveIdentity(mnemonicUtf8: ByteArray): NativeIdentityKeyBundle {
        derivationInput = mnemonicUtf8
        derivationFailure?.let { throw it }
        return bundle
    }

    override fun importIdentity(
        ed25519PrivateSeed: ByteArray,
        x25519Private: ByteArray,
        mlKem1024Private: ByteArray,
        mlDsa87Private: ByteArray,
    ): NativeIdentityKeyBundle {
        importInputs = listOf(ed25519PrivateSeed, x25519Private, mlKem1024Private, mlDsa87Private)
        importFailure?.let { throw it }
        return bundle
    }
}

internal class RecordingNativeKeyBundle(
    invalidEd25519Public: Boolean = false,
    private val releaseFailure: Exception? = null,
) : NativeIdentityKeyBundle {
    val sources: List<ByteArray> = listOf(
        material(if (invalidEd25519Public) 31 else 32, 0x11),
        material(32, 0x22),
        material(32, 0x33),
        material(32, 0x44),
        material(1_568, 0x55),
        material(3_168, 0x66),
        material(2_592, 0x77),
        material(4_896, 0x21),
    )
    val transferredCopies = mutableListOf<ByteArray>()
    var closeCount: Int = 0

    override fun ed25519Public(): ByteArray = transfer(0)

    override fun ed25519PrivateSeed(): ByteArray = transfer(1)

    override fun x25519Public(): ByteArray = transfer(2)

    override fun x25519Private(): ByteArray = transfer(3)

    override fun mlKem1024Public(): ByteArray = transfer(4)

    override fun mlKem1024Private(): ByteArray = transfer(5)

    override fun mlDsa87Public(): ByteArray = transfer(6)

    override fun mlDsa87Private(): ByteArray = transfer(7)

    override fun close() {
        closeCount += 1
        sources.forEach { source -> source.fill(0) }
        releaseFailure?.let { throw it }
    }

    private fun transfer(index: Int): ByteArray = sources[index].copyOf().also(transferredCopies::add)

    private companion object {
        fun material(size: Int, marker: Int): ByteArray = ByteArray(size) { marker.toByte() }
    }
}

internal fun ByteArray.isWiped(): Boolean = all { value -> value == 0.toByte() }
