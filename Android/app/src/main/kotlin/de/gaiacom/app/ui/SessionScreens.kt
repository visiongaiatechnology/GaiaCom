// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import de.gaiacom.app.R
import de.gaiacom.app.session.LoginFailure
import de.gaiacom.app.session.SessionFailure
import de.gaiacom.app.session.SessionState
import de.gaiacom.app.session.VaultDiagnostic
import de.gaiacom.platform.security.HardwareAssurance

internal enum class WorkingStage(val label: Int) {
    AUTHORIZING(R.string.authorizing),
    OPENING_VAULT(R.string.opening_vault),
    DERIVING_IDENTITY(R.string.deriving_identity),
    CONNECTING(R.string.connecting),
}

@Composable
internal fun LockedScreen(onUnlock: () -> Unit) {
    ScreenFrame {
        BrandHeader()
        Spacer(Modifier.height(34.dp))
        Kicker(R.string.unlock_kicker)
        Spacer(Modifier.height(14.dp))
        Text(
            text = stringResource(R.string.unlock_title),
            color = GaiaText,
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(14.dp))
        Text(
            text = stringResource(R.string.unlock_body),
            color = Color(0xFFC8E8F6),
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        ServerBadge()
        Spacer(Modifier.height(28.dp))
        PrimaryAction(R.string.unlock_action, true, onUnlock)
    }
}

@Composable
internal fun WorkingScreen(stage: WorkingStage) {
    ScreenFrame {
        BrandHeader()
        Spacer(Modifier.height(44.dp))
        CircularProgressIndicator(
            modifier = Modifier.size(54.dp),
            color = GaiaCyan,
            trackColor = Color(0xFF123341),
            strokeWidth = 3.dp,
        )
        Spacer(Modifier.height(24.dp))
        Text(
            text = stringResource(stage.label),
            color = GaiaText,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(12.dp))
        ServerBadge()
    }
}

@Composable
internal fun LoginScreen(state: SessionState.Login, onLogin: (String, String, String) -> Unit) {
    var username by remember(state.suggestedUsername) { mutableStateOf(state.suggestedUsername) }
    var password by remember { mutableStateOf("") }
    var mnemonic by remember { mutableStateOf("") }
    var showMnemonic by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val submit = {
        focusManager.clearFocus(force = true)
        onLogin(username, password, mnemonic)
    }
    ScreenFrame {
        BrandHeader()
        Spacer(Modifier.height(28.dp))
        Kicker(R.string.login_kicker)
        Spacer(Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.login_title),
            color = GaiaText,
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Black,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.login_body),
            color = Color(0xFFC8E8F6),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        GaiaTextField(
            value = username,
            onValueChange = { if (it.length <= 64) username = it },
            label = R.string.username_label,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Text,
                imeAction = ImeAction.Next,
            ),
        )
        Spacer(Modifier.height(12.dp))
        GaiaTextField(
            value = password,
            onValueChange = { if (it.length <= 512) password = it },
            label = R.string.password_label,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Next,
            ),
            obscure = true,
        )
        Spacer(Modifier.height(12.dp))
        GaiaTextField(
            value = mnemonic,
            onValueChange = { if (it.length <= 512) mnemonic = it },
            label = R.string.mnemonic_label,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.None,
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    if (username.isNotBlank() && password.isNotEmpty() && mnemonic.isNotBlank()) submit()
                },
            ),
            obscure = !showMnemonic,
            singleLine = false,
            minLines = 3,
            trailingContent = {
                TextButton(onClick = { showMnemonic = !showMnemonic }) {
                    Text(stringResource(if (showMnemonic) R.string.hide_secret else R.string.show_secret))
                }
            },
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.mnemonic_support),
            modifier = Modifier.fillMaxWidth(),
            color = GaiaMuted,
            style = MaterialTheme.typography.bodySmall,
        )
        if (state.error != null) {
            Spacer(Modifier.height(14.dp))
            ErrorNotice(state.error)
        }
        Spacer(Modifier.height(22.dp))
        PrimaryAction(
            label = R.string.login_action,
            enabled = username.isNotBlank() && password.isNotEmpty() && mnemonic.isNotBlank(),
            onClick = submit,
        )
        Spacer(Modifier.height(16.dp))
        StatusRow(
            left = "ANDROID KEYSTORE",
            right = stringResource(R.string.server_badge),
        )
    }
}

@Composable
internal fun ReadyScreen(state: SessionState.Ready, onLock: () -> Unit, onLogout: () -> Unit) {
    ScreenFrame {
        BrandHeader()
        Spacer(Modifier.height(22.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Kicker(R.string.ready_kicker)
                Spacer(Modifier.height(8.dp))
                Text(
                    text = state.username,
                    color = GaiaText,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                )
            }
            StatusDot()
        }
        Spacer(Modifier.height(18.dp))
        ConnectionPanel(state)
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ModuleTile(R.string.module_chat, "QC")
            ModuleTile(R.string.module_mail, "GM")
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ModuleTile(R.string.module_gsn, "GSN")
            ModuleTile(R.string.module_channels, "CH")
        }
        Spacer(Modifier.height(22.dp))
        OutlinedButton(
            onClick = onLock,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, GaiaCyan.copy(alpha = 0.45f)),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = GaiaText),
        ) {
            Text(stringResource(R.string.lock_action), fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.55f)),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
        ) {
            Text(stringResource(R.string.logout_action))
        }
    }
}

@Composable
internal fun FailureScreen(
    reason: SessionFailure,
    diagnostic: VaultDiagnostic?,
    onRetry: () -> Unit,
) {
    ScreenFrame {
        BrandHeader()
        Spacer(Modifier.height(34.dp))
        Text(
            text = stringResource(R.string.error_title),
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(14.dp))
        Text(
            text = stringResource(reason.labelResource()),
            color = GaiaText,
            textAlign = TextAlign.Center,
        )
        if (diagnostic != null) {
            Spacer(Modifier.height(18.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.45f)),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF090E17)),
            ) {
                Column(Modifier.fillMaxWidth().padding(14.dp)) {
                    Text(
                        text = stringResource(R.string.error_diagnostic_title),
                        color = MaterialTheme.colorScheme.error,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(8.dp))
                    SelectionContainer {
                        Text(
                            text = diagnostic.report,
                            color = GaiaText,
                            fontFamily = FontFamily.Monospace,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.error_diagnostic_local),
                        color = GaiaMuted,
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }
        }
        Spacer(Modifier.height(28.dp))
        PrimaryAction(R.string.retry_action, true, onRetry)
    }
}
