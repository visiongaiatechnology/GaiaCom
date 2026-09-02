// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app

import android.os.Bundle
import android.os.Build
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.gaiacom.app.session.GaiaSessionViewModel
import de.gaiacom.app.session.SessionState
import de.gaiacom.app.ui.GaiaComApp
import de.gaiacom.app.ui.GaiaComTheme
import de.gaiacom.platform.security.auth.BiometricVaultAuthorizer

class MainActivity : FragmentActivity() {
    private lateinit var viewModel: GaiaSessionViewModel
    private lateinit var authorizer: BiometricVaultAuthorizer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            window.setHideOverlayWindows(true)
        }
        enableEdgeToEdge()
        viewModel = ViewModelProvider(this)[GaiaSessionViewModel::class.java]
        authorizer = BiometricVaultAuthorizer()
        setContent {
            val state = viewModel.state.collectAsStateWithLifecycle().value
            val workspace = viewModel.workspace.collectAsStateWithLifecycle().value
            GaiaComTheme {
                GaiaComApp(
                    state = state,
                    workspace = workspace,
                    onUnlock = ::authorizeVault,
                    onLogin = ::authorizeLogin,
                    onFailureRecovery = viewModel::recoverFromFailure,
                    onWorkspaceSection = viewModel::selectWorkspaceSection,
                    onWorkspaceRetry = viewModel::reloadWorkspace,
                    onLock = viewModel::lock,
                    onLogout = viewModel::logout,
                )
            }
        }
    }

    override fun onStop() {
        super.onStop()
        if (!isChangingConfigurations && viewModel.state.value != SessionState.Authorizing) {
            viewModel.lock()
        }
    }

    override fun onDestroy() {
        authorizer.close()
        super.onDestroy()
    }

    private fun authorizeVault() {
        if (!viewModel.beginAuthorization()) {
            return
        }
        requestAuthorization()
    }

    private fun authorizeLogin(username: String, password: String, mnemonic: String) {
        if (!viewModel.prepareLogin(username, password, mnemonic)) {
            return
        }
        requestAuthorization()
    }

    private fun requestAuthorization() {
        if (!viewModel.prepareHardwareAuthorization()) {
            return
        }
        authorizer.authorize(this) { result -> viewModel.completeAuthorization(result) }
    }
}
