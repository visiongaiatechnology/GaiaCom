// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.android

import android.security.keystore.KeyProperties
import de.gaiacom.platform.security.HardwareAssurance
import kotlin.test.Test
import kotlin.test.assertEquals

class AndroidHardwareAssuranceTest {
    @Test
    fun unknownSecureIsAcceptedAsTeeEquivalent() {
        assertEquals(
            HardwareAssurance.TRUSTED_EXECUTION_ENVIRONMENT,
            AndroidHardwareAssurance.fromSecurityLevel(KeyProperties.SECURITY_LEVEL_UNKNOWN_SECURE),
        )
    }

    @Test
    fun unknownAndSoftwareRemainUntrusted() {
        assertEquals(
            HardwareAssurance.SOFTWARE,
            AndroidHardwareAssurance.fromSecurityLevel(KeyProperties.SECURITY_LEVEL_UNKNOWN),
        )
        assertEquals(
            HardwareAssurance.SOFTWARE,
            AndroidHardwareAssurance.fromSecurityLevel(KeyProperties.SECURITY_LEVEL_SOFTWARE),
        )
    }
}
