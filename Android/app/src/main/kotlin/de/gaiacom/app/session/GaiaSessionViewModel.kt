// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import de.gaiacom.app.workspace.WorkspaceRepository
import de.gaiacom.app.workspace.WorkspaceSection
import de.gaiacom.app.workspace.WorkspaceState
import de.gaiacom.platform.identity.LocalIdentityException
import de.gaiacom.platform.identity.LocalIdentityKeyMaterial
import de.gaiacom.platform.identity.LocalIdentityService
import de.gaiacom.platform.identity.LocalIdentityServiceFactory
import de.gaiacom.platform.remote.GaiaRemoteAuthClient
import de.gaiacom.platform.remote.RemoteAccountSession
import de.gaiacom.platform.remote.RemoteAuthException
import de.gaiacom.platform.remote.RemoteAuthFailure
import de.gaiacom.platform.remote.RemoteServerConfig
import de.gaiacom.platform.security.HardwareAssurance
import de.gaiacom.platform.security.SecureVault
import de.gaiacom.platform.security.android.AndroidSecureVaultFactory
import de.gaiacom.platform.security.auth.VaultAuthorization
import java.nio.charset.CharacterCodingException
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
class GaiaSessionViewModel(application: Application) : AndroidViewModel(application) {
    private val resourceLock = Any()
    private val sessionEpoch = AtomicLong(0)
    private val remoteAuth = GaiaRemoteAuthClient()
    private val identityService: LocalIdentityService = LocalIdentityServiceFactory.create()
    private val identityBindingVerifier = AccountIdentityBindingVerifier()
    private val workspaceRepository = WorkspaceRepository()
    private val initialSessionProbe = runCatching { SessionVaultStore.hasPersistedAccount(application) }
    private val mutableState = MutableStateFlow<SessionState>(
        initialSessionProbe.fold(
            onSuccess = { exists -> if (exists) SessionState.Locked else SessionState.Login() },
            onFailure = { failure -> SessionState.Failed(
                SessionFailure.VAULT_FAILURE,
                VaultDiagnostic.capture(VaultDiagnosticStage.SESSION_PROBE, failure, null),
            ) },
        ),
    )
    private var failureReturnsToLogin = initialSessionProbe.isFailure
    private var pendingLogin: PendingLogin? = null
    private var vault: SecureVault? = null
    private var remoteSession: RemoteAccountSession? = null
    private var localIdentity: LocalIdentityKeyMaterial? = null
    private var preparedHardwareAssurance: HardwareAssurance? = null
    private val mutableWorkspace = MutableStateFlow<WorkspaceState>(WorkspaceState.Idle)

    val state: StateFlow<SessionState> = mutableState.asStateFlow()
    val workspace: StateFlow<WorkspaceState> = mutableWorkspace.asStateFlow()
    fun beginAuthorization(): Boolean = synchronized(resourceLock) {
        if (mutableState.value != SessionState.Locked) return false
        mutableState.value = SessionState.Authorizing
        true
    }

    fun prepareLogin(username: String, password: String, mnemonic: String): Boolean {
        val normalizedUsername = username.trim()
        if (normalizedUsername.length !in 1..64 || password.length !in 1..512) {
            publishLoginInputFailure(normalizedUsername, LoginFailure.INVALID_CREDENTIALS)
            return false
        }
        val normalizedMnemonic = MnemonicInputNormalizer.normalize(mnemonic)
        if (normalizedMnemonic == null || !validateMnemonic(normalizedMnemonic)) {
            normalizedMnemonic?.fill(0)
            publishLoginInputFailure(normalizedUsername, LoginFailure.INVALID_MNEMONIC)
            return false
        }
        val passwordUtf8 = password.encodeToByteArray()
        val candidate = PendingLogin(normalizedUsername, passwordUtf8, normalizedMnemonic)
        passwordUtf8.fill(0)
        normalizedMnemonic.fill(0)
        return synchronized(resourceLock) {
            if (mutableState.value !is SessionState.Login) {
                candidate.close()
                false
            } else {
                pendingLogin?.close()
                pendingLogin = candidate
                failureReturnsToLogin = true
                mutableState.value = SessionState.Authorizing
                true
            }
        }
    }

    fun prepareHardwareAuthorization(): Boolean {
        val epoch = sessionEpoch.get()
        val returnsToLogin = synchronized(resourceLock) {
            if (mutableState.value != SessionState.Authorizing) return false
            pendingLogin != null
        }
        return try {
            val assurance = AndroidSecureVaultFactory.prepareHardwareKey(getApplication())
            synchronized(resourceLock) {
                val current = sessionEpoch.get() == epoch && mutableState.value == SessionState.Authorizing
                if (current) preparedHardwareAssurance = assurance
                current
            }
        } catch (exception: Exception) {
            synchronized(resourceLock) {
                if (sessionEpoch.get() == epoch && mutableState.value == SessionState.Authorizing) {
                    pendingLogin?.close()
                    pendingLogin = null
                    failureReturnsToLogin = returnsToLogin
                    mutableState.value = SessionState.Failed(
                        VaultFailureRecovery.failureFor(exception),
                        VaultDiagnostic.capture(VaultDiagnosticStage.KEY_PREPARATION, exception, null),
                    )
                }
            }
            false
        }
    }

    fun completeAuthorization(result: VaultAuthorization) {
        var enrollment: PendingLogin? = null
        val shouldRestore = synchronized(resourceLock) {
            if (mutableState.value != SessionState.Authorizing) return
            val pending = pendingLogin
            if (pending?.isExpired() == true) {
                pending.close()
                pendingLogin = null
                failureReturnsToLogin = true
                mutableState.value = SessionState.Failed(SessionFailure.CANCELLED)
                return
            }
            if (result !is VaultAuthorization.Authorized) {
                failureReturnsToLogin = pending != null
                pending?.close()
                pendingLogin = null
                mutableState.value = SessionState.Failed(result.toFailure())
                return
            }
            enrollment = pending
            pendingLogin = null
            mutableState.value = SessionState.OpeningVault
            enrollment == null
        }
        val epoch = sessionEpoch.get()
        viewModelScope.launch(Dispatchers.IO) {
            if (shouldRestore) openVaultAndRestore(epoch) else requireNotNull(enrollment).use {
                openVaultAndSignIn(epoch, it)
            }
        }
    }

    fun recoverFromFailure() {
        synchronized(resourceLock) {
            if (mutableState.value !is SessionState.Failed) return
            mutableState.value = runCatching { failureReturnsToLogin || !hasPersistedSession() }.fold(
                onSuccess = { showLogin -> if (showLogin) SessionState.Login() else SessionState.Locked },
                onFailure = { SessionState.Failed(SessionFailure.VAULT_FAILURE) },
            )
        }
    }

    fun logout() {
        var deletionFailed = false
        val resources = synchronized(resourceLock) {
            sessionEpoch.incrementAndGet()
            pendingLogin?.close()
            pendingLogin = null
            vault?.let { activeVault ->
                deletionFailed = runCatching { SessionVaultStore.deleteAll(activeVault) }.isFailure
            }
            detachResources(SessionState.Login())
        }
        resources.close()
        if (deletionFailed && runCatching { AndroidSecureVaultFactory.resetLocalVault(getApplication()) }.isFailure) {
            synchronized(resourceLock) { mutableState.value = SessionState.Failed(SessionFailure.VAULT_FAILURE) }
        }
    }

    fun lock() {
        val resources = synchronized(resourceLock) {
            sessionEpoch.incrementAndGet()
            pendingLogin?.close()
            pendingLogin = null
            val target = runCatching { hasPersistedSession() }.fold(
                onSuccess = { exists -> if (exists) SessionState.Locked else SessionState.Login() },
                onFailure = { SessionState.Failed(SessionFailure.VAULT_FAILURE) },
            )
            detachResources(target)
        }
        resources.close()
    }

    override fun onCleared() {
        val resources = synchronized(resourceLock) {
            sessionEpoch.incrementAndGet()
            pendingLogin?.close()
            pendingLogin = null
            detachResources(null)
        }
        resources.close()
    }

    fun selectWorkspaceSection(section: WorkspaceSection) {
        synchronized(resourceLock) {
            val current = mutableWorkspace.value as? WorkspaceState.Content ?: return
            mutableWorkspace.value = current.copy(section = section)
        }
    }

    fun reloadWorkspace() {
        val activeSession = synchronized(resourceLock) {
            if (mutableState.value !is SessionState.Ready) return
            remoteSession ?: return
        }
        loadWorkspace(sessionEpoch.get(), activeSession)
    }

    private fun openVaultAndSignIn(epoch: Long, login: PendingLogin) {
        var candidateVault: SecureVault? = null
        var candidateSession: RemoteAccountSession? = null
        var candidateIdentity: LocalIdentityKeyMaterial? = null
        try {
            val openedVault = AndroidSecureVaultFactory.open(getApplication())
            candidateVault = openedVault
            if (!publishStage(epoch, SessionState.OpeningVault, SessionState.DerivingIdentity)) return
            val mnemonic = login.mnemonicCopy()
            try {
                candidateIdentity = identityService.deriveIdentity(mnemonic)
            } finally {
                mnemonic.fill(0)
            }
            if (!publishStage(epoch, SessionState.DerivingIdentity, SessionState.SigningIn)) return
            candidateSession = remoteAuth.login(login.username, login.passwordString())
            identityBindingVerifier.verify(requireNotNull(candidateSession), requireNotNull(candidateIdentity))
            if (commitAndAccept(epoch, openedVault, requireNotNull(candidateSession), requireNotNull(candidateIdentity))) {
                candidateVault = null
                candidateSession = null
                candidateIdentity = null
            } else {
                bestEffortLogout(candidateSession)
            }
        } catch (exception: RemoteAuthException) {
            publishLoginFailure(epoch, login.username, exception.failure.toLoginFailure())
        } catch (exception: LocalIdentityException) {
            publishLoginFailure(epoch, login.username, LoginFailure.INVALID_MNEMONIC)
        } catch (exception: IdentityBindingException) {
            bestEffortLogout(candidateSession)
            publishLoginFailure(epoch, login.username, exception.toLoginFailure())
        } catch (exception: CharacterCodingException) {
            publishLoginFailure(epoch, login.username, LoginFailure.INVALID_CREDENTIALS)
        } catch (exception: Exception) {
            publishVaultFailure(epoch, exception, VaultDiagnosticStage.VAULT_ENROLLMENT)
        } finally {
            candidateIdentity?.closeSafely()
            candidateSession?.close()
            candidateVault?.close()
        }
    }

    private fun openVaultAndRestore(epoch: Long) {
        var candidateVault: SecureVault? = null
        var candidateSession: RemoteAccountSession? = null
        var candidateIdentity: LocalIdentityKeyMaterial? = null
        var source: StoredAccountSource? = null
        try {
            val openedVault = AndroidSecureVaultFactory.open(getApplication())
            candidateVault = openedVault
            if (!publishStage(epoch, SessionState.OpeningVault, SessionState.DerivingIdentity)) return
            source = SessionVaultStore.read(openedVault)
            if (source === StoredAccountSource.Missing) {
                publishLoginFailure(epoch, "", LoginFailure.SESSION_EXPIRED)
                return
            }
            val username: String
            val refresh: ByteArray
            when (val stored = requireNotNull(source)) {
                is StoredAccountSource.Current -> {
                    username = stored.bundle.username
                    refresh = stored.bundle.refreshTokenCopy()
                    stored.bundle.privateKeyCopies().use { keys ->
                        candidateIdentity = identityService.importIdentity(
                            keys.ed25519,
                            keys.x25519,
                            keys.mlKem1024,
                            keys.mlDsa87,
                        )
                    }
                }
                is StoredAccountSource.Legacy -> {
                    username = stored.session.username
                    refresh = stored.session.refreshToken.copyOf()
                    val mnemonic = stored.identity.mnemonicCopy()
                    try {
                        candidateIdentity = identityService.deriveIdentity(mnemonic)
                    } finally {
                        mnemonic.fill(0)
                    }
                }
                StoredAccountSource.Missing -> return
            }
            if (!publishStage(epoch, SessionState.DerivingIdentity, SessionState.SigningIn)) {
                refresh.fill(0)
                return
            }
            candidateSession = try {
                remoteAuth.refresh(username, refresh)
            } finally {
                refresh.fill(0)
            }
            identityBindingVerifier.verify(requireNotNull(candidateSession), requireNotNull(candidateIdentity))
            if (commitAndAccept(epoch, openedVault, requireNotNull(candidateSession), requireNotNull(candidateIdentity))) {
                candidateVault = null
                candidateSession = null
                candidateIdentity = null
            } else {
                bestEffortLogout(candidateSession)
            }
        } catch (exception: RemoteAuthException) {
            if (exception.failure == RemoteAuthFailure.SESSION_EXPIRED) {
                if (!erasePersistedAccount(candidateVault)) {
                    publishVaultFailure(epoch, IllegalStateException("local account reset failed"), VaultDiagnosticStage.LOCAL_RESET)
                    return
                }
            }
            publishLoginFailure(epoch, "", exception.failure.toLoginFailure())
        } catch (exception: IdentityBindingException) {
            bestEffortLogout(candidateSession)
            if (erasePersistedAccount(candidateVault)) {
                publishLoginFailure(epoch, "", exception.toLoginFailure())
            } else {
                publishVaultFailure(epoch, IllegalStateException("local account reset failed"), VaultDiagnosticStage.LOCAL_RESET)
            }
        } catch (exception: LocalIdentityException) {
            bestEffortLogout(candidateSession)
            if (erasePersistedAccount(candidateVault)) {
                publishLoginFailure(epoch, "", LoginFailure.INVALID_MNEMONIC)
            } else {
                publishVaultFailure(epoch, IllegalStateException("local account reset failed"), VaultDiagnosticStage.LOCAL_RESET)
            }
        } catch (exception: Exception) {
            publishVaultFailure(epoch, exception, VaultDiagnosticStage.VAULT_RESTORE)
        } finally {
            source?.close()
            candidateIdentity?.closeSafely()
            candidateSession?.close()
            candidateVault?.close()
        }
    }

    private fun commitAndAccept(
        epoch: Long,
        openedVault: SecureVault,
        session: RemoteAccountSession,
        identity: LocalIdentityKeyMaterial,
    ): Boolean {
        val accepted = synchronized(resourceLock) {
            if (sessionEpoch.get() != epoch || mutableState.value != SessionState.SigningIn) return@synchronized false
            SessionVaultStore.commit(openedVault, session, identity)
            vault = openedVault
            remoteSession = session
            localIdentity = identity
            failureReturnsToLogin = false
            mutableWorkspace.value = WorkspaceState.Loading
            mutableState.value = SessionState.Ready(
                assurance = openedVault.assurance,
                username = session.username,
                serverOrigin = RemoteServerConfig.PRODUCTION_ORIGIN,
            )
            true
        }
        if (accepted) loadWorkspace(epoch, session)
        return accepted
    }

    private fun loadWorkspace(epoch: Long, session: RemoteAccountSession) {
        viewModelScope.launch(Dispatchers.IO) {
            val token = runCatching { session.accessTokenCopy() }.getOrNull() ?: return@launch
            val loaded = try {
                workspaceRepository.load(token)
            } finally {
                token.fill(0)
            }
            synchronized(resourceLock) {
                if (sessionEpoch.get() == epoch && remoteSession === session && mutableState.value is SessionState.Ready) {
                    mutableWorkspace.value = loaded
                }
            }
        }
    }

    private fun detachResources(nextState: SessionState?): Resources =
        Resources(remoteSession, vault, localIdentity).also {
            remoteSession = null
            vault = null
            localIdentity = null
            mutableWorkspace.value = WorkspaceState.Idle
            failureReturnsToLogin = true
            if (nextState != null) mutableState.value = nextState
        }

    private fun validateMnemonic(mnemonic: ByteArray): Boolean = try {
        identityService.validateMnemonic(mnemonic)
    } catch (_: LocalIdentityException) {
        false
    }

    private fun publishStage(epoch: Long, expected: SessionState, next: SessionState): Boolean =
        synchronized(resourceLock) {
            if (sessionEpoch.get() != epoch || mutableState.value != expected) false else {
                mutableState.value = next
                true
            }
        }

    private fun publishLoginInputFailure(username: String, failure: LoginFailure) = synchronized(resourceLock) {
        if (mutableState.value is SessionState.Login) mutableState.value = SessionState.Login(username, failure)
    }

    private fun publishLoginFailure(epoch: Long, username: String, failure: LoginFailure) =
        synchronized(resourceLock) {
            if (sessionEpoch.get() == epoch && mutableState.value in TRANSIENT_STATES) {
                failureReturnsToLogin = true
                mutableState.value = SessionState.Login(username, failure)
            }
        }

    private fun publishVaultFailure(
        epoch: Long,
        exception: Exception,
        stage: VaultDiagnosticStage,
    ) {
        val diagnostic = VaultDiagnostic.capture(stage, exception, preparedHardwareAssurance)
        val resolution = VaultFailureRecovery.resolve(
            stage = stage,
            exception = exception,
            recoverStrongBoxIntegrity = {
                runCatching {
                    AndroidSecureVaultFactory.recoverFromStrongBoxIntegrityFailure(getApplication())
                }.isSuccess
            },
            resetInvalidatedKey = {
                runCatching { AndroidSecureVaultFactory.resetLocalVault(getApplication()) }.isSuccess
            },
        )
        synchronized(resourceLock) {
            if (sessionEpoch.get() == epoch && mutableState.value in TRANSIENT_STATES) {
                failureReturnsToLogin = resolution.returnsToLogin
                mutableState.value = SessionState.Failed(resolution.failure, diagnostic)
            }
        }
    }

    private fun hasPersistedSession(): Boolean = SessionVaultStore.hasPersistedAccount(getApplication())

    private fun bestEffortLogout(session: RemoteAccountSession?) {
        session?.let { runCatching { remoteAuth.logout(it) } }
    }

    private fun erasePersistedAccount(activeVault: SecureVault?): Boolean {
        if (activeVault != null && runCatching { SessionVaultStore.deleteAll(activeVault) }.isSuccess) return true
        return runCatching { AndroidSecureVaultFactory.resetLocalVault(getApplication()) }.isSuccess
    }

    private fun LocalIdentityKeyMaterial.closeSafely() = runCatching { close() }.getOrNull()

    private fun IdentityBindingException.toLoginFailure(): LoginFailure =
        if (failure == IdentityBindingFailure.MISMATCH) LoginFailure.MNEMONIC_MISMATCH
        else LoginFailure.IDENTITY_VERIFICATION_UNAVAILABLE

    private fun VaultAuthorization.toFailure(): SessionFailure = when (this) {
        VaultAuthorization.Cancelled -> SessionFailure.CANCELLED
        VaultAuthorization.TemporarilyLocked -> SessionFailure.TEMPORARILY_LOCKED
        VaultAuthorization.HardwareUnavailable -> SessionFailure.HARDWARE_UNAVAILABLE
        VaultAuthorization.EnrollmentRequired -> SessionFailure.ENROLLMENT_REQUIRED
        VaultAuthorization.SecurityUpdateRequired -> SessionFailure.SECURITY_UPDATE_REQUIRED
        VaultAuthorization.Authorized, VaultAuthorization.Rejected -> SessionFailure.VAULT_FAILURE
    }

    private companion object {
        val TRANSIENT_STATES = setOf(SessionState.OpeningVault, SessionState.DerivingIdentity, SessionState.SigningIn)
    }
}
