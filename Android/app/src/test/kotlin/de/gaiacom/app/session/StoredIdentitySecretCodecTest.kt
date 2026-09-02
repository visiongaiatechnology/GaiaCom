// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertFailsWith

class StoredIdentitySecretCodecTest {
    private val mnemonic =
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".encodeToByteArray()

    @Test
    fun roundTripReturnsDefensiveMnemonicCopy() {
        val encoded = StoredIdentitySecretCodec.encode(mnemonic)
        StoredIdentitySecretCodec.decode(encoded).use { secret ->
            val first = secret.mnemonicCopy()
            assertContentEquals(mnemonic, first)
            first.fill(0)
            assertContentEquals(mnemonic, secret.mnemonicCopy())
        }
    }

    @Test
    fun malformedOrNonNormalizedInputIsRejected() {
        assertFailsWith<IllegalArgumentException> {
            StoredIdentitySecretCodec.encode("abandon  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".encodeToByteArray())
        }
        val encoded = StoredIdentitySecretCodec.encode(mnemonic)
        encoded[0] = 0
        assertFailsWith<IllegalArgumentException> { StoredIdentitySecretCodec.decode(encoded) }
    }
}
