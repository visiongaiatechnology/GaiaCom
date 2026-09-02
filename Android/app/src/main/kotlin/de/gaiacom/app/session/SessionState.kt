// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import de.gaiacom.platform.remote.RemoteAuthFailure
import de.gaiacom.platform.security.HardwareAssurance

sealed interface SessionState {
    data object Locked : SessionState
    data object Authorizing : SessionState
    data object OpeningVault : SessionState
    data object DerivingIdentity : SessionState

    data class Login(
        val suggestedUsername: String = "",
        val error: LoginFailure? = null,
    ) : SessionState

    data object SigningIn : SessionState

    data class Ready(
        val assurance: HardwareAssurance,
        val username: String,
        val serverOrigin: String,
    ) : SessionState

    data class Failed(
        val reason: SessionFailure,
        val diagnostic: VaultDiagnostic? = null,
    ) : SessionState
}

enum class LoginFailure {
    INVALID_MNEMONIC,
    MNEMONIC_MISMATCH,
    IDENTITY_VERIFICATION_UNAVAILABLE,
    INVALID_CREDENTIALS,
    RATE_LIMITED,
    NETWORK_UNAVAILABLE,
    TLS_REJECTED,
    SERVER_UNAVAILABLE,
    SESSION_EXPIRED,
    PROTOCOL_REJECTED,
}

fun RemoteAuthFailure.toLoginFailure(): LoginFailure = when (this) {
    RemoteAuthFailure.INVALID_CREDENTIALS -> LoginFailure.INVALID_CREDENTIALS
    RemoteAuthFailure.RATE_LIMITED -> LoginFailure.RATE_LIMITED
    RemoteAuthFailure.NETWORK_UNAVAILABLE -> LoginFailure.NETWORK_UNAVAILABLE
    RemoteAuthFailure.TLS_REJECTED -> LoginFailure.TLS_REJECTED
    RemoteAuthFailure.SERVER_UNAVAILABLE -> LoginFailure.SERVER_UNAVAILABLE
    RemoteAuthFailure.SESSION_EXPIRED -> LoginFailure.SESSION_EXPIRED
    RemoteAuthFailure.PROTOCOL_REJECTED -> LoginFailure.PROTOCOL_REJECTED
}

enum class SessionFailure {
    CANCELLED,
    TEMPORARILY_LOCKED,
    HARDWARE_UNAVAILABLE,
    ENROLLMENT_REQUIRED,
    SECURITY_UPDATE_REQUIRED,
    LOCAL_VAULT_RECOVERED,
    KEY_INVALIDATED,
    AUTHENTICATION_REQUIRED,
    IDENTITY_FAILURE,
    VAULT_FAILURE,
}
