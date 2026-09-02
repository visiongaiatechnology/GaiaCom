// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.android

import de.gaiacom.platform.security.VaultSecurityException
import java.nio.ByteBuffer
import java.nio.ByteOrder

internal data class WrappedKeyEnvelope(
    val nonce: ByteArray,
    val ciphertext: ByteArray,
)

internal object WrappedKeyEnvelopeCodec {
    private val magic = byteArrayOf(0x47, 0x43, 0x41, 0x4e, 0x44, 0x4b, 0x57, 0x31)
    private const val VERSION = 1
    private const val HEADER_BYTES = 20
    const val NONCE_BYTES = 12
    const val CIPHERTEXT_BYTES = 48
    const val ENCODED_BYTES = HEADER_BYTES + NONCE_BYTES + CIPHERTEXT_BYTES

    fun encode(envelope: WrappedKeyEnvelope): ByteArray {
        require(envelope.nonce.size == NONCE_BYTES) { "wrapped-key nonce is invalid" }
        require(envelope.ciphertext.size == CIPHERTEXT_BYTES) { "wrapped-key ciphertext is invalid" }
        return ByteBuffer.allocate(ENCODED_BYTES)
            .order(ByteOrder.BIG_ENDIAN)
            .put(magic)
            .putInt(VERSION)
            .putInt(NONCE_BYTES)
            .putInt(CIPHERTEXT_BYTES)
            .put(envelope.nonce)
            .put(envelope.ciphertext)
            .array()
    }

    fun decode(encoded: ByteArray): WrappedKeyEnvelope {
        if (encoded.size != ENCODED_BYTES) {
            throw VaultSecurityException("wrapped-key envelope size is invalid")
        }
        val buffer = ByteBuffer.wrap(encoded).order(ByteOrder.BIG_ENDIAN)
        val actualMagic = ByteArray(magic.size).also(buffer::get)
        val version = buffer.int
        val nonceSize = buffer.int
        val ciphertextSize = buffer.int
        if (!actualMagic.contentEquals(magic) || version != VERSION ||
            nonceSize != NONCE_BYTES || ciphertextSize != CIPHERTEXT_BYTES
        ) {
            actualMagic.fill(0)
            throw VaultSecurityException("wrapped-key envelope format is invalid")
        }
        actualMagic.fill(0)
        return WrappedKeyEnvelope(
            nonce = ByteArray(NONCE_BYTES).also(buffer::get),
            ciphertext = ByteArray(CIPHERTEXT_BYTES).also(buffer::get),
        )
    }
}
