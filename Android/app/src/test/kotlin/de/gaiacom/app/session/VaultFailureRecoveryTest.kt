// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import de.gaiacom.platform.security.VaultKeyInvalidatedException
import de.gaiacom.platform.security.VaultSecurityException
import javax.crypto.AEADBadTagException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class VaultFailureRecoveryTest {
    @Test
    fun enrollmentIntegrityFailureResetsVaultAndReturnsToLogin() {
        var integrityRecoveryCalled = false
        val failure = VaultSecurityException(
            "wrapped vault key authentication failed",
            AEADBadTagException("tag rejected"),
        )

        val result = VaultFailureRecovery.resolve(
            VaultDiagnosticStage.VAULT_ENROLLMENT,
            failure,
            recoverStrongBoxIntegrity = { integrityRecoveryCalled = true; true },
            resetInvalidatedKey = { false },
        )

        assertTrue(integrityRecoveryCalled)
        assertEquals(SessionFailure.LOCAL_VAULT_RECOVERED, result.failure)
        assertTrue(result.returnsToLogin)
    }

    @Test
    fun restoreIntegrityFailureNeverDestroysPersistedVault() {
        var integrityRecoveryCalled = false
        val failure = VaultSecurityException(
            "wrapped vault key authentication failed",
            AEADBadTagException("tag rejected"),
        )

        val result = VaultFailureRecovery.resolve(
            VaultDiagnosticStage.VAULT_RESTORE,
            failure,
            recoverStrongBoxIntegrity = { integrityRecoveryCalled = true; true },
            resetInvalidatedKey = { false },
        )

        assertFalse(integrityRecoveryCalled)
        assertEquals(SessionFailure.VAULT_FAILURE, result.failure)
        assertFalse(result.returnsToLogin)
    }

    @Test
    fun invalidatedKeyUsesDedicatedResetPath() {
        val result = VaultFailureRecovery.resolve(
            VaultDiagnosticStage.VAULT_RESTORE,
            VaultSecurityException("open failed", VaultKeyInvalidatedException("key unavailable")),
            recoverStrongBoxIntegrity = { false },
            resetInvalidatedKey = { true },
        )

        assertEquals(SessionFailure.KEY_INVALIDATED, result.failure)
        assertTrue(result.returnsToLogin)
    }
}
