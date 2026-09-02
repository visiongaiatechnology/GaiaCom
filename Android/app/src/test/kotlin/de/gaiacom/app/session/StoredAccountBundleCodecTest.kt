// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class StoredAccountBundleCodecTest {
    @Test
    fun decodeAcceptsStrictPrivateKeyBundleWithoutMnemonicMaterial() {
        val fields = validFields()
        val encoded = encodeFields(fields)
        try {
            StoredAccountBundleCodec.decode(encoded).use { bundle ->
                assertEquals("12345678-1234-4234-9234-123456789abc", bundle.userId)
                assertEquals("gaia-user", bundle.username)
                assertContentEquals(fields[2], bundle.refreshTokenCopy())
                bundle.privateKeyCopies().use { keys ->
                    assertContentEquals(fields[3], keys.ed25519)
                    assertContentEquals(fields[4], keys.x25519)
                    assertContentEquals(fields[5], keys.mlKem1024)
                    assertContentEquals(fields[6], keys.mlDsa87)
                }
            }
            assertEquals(false, encoded.toString(Charsets.ISO_8859_1).contains("abandon abandon"))
        } finally {
            encoded.fill(0)
            fields.forEach { field -> field.fill(0) }
        }
    }

    @Test
    fun decodeRejectsWrongPrivateKeyLength() {
        val fields = validFields().toMutableList()
        fields[5] = ByteArray(3_167)
        val encoded = encodeFields(fields)
        try {
            assertFailsWith<IllegalArgumentException> { StoredAccountBundleCodec.decode(encoded) }
        } finally {
            encoded.fill(0)
            fields.forEach { field -> field.fill(0) }
        }
    }

    private fun validFields(): List<ByteArray> = listOf(
        "12345678-1234-4234-9234-123456789abc".encodeToByteArray(),
        "gaia-user".encodeToByteArray(),
        "refresh_token_1234567890".encodeToByteArray(),
        ByteArray(32) { 0x11 },
        ByteArray(32) { 0x22 },
        ByteArray(3_168) { 0x33 },
        ByteArray(4_896) { 0x44 },
    )

    private fun encodeFields(fields: List<ByteArray>): ByteArray {
        val size = 6 + Int.SIZE_BYTES * fields.size + fields.sumOf { field -> field.size }
        val buffer = ByteBuffer.allocate(size).order(ByteOrder.BIG_ENDIAN)
            .putInt(0x47414231)
            .put(1)
            .put(7)
        fields.forEach { field -> buffer.putInt(field.size) }
        fields.forEach { field -> buffer.put(field) }
        return buffer.array()
    }
}
