// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.auth

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import java.util.concurrent.Executor
import java.util.concurrent.atomic.AtomicBoolean

class BiometricVaultAuthorizer : AutoCloseable {
    private val inFlight = AtomicBoolean(false)
    private val closed = AtomicBoolean(false)
    private val stateLock = Any()
    private var activePrompt: BiometricPrompt? = null

    fun authorize(activity: FragmentActivity, callback: VaultAuthorizationCallback) {
        check(!closed.get()) { "vault authorizer is closed" }
        if (!inFlight.compareAndSet(false, true)) {
            throw VaultAuthorizationException("vault authorization is already active")
        }
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
        val unavailable = BiometricResultPolicy.availability(
            BiometricManager.from(activity).canAuthenticate(authenticators),
        )
        if (unavailable != null) {
            inFlight.set(false)
            callback.complete(unavailable)
            return
        }

        val executor = Executor { command -> activity.runOnUiThread(command) }
        val prompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    finish(callback, VaultAuthorization.Authorized)
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    finish(callback, BiometricResultPolicy.authenticationError(errorCode))
                }

                override fun onAuthenticationFailed() = Unit
            },
        )
        val cancelled = synchronized(stateLock) {
            if (closed.get()) {
                true
            } else {
                activePrompt = prompt
                false
            }
        }
        if (cancelled) {
            inFlight.set(false)
            callback.complete(VaultAuthorization.Cancelled)
            return
        }
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(activity.getString(R.string.vault_unlock_title))
            .setSubtitle(activity.getString(R.string.vault_unlock_subtitle))
            .setAllowedAuthenticators(authenticators)
            .setConfirmationRequired(true)
            .build()
        prompt.authenticate(promptInfo)
    }

    override fun close() {
        if (closed.compareAndSet(false, true)) {
            synchronized(stateLock) {
                activePrompt?.cancelAuthentication()
                activePrompt = null
            }
        }
    }

    private fun finish(callback: VaultAuthorizationCallback, result: VaultAuthorization) {
        if (!inFlight.compareAndSet(true, false)) {
            return
        }
        synchronized(stateLock) {
            activePrompt = null
        }
        callback.complete(result)
    }
}
