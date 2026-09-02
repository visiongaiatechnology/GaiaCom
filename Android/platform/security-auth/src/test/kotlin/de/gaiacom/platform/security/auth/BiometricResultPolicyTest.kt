// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.auth

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class BiometricResultPolicyTest {
    @Test
    fun mapsAvailabilityWithoutLeakingPlatformDiagnostics() {
        assertNull(BiometricResultPolicy.availability(BiometricManager.BIOMETRIC_SUCCESS))
        assertEquals(
            VaultAuthorization.EnrollmentRequired,
            BiometricResultPolicy.availability(BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED),
        )
        assertEquals(VaultAuthorization.Rejected, BiometricResultPolicy.availability(Int.MAX_VALUE))
    }

    @Test
    fun distinguishesCancellationFromLockout() {
        assertEquals(
            VaultAuthorization.Cancelled,
            BiometricResultPolicy.authenticationError(BiometricPrompt.ERROR_USER_CANCELED),
        )
        assertEquals(
            VaultAuthorization.TemporarilyLocked,
            BiometricResultPolicy.authenticationError(BiometricPrompt.ERROR_LOCKOUT),
        )
    }
}
