// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security

import java.nio.ByteBuffer
import java.nio.ByteOrder

internal data class VaultEnvelope(
    val nonce: ByteArray,
    val ciphertext: ByteArray,
)

internal object VaultEnvelopeCodec {
    private val magic = byteArrayOf(0x47, 0x41, 0x49, 0x41, 0x56, 0x4c, 0x54, 0x31)
    private const val VERSION = 1
    private const val HEADER_BYTES = 20
    private const val NONCE_BYTES = 12
    const val MAX_PLAINTEXT_BYTES = 16 * 1024 * 1024
    private const val AUTH_TAG_BYTES = 16
    private const val MAX_CIPHERTEXT_BYTES = MAX_PLAINTEXT_BYTES + AUTH_TAG_BYTES

    fun encode(envelope: VaultEnvelope): ByteArray {
        require(envelope.nonce.size == NONCE_BYTES) { "invalid vault nonce size" }
        require(envelope.ciphertext.size in AUTH_TAG_BYTES..MAX_CIPHERTEXT_BYTES) {
            "invalid vault ciphertext size"
        }
        return ByteBuffer.allocate(HEADER_BYTES + envelope.nonce.size + envelope.ciphertext.size)
            .order(ByteOrder.BIG_ENDIAN)
            .put(magic)
            .putInt(VERSION)
            .putInt(envelope.nonce.size)
            .putInt(envelope.ciphertext.size)
            .put(envelope.nonce)
            .put(envelope.ciphertext)
            .array()
    }

    fun decode(encoded: ByteArray): VaultEnvelope {
        if (encoded.size < HEADER_BYTES + NONCE_BYTES + AUTH_TAG_BYTES) {
            throw VaultSecurityException("vault envelope is truncated")
        }
        val buffer = ByteBuffer.wrap(encoded).order(ByteOrder.BIG_ENDIAN)
        val actualMagic = ByteArray(magic.size).also(buffer::get)
        val version = buffer.int
        val nonceSize = buffer.int
        val ciphertextSize = buffer.int
        val expectedSize = HEADER_BYTES.toLong() + nonceSize.toLong() + ciphertextSize.toLong()
        if (!actualMagic.contentEquals(magic) || version != VERSION) {
            throw VaultSecurityException("vault envelope format is not trusted")
        }
        if (nonceSize != NONCE_BYTES || ciphertextSize !in AUTH_TAG_BYTES..MAX_CIPHERTEXT_BYTES) {
            throw VaultSecurityException("vault envelope boundaries are invalid")
        }
        if (expectedSize != encoded.size.toLong()) {
            throw VaultSecurityException("vault envelope length is inconsistent")
        }
        val nonce = ByteArray(nonceSize).also(buffer::get)
        val ciphertext = ByteArray(ciphertextSize).also(buffer::get)
        return VaultEnvelope(nonce, ciphertext)
    }
}
