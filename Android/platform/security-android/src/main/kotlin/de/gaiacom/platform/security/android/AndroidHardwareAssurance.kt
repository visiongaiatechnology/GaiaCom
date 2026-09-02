// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.android

import android.security.keystore.KeyProperties
import de.gaiacom.platform.security.HardwareAssurance

internal object AndroidHardwareAssurance {
    fun fromSecurityLevel(level: Int): HardwareAssurance = when (level) {
        KeyProperties.SECURITY_LEVEL_STRONGBOX -> HardwareAssurance.STRONGBOX
        KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT,
        KeyProperties.SECURITY_LEVEL_UNKNOWN_SECURE,
        -> HardwareAssurance.TRUSTED_EXECUTION_ENVIRONMENT

        else -> HardwareAssurance.SOFTWARE
    }
}
