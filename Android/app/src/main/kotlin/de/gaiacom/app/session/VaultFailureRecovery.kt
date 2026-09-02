// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import de.gaiacom.platform.identity.LocalIdentityException
import de.gaiacom.platform.security.VaultAuthenticationRequiredException
import de.gaiacom.platform.security.VaultHardwareUnavailableException
import de.gaiacom.platform.security.VaultKeyInvalidatedException
import javax.crypto.AEADBadTagException

internal data class VaultFailureResolution(
    val failure: SessionFailure,
    val returnsToLogin: Boolean,
)

internal object VaultFailureRecovery {
    fun failureFor(exception: Exception): SessionFailure = exception.toSessionFailure()

    fun resolve(
        stage: VaultDiagnosticStage,
        exception: Exception,
        recoverStrongBoxIntegrity: () -> Boolean,
        resetInvalidatedKey: () -> Boolean,
    ): VaultFailureResolution {
        if (stage == VaultDiagnosticStage.VAULT_ENROLLMENT && exception.hasCause<AEADBadTagException>()) {
            val recovered = recoverStrongBoxIntegrity()
            return VaultFailureResolution(
                failure = if (recovered) SessionFailure.LOCAL_VAULT_RECOVERED else SessionFailure.VAULT_FAILURE,
                returnsToLogin = recovered,
            )
        }
        if (exception.hasCause<VaultKeyInvalidatedException>()) {
            val recovered = resetInvalidatedKey()
            return VaultFailureResolution(
                failure = if (recovered) SessionFailure.KEY_INVALIDATED else SessionFailure.VAULT_FAILURE,
                returnsToLogin = recovered,
            )
        }
        return VaultFailureResolution(exception.toSessionFailure(), returnsToLogin = false)
    }

    private inline fun <reified T : Throwable> Throwable.hasCause(): Boolean {
        var current: Throwable? = this
        while (current != null) {
            if (current is T) return true
            current = current.cause
        }
        return false
    }

    private fun Exception.toSessionFailure(): SessionFailure = when {
        hasCause<VaultAuthenticationRequiredException>() -> SessionFailure.AUTHENTICATION_REQUIRED
        hasCause<VaultHardwareUnavailableException>() -> SessionFailure.HARDWARE_UNAVAILABLE
        hasCause<LocalIdentityException>() -> SessionFailure.IDENTITY_FAILURE
        else -> SessionFailure.VAULT_FAILURE
    }
}
