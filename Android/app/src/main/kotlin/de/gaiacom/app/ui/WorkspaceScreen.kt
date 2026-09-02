// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import de.gaiacom.app.R
import de.gaiacom.app.session.SessionState
import de.gaiacom.app.workspace.WorkspaceSection
import de.gaiacom.app.workspace.WorkspaceState
import de.gaiacom.platform.api.GsnPost
import de.gaiacom.platform.api.MessageEnvelope
import de.gaiacom.platform.api.MessageKind
import de.gaiacom.platform.api.PublicChannel

@Composable
internal fun ReadyWorkspaceScreen(
    session: SessionState.Ready,
    workspace: WorkspaceState,
    onSection: (WorkspaceSection) -> Unit,
    onRetry: () -> Unit,
    onLock: () -> Unit,
    onLogout: () -> Unit,
) {
    val selected = (workspace as? WorkspaceState.Content)?.section ?: WorkspaceSection.DASHBOARD
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = Color.Transparent,
        topBar = { WorkspaceHeader(session, workspace) },
        bottomBar = {
            if (workspace is WorkspaceState.Content) {
                WorkspaceNavigation(selected, onSection)
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentAlignment = Alignment.Center,
        ) {
            when (workspace) {
                WorkspaceState.Idle,
                WorkspaceState.Loading,
                -> LoadingWorkspace()

                WorkspaceState.NeedsIdentity -> WorkspaceNotice(
                    body = stringResource(R.string.workspace_needs_identity),
                    onRetry = onRetry,
                )

                is WorkspaceState.Failed -> WorkspaceNotice(
                    body = stringResource(R.string.workspace_failed),
                    onRetry = onRetry,
                )

                is WorkspaceState.Content -> WorkspaceContent(
                    workspace = workspace,
                    onLock = onLock,
                    onLogout = onLogout,
                )
            }
        }
    }
}

@Composable
private fun WorkspaceHeader(session: SessionState.Ready, workspace: WorkspaceState) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, GaiaCyan.copy(alpha = 0.22f)),
        colors = CardDefaults.cardColors(containerColor = GaiaPanel),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("GAIACOM // NATIVE", color = GaiaCyan, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.labelSmall)
                Text(session.username, color = GaiaText, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text(stringResource(R.string.workspace_secure_session), color = GaiaMuted, style = MaterialTheme.typography.bodySmall)
            }
            val statusColor = if (workspace is WorkspaceState.Failed) MaterialTheme.colorScheme.error else GaiaMint
            Text("●", color = statusColor, style = MaterialTheme.typography.headlineSmall)
        }
    }
}

@Composable
private fun WorkspaceNavigation(selected: WorkspaceSection, onSection: (WorkspaceSection) -> Unit) {
    NavigationBar(
        modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        containerColor = GaiaPanel,
        contentColor = GaiaText,
        tonalElevation = 0.dp,
    ) {
        WorkspaceSection.entries.forEach { section ->
            NavigationBarItem(
                selected = section == selected,
                onClick = { onSection(section) },
                icon = {
                    Text(
                        section.code,
                        color = if (section == selected) GaiaCyan else GaiaMuted,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Black,
                    )
                },
                label = { Text(stringResource(section.label), maxLines = 1) },
            )
        }
    }
}

@Composable
private fun WorkspaceContent(
    workspace: WorkspaceState.Content,
    onLock: () -> Unit,
    onLogout: () -> Unit,
) {
    when (workspace.section) {
        WorkspaceSection.DASHBOARD -> DashboardSection(workspace, onLock, onLogout)
        WorkspaceSection.CHAT -> MessageSection(workspace.chatMessages, R.string.workspace_no_messages)
        WorkspaceSection.MAIL -> MessageSection(workspace.mailMessages, R.string.workspace_no_mail)
        WorkspaceSection.CHANNELS -> ChannelSection(workspace.channels)
        WorkspaceSection.GSN -> GsnSection(workspace.gsnPosts)
    }
}

@Composable
private fun DashboardSection(
    workspace: WorkspaceState.Content,
    onLock: () -> Unit,
    onLogout: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            WorkspaceCard {
                Text(stringResource(R.string.workspace_identity), color = GaiaCyan, fontFamily = FontFamily.Monospace)
                Spacer(Modifier.height(6.dp))
                Text(workspace.activeIdentity.displayName.ifBlank { workspace.activeIdentity.gaiaId }, color = GaiaText, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(workspace.activeIdentity.gaiaId, color = GaiaMuted)
            }
        }
        item {
            WorkspaceCard {
                Text(
                    stringResource(
                        R.string.workspace_dashboard_summary,
                        workspace.chatMessages.size,
                        workspace.mailMessages.size,
                        workspace.channels.size,
                        workspace.gsnPosts.size,
                    ),
                    color = GaiaText,
                    style = MaterialTheme.typography.titleMedium,
                )
                if (workspace.degradedModules.isNotEmpty()) {
                    Spacer(Modifier.height(10.dp))
                    Text(stringResource(R.string.workspace_degraded), color = MaterialTheme.colorScheme.error)
                }
            }
        }
        item {
            OutlinedButton(onClick = onLock, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.lock_action))
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.logout_action), color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun MessageSection(messages: List<MessageEnvelope>, emptyLabel: Int) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (messages.isEmpty()) item { EmptyState(emptyLabel) }
        items(messages, key = { it.id.value }) { message -> MessageCard(message) }
    }
}

@Composable
private fun MessageCard(message: MessageEnvelope) {
    WorkspaceCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(message.sender, color = GaiaCyan, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(message.createdAt.toString(), color = GaiaMuted, style = MaterialTheme.typography.labelSmall)
        }
        Spacer(Modifier.height(8.dp))
        Text(
            stringResource(
                if (message.kind == MessageKind.SYSTEM) R.string.workspace_system_message else R.string.workspace_encrypted_message,
            ),
            color = GaiaText,
        )
        if (message.untrusted) {
            Spacer(Modifier.height(6.dp))
            Text("UNTRUSTED", color = MaterialTheme.colorScheme.error, fontFamily = FontFamily.Monospace)
        }
    }
}

@Composable
private fun ChannelSection(channels: List<PublicChannel>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (channels.isEmpty()) item { EmptyState(R.string.workspace_no_channels) }
        items(channels, key = { it.id.value }) { channel ->
            WorkspaceCard {
                Text(channel.name, color = GaiaText, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(channel.description, color = GaiaMuted, maxLines = 3, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(8.dp))
                Text(stringResource(R.string.workspace_subscribers, channel.subscriberCount), color = GaiaCyan, style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

@Composable
private fun GsnSection(posts: List<GsnPost>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (posts.isEmpty()) item { EmptyState(R.string.workspace_no_gsn) }
        items(posts, key = { it.id.value }) { post ->
            WorkspaceCard {
                Text(post.displayName.ifBlank { post.gaiaId }, color = GaiaCyan, fontWeight = FontWeight.Bold)
                Text(post.gaiaId, color = GaiaMuted, style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(10.dp))
                Text(post.body, color = GaiaText, style = MaterialTheme.typography.bodyLarge)
                Spacer(Modifier.height(8.dp))
                Text(post.timestamp.toString(), color = GaiaMuted, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun WorkspaceCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, GaiaCyan.copy(alpha = 0.16f)),
        colors = CardDefaults.cardColors(containerColor = Color(0xEE08131F)),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp), content = content)
    }
}

@Composable
private fun LoadingWorkspace() {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        CircularProgressIndicator(color = GaiaCyan)
        Spacer(Modifier.height(16.dp))
        Text(stringResource(R.string.workspace_loading), color = GaiaText)
    }
}

@Composable
private fun WorkspaceNotice(body: String, onRetry: () -> Unit) {
    WorkspaceCard {
        Text(body, color = GaiaText)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.workspace_retry))
        }
    }
}

@Composable
private fun EmptyState(label: Int) {
    WorkspaceCard { Text(stringResource(label), color = GaiaMuted) }
}

private val WorkspaceSection.label: Int
    get() = when (this) {
        WorkspaceSection.DASHBOARD -> R.string.workspace_dashboard
        WorkspaceSection.CHAT -> R.string.workspace_chat
        WorkspaceSection.MAIL -> R.string.workspace_mail
        WorkspaceSection.CHANNELS -> R.string.workspace_channels
        WorkspaceSection.GSN -> R.string.workspace_gsn
    }

private val WorkspaceSection.code: String
    get() = when (this) {
        WorkspaceSection.DASHBOARD -> "GA"
        WorkspaceSection.CHAT -> "QC"
        WorkspaceSection.MAIL -> "GM"
        WorkspaceSection.CHANNELS -> "CH"
        WorkspaceSection.GSN -> "GSN"
    }
