// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.workspace

import de.gaiacom.platform.api.GaiaIdentity
import de.gaiacom.platform.api.GsnPost
import de.gaiacom.platform.api.MessageEnvelope
import de.gaiacom.platform.api.PublicChannel

enum class WorkspaceSection {
    DASHBOARD,
    CHAT,
    MAIL,
    CHANNELS,
    GSN,
}

sealed interface WorkspaceState {
    data object Idle : WorkspaceState
    data object Loading : WorkspaceState
    data object NeedsIdentity : WorkspaceState

    data class Content(
        val identities: List<GaiaIdentity>,
        val activeIdentity: GaiaIdentity,
        val chatMessages: List<MessageEnvelope>,
        val mailMessages: List<MessageEnvelope>,
        val channels: List<PublicChannel>,
        val gsnPosts: List<GsnPost>,
        val section: WorkspaceSection = WorkspaceSection.DASHBOARD,
        val degradedModules: Set<WorkspaceModule> = emptySet(),
    ) : WorkspaceState

    data class Failed(val failure: WorkspaceFailure) : WorkspaceState
}

enum class WorkspaceModule {
    CHAT,
    MAIL,
    CHANNELS,
    GSN,
}

enum class WorkspaceFailure {
    SESSION_EXPIRED,
    NETWORK_UNAVAILABLE,
    SERVER_REJECTED,
}
