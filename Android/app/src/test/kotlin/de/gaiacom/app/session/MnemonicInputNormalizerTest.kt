// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertNull

class MnemonicInputNormalizerTest {
    @Test
    fun canonicalizesWhitespaceAndAsciiCase() {
        val result = MnemonicInputNormalizer.normalize(
            "  ABANDON\tabandon abandon abandon abandon abandon abandon abandon abandon abandon abandon ABOUT  ",
        )
        assertContentEquals(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".encodeToByteArray(),
            result,
        )
    }

    @Test
    fun rejectsWrongWordCountAndNonEnglishCharacters() {
        assertNull(MnemonicInputNormalizer.normalize("abandon abandon"))
        assertNull(
            MnemonicInputNormalizer.normalize(
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon über",
            ),
        )
    }
}
