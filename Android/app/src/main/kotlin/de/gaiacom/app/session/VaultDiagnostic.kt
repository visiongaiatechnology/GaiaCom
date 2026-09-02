// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import android.os.Build
import de.gaiacom.platform.security.HardwareAssurance
import java.util.Collections
import java.util.IdentityHashMap

enum class VaultDiagnosticStage(val code: String) {
    SESSION_PROBE("GV-PROBE"),
    KEY_PREPARATION("GV-KEY-PREP"),
    VAULT_ENROLLMENT("GV-ENROLL"),
    VAULT_RESTORE("GV-RESTORE"),
    LOCAL_RESET("GV-RESET"),
}

data class VaultDiagnostic(
    val report: String,
) {
    companion object {
        fun capture(
            stage: VaultDiagnosticStage,
            failure: Throwable,
            assurance: HardwareAssurance?,
        ): VaultDiagnostic {
            val lines = mutableListOf(
                "Code: ${stage.code}",
                "Keystore: ${assurance?.name ?: "UNBEKANNT"}",
                "Android: ${Build.VERSION.RELEASE ?: "UNBEKANNT"} / API ${Build.VERSION.SDK_INT}",
                "Gerät: ${safeDeviceValue(Build.MANUFACTURER)} ${safeDeviceValue(Build.MODEL)}",
            )
            val visited = Collections.newSetFromMap(IdentityHashMap<Throwable, Boolean>())
            var current: Throwable? = failure
            var depth = 0
            while (current != null && depth < MAX_CAUSE_DEPTH && visited.add(current)) {
                val type = current.javaClass.simpleName.ifBlank { current.javaClass.name.substringAfterLast('.') }
                val message = safeMessage(current.message)
                lines += if (message.isEmpty()) "Fehler $depth: $type" else "Fehler $depth: $type — $message"
                current = current.cause
                depth += 1
            }
            return VaultDiagnostic(lines.joinToString("\n"))
        }

        private fun safeMessage(message: String?): String {
            if (message.isNullOrBlank()) return ""
            val singleLine = message.map { character ->
                if (character.isISOControl()) ' ' else character
            }.joinToString("").trim()
            val redacted = SECRET_VALUE.replace(singleLine) { match -> "${match.groupValues[1]}=<redacted>" }
            return redacted.take(MAX_MESSAGE_CHARS)
        }

        private fun safeDeviceValue(value: String?): String = (value ?: "UNBEKANNT").map { character ->
            if (character.isLetterOrDigit() || character in DEVICE_PUNCTUATION) character else '_'
        }.joinToString("").take(MAX_DEVICE_CHARS)

        private const val MAX_CAUSE_DEPTH = 6
        private const val MAX_MESSAGE_CHARS = 240
        private const val MAX_DEVICE_CHARS = 80
        private val DEVICE_PUNCTUATION = setOf(' ', '-', '_', '.', '(', ')')
        private val SECRET_VALUE = Regex(
            "(?i)\\b(password|mnemonic|access[ _-]?token|refresh[ _-]?token)\\s*[:=]\\s*[^,;\\s]+",
        )
    }
}
