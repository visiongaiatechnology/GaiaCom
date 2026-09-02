// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.auth

sealed interface VaultAuthorization {
    data object Authorized : VaultAuthorization
    data object Cancelled : VaultAuthorization
    data object TemporarilyLocked : VaultAuthorization
    data object HardwareUnavailable : VaultAuthorization
    data object EnrollmentRequired : VaultAuthorization
    data object SecurityUpdateRequired : VaultAuthorization
    data object Rejected : VaultAuthorization
}

fun interface VaultAuthorizationCallback {
    fun complete(result: VaultAuthorization)
}

class VaultAuthorizationException(message: String) : IllegalStateException(message)
