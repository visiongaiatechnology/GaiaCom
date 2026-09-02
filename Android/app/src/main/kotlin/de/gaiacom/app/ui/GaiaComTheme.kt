// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

internal val GaiaCyan = Color(0xFF39E8FF)
internal val GaiaMint = Color(0xFF6BFFBF)
internal val GaiaViolet = Color(0xFF9D66FF)
internal val GaiaText = Color(0xFFEFFBFF)
internal val GaiaMuted = Color(0xFF91A9B9)
internal val GaiaPanel = Color(0xF20A1622)

private val GaiaDarkColors = darkColorScheme(
    primary = GaiaCyan,
    onPrimary = Color(0xFF001B20),
    primaryContainer = Color(0xFF063644),
    onPrimaryContainer = GaiaText,
    secondary = GaiaViolet,
    onSecondary = GaiaText,
    tertiary = GaiaMint,
    onTertiary = Color(0xFF002116),
    background = Color(0xFF020407),
    onBackground = GaiaText,
    surface = Color(0xFF07111A),
    onSurface = GaiaText,
    surfaceVariant = Color(0xFF0D1B29),
    onSurfaceVariant = GaiaMuted,
    error = Color(0xFFFF6078),
    onError = Color.White,
)

@Composable
fun GaiaComTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = GaiaDarkColors,
        typography = Typography(),
        content = content,
    )
}
