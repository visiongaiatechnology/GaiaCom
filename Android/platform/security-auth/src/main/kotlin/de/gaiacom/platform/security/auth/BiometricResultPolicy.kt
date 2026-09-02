// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.auth

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt

internal object BiometricResultPolicy {
    fun availability(code: Int): VaultAuthorization? = when (code) {
        BiometricManager.BIOMETRIC_SUCCESS -> null
        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> VaultAuthorization.EnrollmentRequired
        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> VaultAuthorization.HardwareUnavailable
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> VaultAuthorization.HardwareUnavailable
        BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> VaultAuthorization.SecurityUpdateRequired
        else -> VaultAuthorization.Rejected
    }

    fun authenticationError(code: Int): VaultAuthorization = when (code) {
        BiometricPrompt.ERROR_USER_CANCELED,
        BiometricPrompt.ERROR_NEGATIVE_BUTTON,
        BiometricPrompt.ERROR_CANCELED,
        -> VaultAuthorization.Cancelled

        BiometricPrompt.ERROR_LOCKOUT,
        BiometricPrompt.ERROR_LOCKOUT_PERMANENT,
        -> VaultAuthorization.TemporarilyLocked

        BiometricPrompt.ERROR_HW_NOT_PRESENT,
        BiometricPrompt.ERROR_HW_UNAVAILABLE,
        -> VaultAuthorization.HardwareUnavailable

        BiometricPrompt.ERROR_NO_BIOMETRICS,
        BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL,
        -> VaultAuthorization.EnrollmentRequired

        BiometricPrompt.ERROR_SECURITY_UPDATE_REQUIRED -> VaultAuthorization.SecurityUpdateRequired
        else -> VaultAuthorization.Rejected
    }
}
