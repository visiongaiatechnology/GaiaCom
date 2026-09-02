// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import de.gaiacom.app.session.SessionState
import de.gaiacom.app.workspace.WorkspaceSection
import de.gaiacom.app.workspace.WorkspaceState

@Composable
fun GaiaComApp(
    state: SessionState,
    workspace: WorkspaceState,
    onUnlock: () -> Unit,
    onLogin: (String, String, String) -> Unit,
    onFailureRecovery: () -> Unit,
    onWorkspaceSection: (WorkspaceSection) -> Unit,
    onWorkspaceRetry: () -> Unit,
    onLock: () -> Unit,
    onLogout: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(Color(0xFF132143), Color(0xFF06111A), Color(0xFF020407)),
                    center = Offset(180f, 40f),
                    radius = 1_500f,
                ),
            ),
    ) {
        GaiaGrid()
        Box(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .imePadding()
                .padding(horizontal = 18.dp, vertical = 16.dp),
            contentAlignment = Alignment.Center,
        ) {
            when (state) {
                SessionState.Locked -> LockedScreen(onUnlock)
                SessionState.Authorizing -> WorkingScreen(WorkingStage.AUTHORIZING)
                SessionState.OpeningVault -> WorkingScreen(WorkingStage.OPENING_VAULT)
                SessionState.DerivingIdentity -> WorkingScreen(WorkingStage.DERIVING_IDENTITY)
                is SessionState.Login -> LoginScreen(state, onLogin)
                SessionState.SigningIn -> WorkingScreen(WorkingStage.CONNECTING)
                is SessionState.Ready -> ReadyWorkspaceScreen(
                    session = state,
                    workspace = workspace,
                    onSection = onWorkspaceSection,
                    onRetry = onWorkspaceRetry,
                    onLock = onLock,
                    onLogout = onLogout,
                )
                is SessionState.Failed -> FailureScreen(state.reason, state.diagnostic, onFailureRecovery)
            }
        }
    }
}

@Composable
private fun GaiaGrid() {
    Canvas(Modifier.fillMaxSize()) {
        val spacing = 54.dp.toPx()
        val lineColor = GaiaCyan.copy(alpha = 0.055f)
        var x = 0f
        while (x <= size.width) {
            drawLine(lineColor, Offset(x, 0f), Offset(x, size.height), 1f)
            x += spacing
        }
        var y = 0f
        while (y <= size.height) {
            drawLine(lineColor, Offset(0f, y), Offset(size.width, y), 1f)
            y += spacing
        }
    }
}
