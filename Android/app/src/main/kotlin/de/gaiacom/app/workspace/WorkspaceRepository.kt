// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.workspace

import de.gaiacom.platform.api.GaiaApiAuthenticationException
import de.gaiacom.platform.api.GaiaApiClient
import de.gaiacom.platform.api.GaiaApiException
import de.gaiacom.platform.api.GaiaApiNetworkException
import de.gaiacom.platform.api.GaiaApiTimeoutException
import de.gaiacom.platform.api.GaiaApiTlsException
import de.gaiacom.platform.api.GaiaIdentity
import de.gaiacom.platform.api.GsnPost
import de.gaiacom.platform.api.IdentityId
import de.gaiacom.platform.api.MessageEnvelope
import de.gaiacom.platform.api.PublicChannel

internal interface WorkspaceGateway {
    fun identities(token: ByteArray): List<GaiaIdentity>

    fun chats(identityId: IdentityId, token: ByteArray): List<MessageEnvelope>

    fun mail(identityId: IdentityId, token: ByteArray): List<MessageEnvelope>

    fun channels(token: ByteArray): List<PublicChannel>

    fun gsn(token: ByteArray): List<GsnPost>
}

internal class ApiWorkspaceGateway(
    private val client: GaiaApiClient = GaiaApiClient(),
) : WorkspaceGateway {
    override fun identities(token: ByteArray): List<GaiaIdentity> = client.identities(token)

    override fun chats(identityId: IdentityId, token: ByteArray): List<MessageEnvelope> =
        client.chatInbox(identityId, token)

    override fun mail(identityId: IdentityId, token: ByteArray): List<MessageEnvelope> =
        client.mailMessages(identityId, token)

    override fun channels(token: ByteArray): List<PublicChannel> = client.publicChannels(token)

    override fun gsn(token: ByteArray): List<GsnPost> = client.gsnNodeFeed(token)
}

internal class WorkspaceRepository(
    private val gateway: WorkspaceGateway = ApiWorkspaceGateway(),
) {
    fun load(token: ByteArray): WorkspaceState {
        val identities = try {
            gateway.identities(token)
        } catch (exception: GaiaApiException) {
            return WorkspaceState.Failed(exception.toWorkspaceFailure())
        }
        val activeIdentity = identities.firstOrNull { it.active } ?: identities.firstOrNull()
            ?: return WorkspaceState.NeedsIdentity
        val degraded = linkedSetOf<WorkspaceModule>()
        val chats = loadModule(WorkspaceModule.CHAT, degraded) { gateway.chats(activeIdentity.id, token) }
        val mail = loadModule(WorkspaceModule.MAIL, degraded) { gateway.mail(activeIdentity.id, token) }
        val channels = loadModule(WorkspaceModule.CHANNELS, degraded) { gateway.channels(token) }
        val gsn = loadModule(WorkspaceModule.GSN, degraded) { gateway.gsn(token) }
        return WorkspaceState.Content(
            identities = identities,
            activeIdentity = activeIdentity,
            chatMessages = chats,
            mailMessages = mail,
            channels = channels,
            gsnPosts = gsn,
            degradedModules = degraded,
        )
    }

    private fun <T> loadModule(
        module: WorkspaceModule,
        degraded: MutableSet<WorkspaceModule>,
        load: () -> List<T>,
    ): List<T> = try {
        load()
    } catch (_: GaiaApiException) {
        degraded += module
        emptyList()
    }

    private fun GaiaApiException.toWorkspaceFailure(): WorkspaceFailure = when (this) {
        is GaiaApiAuthenticationException -> WorkspaceFailure.SESSION_EXPIRED
        is GaiaApiNetworkException,
        is GaiaApiTimeoutException,
        is GaiaApiTlsException,
        -> WorkspaceFailure.NETWORK_UNAVAILABLE

        else -> WorkspaceFailure.SERVER_REJECTED
    }
}
