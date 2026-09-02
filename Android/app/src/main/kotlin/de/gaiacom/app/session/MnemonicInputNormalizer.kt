// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import java.text.Normalizer
import java.util.Locale

internal object MnemonicInputNormalizer {
    private val validWordCounts = setOf(12, 15, 18, 21, 24)

    fun normalize(value: String): ByteArray? {
        if (value.length !in 1..MAX_INPUT_CHARS || value.any { it == '\u0000' }) return null
        val canonical = Normalizer.normalize(value, Normalizer.Form.NFKD)
            .trim()
            .lowercase(Locale.ROOT)
            .split(Regex("\\s+"))
        if (canonical.size !in validWordCounts || canonical.any { word ->
                word.isEmpty() || word.any { character -> character !in 'a'..'z' }
            }
        ) {
            return null
        }
        val normalized = canonical.joinToString(" ")
        val encoded = normalized.encodeToByteArray()
        if (encoded.size > MAX_ENCODED_BYTES) {
            encoded.fill(0)
            return null
        }
        return encoded
    }

    private const val MAX_INPUT_CHARS = 1_024
    private const val MAX_ENCODED_BYTES = 256
}
