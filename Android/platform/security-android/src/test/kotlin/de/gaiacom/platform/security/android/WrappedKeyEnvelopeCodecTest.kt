// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.android

import de.gaiacom.platform.security.VaultSecurityException
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class WrappedKeyEnvelopeCodecTest {
    @Test
    fun roundTripsOnlyTheFixedAuthenticatedEnvelopeShape() {
        val nonce = ByteArray(WrappedKeyEnvelopeCodec.NONCE_BYTES) { it.toByte() }
        val ciphertext = ByteArray(WrappedKeyEnvelopeCodec.CIPHERTEXT_BYTES) { (it * 3).toByte() }
        val encoded = WrappedKeyEnvelopeCodec.encode(WrappedKeyEnvelope(nonce, ciphertext))
        assertEquals(WrappedKeyEnvelopeCodec.ENCODED_BYTES, encoded.size)

        val decoded = WrappedKeyEnvelopeCodec.decode(encoded)
        assertContentEquals(nonce, decoded.nonce)
        assertContentEquals(ciphertext, decoded.ciphertext)
    }

    @Test
    fun rejectsTruncationAndHeaderMutation() {
        val encoded = WrappedKeyEnvelopeCodec.encode(
            WrappedKeyEnvelope(
                ByteArray(WrappedKeyEnvelopeCodec.NONCE_BYTES),
                ByteArray(WrappedKeyEnvelopeCodec.CIPHERTEXT_BYTES),
            ),
        )
        assertFailsWith<VaultSecurityException> {
            WrappedKeyEnvelopeCodec.decode(encoded.copyOf(encoded.size - 1))
        }
        encoded[0] = encoded[0].inc()
        assertFailsWith<VaultSecurityException> {
            WrappedKeyEnvelopeCodec.decode(encoded)
        }
    }
}
