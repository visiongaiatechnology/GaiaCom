// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

class GaiaApiClient internal constructor(
    private val transport: SecureHttpTransport,
) {
    constructor() : this(SecureHttpTransport())

    fun authStatus(bearerToken: ByteArray? = null): AccountAuthStatus {
        val uri = GaiaApiUrlPolicy.build(ApiEndpoint.AUTH_STATUS)
        return transport.get(uri, bearerToken, MAX_AUTH_BYTES, setOf(200, 401)).use { response ->
            GaiaApiParsers.authStatus(response.body, response.statusCode)
        }
    }

    fun identities(bearerToken: ByteArray): List<GaiaIdentity> {
        val uri = GaiaApiUrlPolicy.build(ApiEndpoint.IDENTITIES)
        return transport.get(uri, bearerToken, MAX_IDENTITY_BYTES).use { response ->
            GaiaApiParsers.identities(response.body)
        }
    }

    fun getPublicIdentity(gaiaId: String, bearerToken: ByteArray? = null): PublicIdentityResult {
        requireGaiaId(gaiaId)
        val uri = GaiaApiUrlPolicy.buildWithPathSegment(ApiEndpoint.PUBLIC_IDENTITY, gaiaId)
        return transport.get(uri, bearerToken, MAX_IDENTITY_BYTES).use { response ->
            GaiaApiParsers.publicIdentity(response.body, gaiaId)
        }
    }

    fun getRecipientDeviceKeys(identityId: IdentityId, bearerToken: ByteArray): List<RecipientDeviceKey> {
        val uri = GaiaApiUrlPolicy.build(
            ApiEndpoint.RECIPIENT_DEVICE_KEYS,
            listOf("identityId" to identityId.value),
        )
        return transport.get(uri, bearerToken, MAX_DEVICE_KEY_BYTES).use { response ->
            GaiaApiParsers.recipientDeviceKeys(response.body, identityId)
        }
    }

    fun chatInbox(identityId: IdentityId, bearerToken: ByteArray): List<MessageEnvelope> {
        val uri = GaiaApiUrlPolicy.build(
            ApiEndpoint.CHAT_INBOX,
            listOf("identityId" to identityId.value),
        )
        return transport.get(uri, bearerToken, MAX_MESSAGE_BYTES).use { response ->
            GaiaApiParsers.messages(response.body, mailboxRequired = false)
        }
    }

    fun mailMessages(
        identityId: IdentityId,
        bearerToken: ByteArray,
        query: MailboxQuery = MailboxQuery(),
    ): List<MessageEnvelope> {
        val parameters = buildList {
            add("identityId" to identityId.value)
            query.folder?.let { add("folder" to it.wireName) }
            if (query.text.isNotEmpty()) add("q" to query.text)
            if (query.from.isNotEmpty()) add("from" to query.from)
            if (query.subject.isNotEmpty()) add("subject" to query.subject)
            if (query.label.isNotEmpty()) add("label" to query.label)
            if (query.unread) add("unread" to "true")
            if (query.starred) add("starred" to "true")
            if (query.important) add("important" to "true")
            add("limit" to query.limit.toString())
        }
        val uri = GaiaApiUrlPolicy.build(ApiEndpoint.MAIL_MESSAGES, parameters)
        return transport.get(uri, bearerToken, MAX_MESSAGE_BYTES).use { response ->
            GaiaApiParsers.messages(response.body, mailboxRequired = true)
        }
    }

    fun publicChannels(bearerToken: ByteArray): List<PublicChannel> {
        val uri = GaiaApiUrlPolicy.build(ApiEndpoint.CHANNELS)
        return transport.get(uri, bearerToken, MAX_CHANNEL_BYTES).use { response ->
            GaiaApiParsers.channels(response.body)
        }
    }

    fun publicChannelPosts(
        channelId: ChannelId,
        bearerToken: ByteArray,
        identityId: IdentityId? = null,
        limit: Int = 100,
    ): List<PublicChannelPost> {
        if (limit !in 1..200) throw GaiaApiPolicyException()
        val parameters = buildList {
            add("channelId" to channelId.value)
            identityId?.let { add("identityId" to it.value) }
            add("limit" to limit.toString())
        }
        val uri = GaiaApiUrlPolicy.build(ApiEndpoint.CHANNEL_POSTS, parameters)
        return transport.get(uri, bearerToken, MAX_CHANNEL_BYTES).use { response ->
            GaiaApiParsers.channelPosts(response.body)
        }
    }

    fun gsnNodeFeed(bearerToken: ByteArray, nodeId: String = ""): List<GsnPost> {
        if (nodeId.isNotEmpty() && (!NODE_NAME.matches(nodeId) || nodeId.startsWith('.') || nodeId.endsWith('.'))) {
            throw GaiaApiPolicyException()
        }
        val parameters = if (nodeId.isEmpty()) emptyList() else listOf("node_id" to nodeId)
        val uri = GaiaApiUrlPolicy.build(ApiEndpoint.GSN_NODE_FEED, parameters)
        return transport.get(uri, bearerToken, MAX_GSN_BYTES).use { response ->
            GaiaApiParsers.gsnFeed(response.body)
        }
    }

    fun gsnFollowingFeed(bearerToken: ByteArray): List<GsnPost> {
        val uri = GaiaApiUrlPolicy.build(ApiEndpoint.GSN_FOLLOWING_FEED)
        return transport.get(uri, bearerToken, MAX_GSN_BYTES).use { response ->
            GaiaApiParsers.gsnFeed(response.body)
        }
    }

    fun sendDirectMessage(
        senderIdentityId: IdentityId,
        recipientIdentityId: IdentityId,
        envelope: OutboundEncryptedEnvelope,
        bearerToken: ByteArray,
    ): MessageSendReceipt {
        val body = GaiaWriteJson.directMessage(senderIdentityId, recipientIdentityId, envelope)
        return try {
            val uri = GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_SEND)
            transport.sendJson(
                uri, JsonWriteMethod.POST, bearerToken, body,
                MAX_ENVELOPE_REQUEST_BYTES, MAX_WRITE_RESPONSE_BYTES, setOf(200),
            ).use { response -> GaiaApiParsers.messageSendReceipt(response.body) }
        } finally {
            body.fill(0)
        }
    }

    fun markChatRead(identityId: IdentityId, messageIds: Collection<MessageId>, bearerToken: ByteArray) {
        val body = GaiaWriteJson.markRead(identityId, messageIds)
        try {
            val uri = GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_READ)
            transport.sendJson(
                uri, JsonWriteMethod.POST, bearerToken, body,
                MAX_SMALL_REQUEST_BYTES, MAX_WRITE_RESPONSE_BYTES, setOf(200),
            ).use { response -> GaiaApiParsers.readAcknowledgement(response.body) }
        } finally {
            body.fill(0)
        }
    }

    fun publishChannelPost(request: ChannelPostPublishRequest, bearerToken: ByteArray): PublicChannelPost {
        val body = GaiaWriteJson.channelPost(request)
        return try {
            val uri = GaiaApiUrlPolicy.build(ApiEndpoint.CHANNEL_POST_CREATE)
            transport.sendJson(
                uri, JsonWriteMethod.POST, bearerToken, body,
                MAX_CHANNEL_REQUEST_BYTES, MAX_CHANNEL_BYTES, setOf(201),
            ).use { response -> GaiaApiParsers.channelPost(response.body) }
        } finally {
            body.fill(0)
        }
    }

    fun publishGsnPost(request: GsnPostPublishRequest, bearerToken: ByteArray): GsnPost {
        val body = GaiaWriteJson.gsnPost(request)
        return try {
            val uri = GaiaApiUrlPolicy.build(ApiEndpoint.GSN_POST_CREATE)
            transport.sendJson(
                uri, JsonWriteMethod.POST, bearerToken, body,
                MAX_GSN_REQUEST_BYTES, MAX_GSN_BYTES, setOf(201),
            ).use { response -> GaiaApiParsers.gsnPost(response.body) }
        } finally {
            body.fill(0)
        }
    }

    companion object {
        const val PRODUCTION_ORIGIN: String = GaiaApiUrlPolicy.PRODUCTION_ORIGIN
        private const val MAX_AUTH_BYTES = 64 * 1_024
        private const val MAX_IDENTITY_BYTES = 512 * 1_024
        private const val MAX_DEVICE_KEY_BYTES = 512 * 1_024
        private const val MAX_MESSAGE_BYTES = 4 * 1_024 * 1_024
        private const val MAX_CHANNEL_BYTES = 2 * 1_024 * 1_024
        private const val MAX_GSN_BYTES = 4 * 1_024 * 1_024
        private const val MAX_WRITE_RESPONSE_BYTES = 64 * 1_024
        private const val MAX_SMALL_REQUEST_BYTES = 64 * 1_024
        private const val MAX_ENVELOPE_REQUEST_BYTES = 1_100_000
        private const val MAX_CHANNEL_REQUEST_BYTES = 1_100_000
        private const val MAX_GSN_REQUEST_BYTES = 768 * 1_024
        private val NODE_NAME = Regex("[A-Za-z0-9.-]{3,253}")
    }
}
