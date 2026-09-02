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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import de.gaiacom.app.R
import de.gaiacom.app.session.LoginFailure
import de.gaiacom.app.session.SessionFailure
import de.gaiacom.app.session.SessionState
import de.gaiacom.platform.security.HardwareAssurance

@Composable
internal fun ScreenFrame(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier
            .widthIn(max = 560.dp)
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, GaiaCyan.copy(alpha = 0.2f)),
        colors = CardDefaults.cardColors(containerColor = GaiaPanel, contentColor = GaiaText),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 26.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            content = content,
        )
    }
}

@Composable
internal fun BrandHeader() {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier.size(40.dp).clip(CircleShape).background(GaiaCyan),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "G",
                color = Color(0xFF001B20),
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.titleLarge,
            )
        }
        Spacer(Modifier.width(10.dp))
        Column {
            Text("GAIACOM", color = GaiaText, fontWeight = FontWeight.Black)
            Text(
                stringResource(R.string.brand_beta),
                color = GaiaCyan,
                style = MaterialTheme.typography.labelSmall,
                fontFamily = FontFamily.Monospace,
            )
        }
    }
}

@Composable
internal fun Kicker(@StringRes label: Int) {
    Text(
        text = stringResource(label),
        color = GaiaCyan,
        style = MaterialTheme.typography.labelMedium,
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
    )
}

@Composable
internal fun ServerBadge() {
    Text(
        text = stringResource(R.string.server_badge),
        color = GaiaMint,
        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
        style = MaterialTheme.typography.labelMedium,
        fontFamily = FontFamily.Monospace,
    )
}

@Composable
internal fun GaiaTextField(
    value: String,
    onValueChange: (String) -> Unit,
    @StringRes label: Int,
    keyboardOptions: KeyboardOptions,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    obscure: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
    trailingContent: (@Composable () -> Unit)? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(stringResource(label)) },
        singleLine = singleLine,
        minLines = minLines,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        visualTransformation = if (obscure) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = trailingContent,
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = GaiaText,
            unfocusedTextColor = GaiaText,
            cursorColor = GaiaCyan,
            focusedBorderColor = GaiaCyan,
            unfocusedBorderColor = Color(0xFF294658),
            focusedLabelColor = GaiaCyan,
            unfocusedLabelColor = GaiaMuted,
            focusedContainerColor = Color(0xFF050C14),
            unfocusedContainerColor = Color(0xFF050C14),
        ),
    )
}

@Composable
internal fun ErrorNotice(failure: LoginFailure) {
    Text(
        text = stringResource(failure.labelResource()),
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.error,
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center,
    )
}

@Composable
internal fun ConnectionPanel(state: SessionState.Ready) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, GaiaMint.copy(alpha = 0.25f)),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF071A1C), contentColor = GaiaText),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.connection_online),
                    color = GaiaMint,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.weight(1f))
                Text(stringResource(state.assurance.labelResource()), color = GaiaCyan, style = MaterialTheme.typography.labelSmall)
            }
            Spacer(Modifier.height(10.dp))
            HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
            Spacer(Modifier.height(10.dp))
            Text(state.serverOrigin, color = Color(0xFFC8E8F6), style = MaterialTheme.typography.bodyMedium)
            Text(stringResource(R.string.ready_body), color = GaiaMuted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
internal fun RowScope.ModuleTile(@StringRes label: Int, code: String) {
    Card(
        modifier = Modifier.weight(1f),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, GaiaViolet.copy(alpha = 0.2f)),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0A1422), contentColor = GaiaText),
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(code, color = GaiaViolet, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(9.dp))
            Text(stringResource(label), color = GaiaText, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.module_remote), color = GaiaMuted, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
internal fun StatusDot() = Text("●", color = GaiaMint, style = MaterialTheme.typography.headlineMedium)

@Composable
internal fun StatusRow(left: String, right: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
        Text(left, color = GaiaCyan, style = MaterialTheme.typography.labelSmall, fontFamily = FontFamily.Monospace)
        Text("  //  ", color = GaiaMuted, style = MaterialTheme.typography.labelSmall)
        Text(right, color = GaiaMint, style = MaterialTheme.typography.labelSmall, fontFamily = FontFamily.Monospace)
    }
}

@Composable
internal fun PrimaryAction(@StringRes label: Int, enabled: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(56.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = GaiaCyan,
            contentColor = Color(0xFF001B20),
            disabledContainerColor = Color(0xFF173541),
            disabledContentColor = Color(0xFF78909A),
        ),
    ) {
        Text(stringResource(label), fontWeight = FontWeight.Black)
    }
}

@StringRes
internal fun HardwareAssurance.labelResource(): Int = when (this) {
    HardwareAssurance.STRONGBOX -> R.string.security_strongbox
    HardwareAssurance.TRUSTED_EXECUTION_ENVIRONMENT -> R.string.security_tee
    HardwareAssurance.SOFTWARE -> R.string.security_software
}

@StringRes
internal fun SessionFailure.labelResource(): Int = when (this) {
    SessionFailure.CANCELLED -> R.string.error_cancelled
    SessionFailure.TEMPORARILY_LOCKED -> R.string.error_locked
    SessionFailure.HARDWARE_UNAVAILABLE -> R.string.error_hardware
    SessionFailure.ENROLLMENT_REQUIRED -> R.string.error_enrollment
    SessionFailure.SECURITY_UPDATE_REQUIRED -> R.string.error_update
    SessionFailure.LOCAL_VAULT_RECOVERED -> R.string.error_local_vault_recovered
    SessionFailure.KEY_INVALIDATED -> R.string.error_key_invalidated
    SessionFailure.AUTHENTICATION_REQUIRED -> R.string.error_authentication_required
    SessionFailure.IDENTITY_FAILURE -> R.string.error_identity
    SessionFailure.VAULT_FAILURE -> R.string.error_generic
}

@StringRes
internal fun LoginFailure.labelResource(): Int = when (this) {
    LoginFailure.INVALID_MNEMONIC -> R.string.login_error_mnemonic
    LoginFailure.MNEMONIC_MISMATCH -> R.string.login_error_mnemonic_mismatch
    LoginFailure.IDENTITY_VERIFICATION_UNAVAILABLE -> R.string.login_error_identity_verification
    LoginFailure.INVALID_CREDENTIALS -> R.string.login_error_credentials
    LoginFailure.RATE_LIMITED -> R.string.login_error_rate
    LoginFailure.NETWORK_UNAVAILABLE -> R.string.login_error_network
    LoginFailure.TLS_REJECTED -> R.string.login_error_tls
    LoginFailure.SERVER_UNAVAILABLE -> R.string.login_error_server
    LoginFailure.SESSION_EXPIRED -> R.string.login_error_session
    LoginFailure.PROTOCOL_REJECTED -> R.string.login_error_protocol
}
