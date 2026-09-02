// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import java.nio.ByteBuffer
import java.nio.ByteOrder

internal class StoredIdentitySecret(
    mnemonic: ByteArray,
) : AutoCloseable {
    private val material = mnemonic.copyOf()

    fun mnemonicCopy(): ByteArray = material.copyOf()

    override fun close() = material.fill(0)
}

internal object StoredIdentitySecretCodec {
    private const val MAGIC = 0x47414931 // GAI1
    private const val VERSION: Byte = 1
    private const val HEADER_BYTES = 7
    private const val MIN_MNEMONIC_BYTES = 32
    private const val MAX_MNEMONIC_BYTES = 256

    fun encode(mnemonic: ByteArray): ByteArray {
        validateMnemonicEncoding(mnemonic)
        return ByteBuffer.allocate(HEADER_BYTES + mnemonic.size)
            .order(ByteOrder.BIG_ENDIAN)
            .putInt(MAGIC)
            .put(VERSION)
            .putShort(mnemonic.size.toShort())
            .put(mnemonic)
            .array()
    }

    fun decode(encoded: ByteArray): StoredIdentitySecret {
        require(encoded.size in (HEADER_BYTES + MIN_MNEMONIC_BYTES)..(HEADER_BYTES + MAX_MNEMONIC_BYTES)) {
            "identity secret envelope has invalid size"
        }
        val buffer = ByteBuffer.wrap(encoded).order(ByteOrder.BIG_ENDIAN)
        require(buffer.int == MAGIC && buffer.get() == VERSION) { "identity secret envelope header is invalid" }
        val mnemonicSize = buffer.short.toInt() and 0xffff
        require(mnemonicSize == buffer.remaining()) { "identity secret envelope is truncated" }
        val mnemonic = ByteArray(mnemonicSize).also(buffer::get)
        return try {
            validateMnemonicEncoding(mnemonic)
            StoredIdentitySecret(mnemonic)
        } finally {
            mnemonic.fill(0)
        }
    }

    private fun validateMnemonicEncoding(mnemonic: ByteArray) {
        require(mnemonic.size in MIN_MNEMONIC_BYTES..MAX_MNEMONIC_BYTES) {
            "mnemonic encoding exceeds size boundary"
        }
        require(mnemonic.first() != SPACE && mnemonic.last() != SPACE) { "mnemonic encoding is not normalized" }
        var previousSpace = false
        mnemonic.forEach { value ->
            val unsigned = value.toInt() and 0xff
            val isSpace = unsigned == SPACE.toInt()
            require(isSpace || unsigned in LOWER_A..LOWER_Z) { "mnemonic encoding contains invalid bytes" }
            require(!(isSpace && previousSpace)) { "mnemonic encoding is not normalized" }
            previousSpace = isSpace
        }
    }

    private const val SPACE: Byte = 0x20
    private const val LOWER_A = 0x61
    private const val LOWER_Z = 0x7a
}
