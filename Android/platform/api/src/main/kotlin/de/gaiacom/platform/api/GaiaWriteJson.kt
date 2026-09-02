// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

internal object GaiaWriteJson {
    fun directMessage(
        senderIdentityId: IdentityId,
        recipientIdentityId: IdentityId,
        envelope: OutboundEncryptedEnvelope,
    ): ByteArray = encode(
        JsonObject(
            linkedMapOf(
                "senderIdentityId" to JsonString(senderIdentityId.value),
                "recipientIds" to JsonArray(listOf(JsonString(recipientIdentityId.value))),
                "envelopeData" to envelope.jsonNode(),
            ),
        ),
    )

    fun markRead(identityId: IdentityId, messageIds: Collection<MessageId>): ByteArray {
        val uniqueIds = LinkedHashSet(messageIds)
        if (uniqueIds.size !in 1..512) throw GaiaApiPolicyException()
        return encode(
            JsonObject(
                linkedMapOf(
                    "identityId" to JsonString(identityId.value),
                    "messageIds" to JsonArray(uniqueIds.map { id -> JsonString(id.value) }),
                ),
            ),
        )
    }

    fun channelPost(request: ChannelPostPublishRequest): ByteArray = encode(
        JsonObject(
            linkedMapOf(
                "identityId" to JsonString(request.identityId.value),
                "channelId" to JsonString(request.channelId.value),
                "body" to JsonString(request.body),
                "formatting" to (request.format?.let { format ->
                    JsonObject(linkedMapOf("mode" to JsonString(format.wireName)))
                } ?: JsonNull),
                "attachments" to (request.attachments?.toNode() ?: JsonNull),
                "scheduledFor" to JsonString(request.scheduledFor),
            ),
        ),
    )

    fun gsnPost(request: GsnPostPublishRequest): ByteArray = encode(
        JsonObject(
            linkedMapOf(
                "identityId" to JsonString(request.identityId.value),
                "body" to JsonString(request.body),
                "imageAttachment" to JsonString(request.imageAttachment?.canonicalJson().orEmpty()),
                "signature" to JsonString(request.signatureHex()),
                "repostOfPostId" to JsonString(request.repostOfPostId?.value.orEmpty()),
                "timestamp" to JsonString(request.timestamp.toString()),
            ),
        ),
    )

    private fun JsonDocument.toNode(): JsonNode {
        val encoded = canonicalJson.encodeToByteArray()
        return try {
            StrictJson.parse(encoded)
        } catch (exception: RuntimeException) {
            throw GaiaApiPolicyException(exception)
        } finally {
            encoded.fill(0)
        }
    }

    private fun encode(node: JsonNode): ByteArray = try {
        StrictJson.document(node).canonicalJson.encodeToByteArray()
    } catch (exception: RuntimeException) {
        throw GaiaApiPolicyException(exception)
    }
}
