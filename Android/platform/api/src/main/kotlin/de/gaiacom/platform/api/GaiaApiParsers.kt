// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.util.Collections

internal object GaiaApiParsers {
    fun authStatus(body: ByteArray, statusCode: Int): AccountAuthStatus = safely {
        val root = StrictJson.parse(body).requireObject()
        when (root.requiredString("status", maximumLength = 32)) {
            "unauthenticated" -> {
                if (statusCode != 401 && statusCode != 200) throw JsonSyntaxException()
                AccountAuthStatus.Unauthenticated
            }
            "authenticated" -> {
                if (statusCode != 200) throw JsonSyntaxException()
                val userId = UserId(root.requiredUuidString("user_id"))
                val username = root.requiredSingleLine("username", maximumLength = 64)
                val allowStats = root.requiredBoolean("allowAnonymousStats")
                root.optionalObject("user")?.let { nested ->
                    if (nested.requiredUuidString("id") != userId.value ||
                        nested.requiredSingleLine("username", maximumLength = 64) != username ||
                        nested.requiredBoolean("allowAnonymousStats") != allowStats
                    ) {
                        throw JsonSyntaxException()
                    }
                }
                AccountAuthStatus.Authenticated(userId, username, allowStats)
            }
            else -> throw JsonSyntaxException()
        }
    }

    fun identities(body: ByteArray): List<GaiaIdentity> = safely {
        StrictJson.parse(body).requireArray().boundedMap(MAX_IDENTITIES) { node ->
            val source = node.requireObject()
            val publicRecord = source.optionalObject("PublicRecord", "publicRecord")
            GaiaIdentity(
                id = IdentityId(source.requiredUuidString("ID", "id")),
                userId = UserId(source.requiredUuidString("UserID", "userId")),
                gaiaId = source.requiredGaiaId("GaiaID", "gaiaId"),
                displayName = source.displayString("DisplayName", "displayName", maximumLength = 128),
                publicRecord = publicRecord?.let(StrictJson::document),
                publicKeys = publicRecord?.let(::parseIdentityPublicKeys),
                active = source.requiredBoolean("IsActive", "isActive"),
                createdAt = source.requiredInstant("CreatedAt", "createdAt"),
                updatedAt = source.requiredInstant("UpdatedAt", "updatedAt"),
            )
        }
    }

    fun publicIdentity(body: ByteArray, expectedGaiaId: String): PublicIdentityResult = safely {
        requireGaiaId(expectedGaiaId)
        val source = StrictJson.parse(body).requireObject()
        val gaiaIdLower = (source.fields["gaiaId"] as? JsonString)?.value
        val gaiaIdUpper = (source.fields["gaiaID"] as? JsonString)?.value
        val gaiaId = gaiaIdLower ?: gaiaIdUpper ?: throw JsonSyntaxException()
        if (gaiaIdLower != null && gaiaIdUpper != null && gaiaIdLower != gaiaIdUpper) throw JsonSyntaxException()
        requireGaiaId(gaiaId)
        if (!gaiaId.equals(expectedGaiaId, ignoreCase = true)) throw JsonSyntaxException()
        val id = source.optionalString("id", maximumLength = 36).orEmpty()
        val publicRecordText = source.optionalString("publicRecord", maximumLength = JsonDocument.MAX_DOCUMENT_CHARS)
        val found = source.fields["found"]?.let { node -> (node as? JsonBoolean)?.value ?: throw JsonSyntaxException() }
        if (id.isEmpty()) {
            if (publicRecordText != null || found != false) throw JsonSyntaxException()
            return@safely PublicIdentityResult.NotFound(gaiaId)
        }
        if (found == false || publicRecordText.isNullOrEmpty()) throw JsonSyntaxException()
        val publicRecordBytes = publicRecordText.encodeToByteArray()
        try {
            val publicRecord = StrictJson.parse(publicRecordBytes).requireObject()
            PublicIdentityResult.Found(
                id = IdentityId(requireUuid(id)),
                gaiaId = gaiaId,
                displayName = source.displayString("displayName", maximumLength = 128),
                publicRecord = StrictJson.document(publicRecord),
                publicKeys = parseIdentityPublicKeys(publicRecord),
            )
        } finally {
            publicRecordBytes.fill(0)
        }
    }

    fun recipientDeviceKeys(body: ByteArray, expectedIdentityId: IdentityId): List<RecipientDeviceKey> = safely {
        val keys = StrictJson.parse(body).requireObject().requiredArray("keys")
        val seenIds = HashSet<String>()
        keys.boundedMap(MAX_DEVICE_KEYS) { node ->
            val source = node.requireObject()
            val id = source.requiredUuidString("id")
            val identityId = source.requiredUuidString("identityId")
            if (identityId != expectedIdentityId.value || !seenIds.add(id) ||
                source.requiredSingleLine("status", maximumLength = 16) != DeviceKeyStatus.ACTIVE.wireName
            ) {
                throw JsonSyntaxException()
            }
            RecipientDeviceKey(
                id = DeviceKeyId(id),
                identityId = IdentityId(identityId),
                boxPublicHex = source.requiredHex("boxPublic", minimumChars = X25519_PUBLIC_HEX, maximumChars = X25519_PUBLIC_HEX),
                mlKem1024PublicHex = source.requiredHex("kemPublic", minimumChars = ML_KEM_1024_PUBLIC_HEX, maximumChars = ML_KEM_1024_PUBLIC_HEX),
                ed25519PublicHex = source.requiredHex("signPublic", minimumChars = ED25519_PUBLIC_HEX, maximumChars = ED25519_PUBLIC_HEX),
                status = DeviceKeyStatus.ACTIVE,
            )
        }
    }

    fun messages(body: ByteArray, mailboxRequired: Boolean): List<MessageEnvelope> = safely {
        StrictJson.parse(body).requireArray().boundedMap(MAX_MESSAGES) { parseMessage(it.requireObject(), mailboxRequired) }
    }

    fun channels(body: ByteArray): List<PublicChannel> = safely {
        val channels = StrictJson.parse(body).requireObject().requiredArray("channels")
        channels.boundedMap(MAX_CHANNELS) { node ->
            val source = node.requireObject()
            PublicChannel(
                id = ChannelId(source.requiredUuidString("id", "ID")),
                name = source.displayString("name", "Name", maximumLength = 128),
                description = source.displayString("description", "Description", maximumLength = 4_096),
                avatar = source.optionalDocument("avatar", "Avatar"),
                createdBy = IdentityId(source.requiredUuidString("createdBy", "CreatedBy")),
                createdAt = source.requiredInstant("createdAt", "CreatedAt"),
                updatedAt = source.requiredInstant("updatedAt", "UpdatedAt"),
                subscriberCount = source.requiredLong(0L..1_000_000_000L, "subscriberCount", "SubscriberCount"),
                subscribed = source.requiredBoolean("isSubscribed", "IsSubscribed"),
                admin = source.requiredBoolean("isAdmin", "IsAdmin"),
                suspended = source.requiredBoolean("isSuspended", "IsSuspended"),
                suspensionReason = source.displayString("suspensionReason", "SuspensionReason", maximumLength = 512),
                verified = source.requiredBoolean("isVerified", "IsVerified"),
                commentsEnabled = source.requiredBoolean("commentsEnabled", "CommentsEnabled"),
                category = source.displayString("category", "Category", maximumLength = 64),
                blocked = source.requiredBoolean("isBlocked", "IsBlocked"),
            )
        }
    }

    fun channelPosts(body: ByteArray): List<PublicChannelPost> = safely {
        val posts = StrictJson.parse(body).requireObject().requiredArray("posts")
        posts.boundedMap(MAX_POSTS) { node -> parseChannelPost(node.requireObject()) }
    }

    fun channelPost(body: ByteArray): PublicChannelPost = safely {
        parseChannelPost(StrictJson.parse(body).requireObject())
    }

    fun gsnFeed(body: ByteArray): List<GsnPost> = safely {
        val root = StrictJson.parse(body)
        if (root === JsonNull) return@safely emptyList()
        root.requireArray().boundedMap(MAX_POSTS) { node -> parseGsnPost(node.requireObject()) }
    }

    fun gsnPost(body: ByteArray): GsnPost = safely { parseGsnPost(StrictJson.parse(body).requireObject()) }

    fun messageSendReceipt(body: ByteArray): MessageSendReceipt = safely {
        val source = StrictJson.parse(body).requireObject()
        if (source.requiredSingleLine("status", maximumLength = 16) != "sent") throw JsonSyntaxException()
        MessageSendReceipt(MessageId(source.requiredUuidString("messageId")))
    }

    fun readAcknowledgement(body: ByteArray) = safely {
        if (StrictJson.parse(body).requireObject().requiredSingleLine("status", maximumLength = 16) != "read") {
            throw JsonSyntaxException()
        }
    }

    private fun parseChannelPost(source: JsonObject): PublicChannelPost {
        val reactionState = source.optionalObject("reactionState", "ReactionState")
        val comments = source.optionalArray("comments", "Comments")
        if (comments != null && comments.values.size > MAX_COMMENTS_PER_POST) throw JsonSyntaxException()
        return PublicChannelPost(
            id = ChannelPostId(source.requiredUuidString("id", "ID")),
            channelId = ChannelId(source.requiredUuidString("channelId", "ChannelID")),
            authorIdentityId = IdentityId(source.requiredUuidString("authorIdentityId", "AuthorIdentityID")),
            body = source.requiredString("body", "Body", minimumLength = 0, maximumLength = 100_000),
            formatting = source.optionalDocument("formatting", "Formatting"),
            attachments = source.optionalDocument("attachments", "Attachments"),
            createdAt = source.requiredInstant("createdAt", "CreatedAt"),
            pinned = source.requiredBoolean("isPinned", "IsPinned"),
            reactions = reactionState?.intMap(MAX_REACTIONS, "reactions", "Reactions") ?: emptyMap(),
            reactedByMe = reactionState?.booleanMap(MAX_REACTIONS, "reactedByMe", "ReactedByMe") ?: emptyMap(),
            commentCount = comments?.values?.size ?: 0,
        )
    }

    private fun parseGsnPost(source: JsonObject): GsnPost = GsnPost(
        id = GsnPostId(source.requiredOpaqueId("id", "ID")),
        gaiaId = source.requiredGaiaId("gaiaId", "GaiaID"),
        displayName = source.displayString("displayName", "DisplayName", maximumLength = 128),
        avatar = source.displayString("avatar", "Avatar", maximumLength = 262_144),
        nodeId = source.requiredNodeName("nodeId", "NodeID"),
        timestamp = source.requiredInstant("timestamp", "Timestamp"),
        body = source.requiredString("body", "Body", minimumLength = 0, maximumLength = 100_000),
        imageAttachment = source.displayString("imageAttachment", "ImageAttachment", maximumLength = 524_288),
        signature = source.requiredSingleLine("signature", "Signature", maximumLength = 65_536),
        repostOfPostId = source.displayString("repostOfPostId", "RepostOfPostID", maximumLength = 128),
        verifiedOperator = source.requiredBoolean("isVerifiedOperator", "IsVerifiedOperator"),
        verifiedGovernance = source.requiredBoolean("isVerifiedGovernance", "IsVerifiedGovernance"),
        verifiedPassport = source.requiredBoolean("isVerifiedPassport", "IsVerifiedPassport"),
        reactions = source.intMap(MAX_REACTIONS, "reactions", "Reactions"),
        reactedByMe = source.booleanMap(MAX_REACTIONS, "reactedByMe", "ReactedByMe"),
        commentCount = source.optionalInt(0, 0..1_000_000, "commentCount", "CommentCount"),
    )

    private fun parseMessage(source: JsonObject, mailboxRequired: Boolean): MessageEnvelope {
        val id = MessageId(source.requiredUuidString("ID", "id"))
        val kind = source.requiredMessageKind("Type", "type")
        val sender = source.requiredSingleLine("Sender", "sender", maximumLength = 320)
        val recipient = source.requiredSingleLine("Recipient", "recipient", maximumLength = 320)
        if (kind == MessageKind.ENCRYPTED) {
            requireGaiaId(sender)
            requireGaiaId(recipient)
        }
        val signature = source.optionalSingleLine("Signature", "signature", maximumLength = 65_536)
        if (kind == MessageKind.ENCRYPTED && signature.isNullOrEmpty()) throw JsonSyntaxException()
        val payloadNode = source.requiredObject("Payload", "payload")
        val payload = parseMessagePayload(kind, payloadNode, signature)
        val mailboxNode = source.optionalObject("mailbox", "Mailbox")
        if (mailboxRequired && mailboxNode == null) throw JsonSyntaxException()
        return MessageEnvelope(
            id = id,
            kind = kind,
            sender = sender,
            recipient = recipient,
            payload = payload,
            signature = signature?.ifEmpty { null },
            senderIdentityId = source.optionalUuid("senderIdentityId", "SenderIdentityID")?.let(::IdentityId),
            channelId = source.optionalString("channelId", "ChannelID", maximumLength = 128)?.ifEmpty { null },
            clientMessageId = source.optionalString("clientMessageId", "ClientMessageID", maximumLength = 128)?.ifEmpty { null },
            createdAt = source.requiredInstant("CreatedAt", "createdAt"),
            editedAt = source.optionalInstant("editedAt", "EditedAt"),
            untrusted = kind == MessageKind.LEGACY_SMTP || source.optionalBoolean(false, "untrusted", "Untrusted"),
            read = source.optionalBoolean(false, "isRead", "IsRead"),
            delivered = source.optionalBoolean(false, "delivered", "Delivered"),
            reactions = source.intMap(MAX_REACTIONS, "reactions", "Reactions"),
            reactedByMe = source.booleanMap(MAX_REACTIONS, "reactedByMe", "ReactedByMe"),
            mailbox = mailboxNode?.let { parseMailbox(it, id) },
        )
    }

    private fun parseMessagePayload(
        kind: MessageKind,
        source: JsonObject,
        storedSignature: String?,
    ): MessagePayload = when (kind) {
        MessageKind.ENCRYPTED -> MessagePayload.Encrypted(parseEncryptedEnvelope(source, storedSignature))
        MessageKind.SYSTEM -> {
            if (source.requiredSingleLine("type", maximumLength = 32) != "system") throw JsonSyntaxException()
            source.optionalInstant("createdAt")
            MessagePayload.SystemNotice(
                subject = source.requiredString("subject", minimumLength = 0, maximumLength = 512),
                body = source.requiredString("body", minimumLength = 0, maximumLength = 100_000),
            )
        }
        MessageKind.LEGACY_SMTP -> {
            if (source.requiredSingleLine("type", maximumLength = 32) != "smtp.legacy") throw JsonSyntaxException()
            val direction = when (source.requiredSingleLine("direction", maximumLength = 16)) {
                "inbound" -> LegacyMailDirection.INBOUND
                "outbound" -> LegacyMailDirection.OUTBOUND
                else -> throw JsonSyntaxException()
            }
            val security = source.requiredObject("security")
            if (security.requiredSingleLine("transport", maximumLength = 32) != "legacy-smtp" ||
                security.requiredBoolean("endToEndEncrypted") ||
                !security.requiredBoolean("untrusted")
            ) {
                throw JsonSyntaxException()
            }
            MessagePayload.LegacySmtp(
                direction = direction,
                subject = source.requiredString("subject", minimumLength = 0, maximumLength = 512),
                body = source.requiredString("body", minimumLength = 0, maximumLength = 100_000),
                attachments = source.optionalDocument("attachments"),
            )
        }
    }

    private fun parseEncryptedEnvelope(source: JsonObject, storedSignature: String?): EncryptedEnvelope {
        val suiteValue = source.requiredSingleLine("algorithm_suite", maximumLength = 128)
        val suite = EncryptionSuite.entries.singleOrNull { it.wireName == suiteValue } ?: throw JsonSyntaxException()
        val signature = source.requiredHex("signature", minimumChars = 128, maximumChars = 128)
        val normalizedStoredSignature = storedSignature?.let { value -> normalizeHex(value, 128, 128) }
        if (normalizedStoredSignature != signature) throw JsonSyntaxException()
        val signatureBundle = source.requiredObject("signature_bundle")
        val bundleEd25519 = signatureBundle.requiredHex("ed25519", minimumChars = 128, maximumChars = 128)
        if (bundleEd25519 != signature) throw JsonSyntaxException()
        val mlDsaSignature = signatureBundle.optionalHex("ml_dsa_87", maximumChars = ML_DSA_87_SIGNATURE_HEX)
        val mlDsaPublic = signatureBundle.optionalHex("ml_dsa_87_public", maximumChars = ML_DSA_87_PUBLIC_HEX)
        val legacyMlDsaPublic = source.optionalHex("sender_mldsa87_public", maximumChars = ML_DSA_87_PUBLIC_HEX)
        when (suite) {
            EncryptionSuite.STANDARD -> if (mlDsaSignature != null || mlDsaPublic != null || legacyMlDsaPublic != null) {
                throw JsonSyntaxException()
            }
            EncryptionSuite.TOP_SECRET -> {
                if (mlDsaSignature?.length != ML_DSA_87_SIGNATURE_HEX ||
                    mlDsaPublic?.length != ML_DSA_87_PUBLIC_HEX ||
                    legacyMlDsaPublic?.length != ML_DSA_87_PUBLIC_HEX
                ) {
                    throw JsonSyntaxException()
                }
            }
        }
        if (legacyMlDsaPublic != null && legacyMlDsaPublic != mlDsaPublic) throw JsonSyntaxException()
        val recipientDeviceKeyId = source.optionalSingleLine("recipient_device_key_id", maximumLength = 36).orEmpty()
        if (recipientDeviceKeyId.isNotEmpty()) requireUuid(recipientDeviceKeyId)
        return EncryptedEnvelope(
            suite = suite,
            kemCiphertextHex = source.requiredHex("kem_ciphertext", minimumChars = 3_136, maximumChars = 3_136),
            ephemeralPublicHex = source.requiredHex("ephemeral_pub", minimumChars = 64, maximumChars = 64),
            payloadCiphertextHex = source.requiredHex(
                "payload_ciphertext",
                minimumChars = 32,
                maximumChars = 2_097_152,
            ),
            ivHex = source.requiredHex("iv", minimumChars = 24, maximumChars = 24),
            signatures = EnvelopeSignatures(bundleEd25519, mlDsaSignature, mlDsaPublic),
            clientMessageId = MessageId(source.requiredUuidString("client_message_id")),
            timestampEpochMillis = source.requiredLong(1_577_836_800_000L..4_102_444_800_000L, "timestamp"),
            recipientDeviceKeyId = recipientDeviceKeyId,
            recipientDeviceBoxPublicHex = source.requiredHex(
                "recipient_device_box_public",
                minimumChars = 64,
                maximumChars = 64,
            ),
            canonicalEnvelope = StrictJson.document(source),
        )
    }

    private fun parseMailbox(source: JsonObject, envelopeId: MessageId): MailboxState {
        UserId(source.requiredUuidString("userId", "UserID"))
        IdentityId(source.requiredUuidString("identityId", "IdentityID"))
        if (source.requiredUuidString("messageId", "MessageID") != envelopeId.value) throw JsonSyntaxException()
        val folder = source.requiredString("folder", "Folder", maximumLength = 32)
        if (!MAIL_FOLDER.matches(folder)) throw JsonSyntaxException()
        return MailboxState(
            folder = folder,
            read = source.requiredBoolean("isRead", "IsRead"),
            starred = source.requiredBoolean("isStarred", "IsStarred"),
            important = source.requiredBoolean("isImportant", "IsImportant"),
            spam = source.requiredBoolean("isSpam", "IsSpam"),
            archived = source.requiredBoolean("isArchived", "IsArchived"),
            labels = source.stringList(32, "labels", "Labels"),
            snoozedUntil = source.optionalInstant("snoozedUntil", "SnoozedUntil"),
        )
    }

    private fun parseIdentityPublicKeys(publicRecord: JsonObject): IdentityPublicKeys {
        val publicKeys = publicRecord.requiredObject("public_keys")
        return IdentityPublicKeys(
            ed25519Hex = publicKeys.requiredHex("identity", minimumChars = ED25519_PUBLIC_HEX, maximumChars = ED25519_PUBLIC_HEX),
            x25519Hex = publicKeys.requiredHex("box", minimumChars = X25519_PUBLIC_HEX, maximumChars = X25519_PUBLIC_HEX),
            mlKem1024Hex = publicKeys.requiredHex("pke", minimumChars = ML_KEM_1024_PUBLIC_HEX, maximumChars = ML_KEM_1024_PUBLIC_HEX),
            mlDsa87Hex = publicKeys.optionalHex("mldsa87", maximumChars = ML_DSA_87_PUBLIC_HEX)?.also { value ->
                if (value.length != ML_DSA_87_PUBLIC_HEX) throw JsonSyntaxException()
            },
        )
    }

    private inline fun <T> safely(block: () -> T): T = try {
        block()
    } catch (exception: GaiaApiException) {
        throw exception
    } catch (exception: RuntimeException) {
        throw GaiaApiParseException(exception)
    }

    private fun <T> JsonArray.boundedMap(maximum: Int, transform: (JsonNode) -> T): List<T> {
        if (values.size > maximum) throw JsonSyntaxException()
        return Collections.unmodifiableList(ArrayList(values.map(transform)))
    }

    private const val MAX_IDENTITIES = 32
    private const val MAX_DEVICE_KEYS = 128
    private const val MAX_MESSAGES = 1_000
    private const val MAX_CHANNELS = 256
    private const val MAX_POSTS = 500
    private const val MAX_COMMENTS_PER_POST = 500
    private const val MAX_REACTIONS = 64
    private const val ED25519_PUBLIC_HEX = 64
    private const val X25519_PUBLIC_HEX = 64
    private const val ML_KEM_1024_PUBLIC_HEX = 3_136
    private const val ML_DSA_87_PUBLIC_HEX = 5_184
    private const val ML_DSA_87_SIGNATURE_HEX = 9_254
    private val MAIL_FOLDER = Regex("[a-z][a-z0-9_-]{0,31}")
}

private fun JsonObject.requiredUuidString(vararg aliases: String): String =
    requireUuid(requiredString(*aliases, maximumLength = 36))

private fun JsonObject.optionalUuid(vararg aliases: String): String? {
    val value = optionalString(*aliases, maximumLength = 36) ?: return null
    if (value.isEmpty() || value == "00000000-0000-0000-0000-000000000000") return null
    return requireUuid(value)
}

private fun JsonObject.requiredOpaqueId(vararg aliases: String): String =
    requireOpaqueId(requiredString(*aliases, maximumLength = 128))

private fun JsonObject.requiredGaiaId(vararg aliases: String): String =
    requireGaiaId(requiredString(*aliases, maximumLength = 320))

private fun JsonObject.requiredNodeName(vararg aliases: String): String {
    val value = requiredString(*aliases, maximumLength = 253)
    if (!NODE_NAME.matches(value) || value.startsWith('.') || value.endsWith('.')) throw JsonSyntaxException()
    return value
}

private fun JsonObject.requiredMessageKind(vararg aliases: String): MessageKind {
    val value = requiredString(*aliases, maximumLength = 64)
    return MessageKind.entries.singleOrNull { it.wireName == value } ?: throw JsonSyntaxException()
}

private fun JsonObject.requiredHex(
    vararg aliases: String,
    minimumChars: Int,
    maximumChars: Int,
): String = normalizeHex(
    requiredSingleLine(*aliases, maximumLength = maximumChars),
    minimumChars,
    maximumChars,
)

private fun JsonObject.optionalHex(vararg aliases: String, maximumChars: Int): String? {
    val value = optionalSingleLine(*aliases, maximumLength = maximumChars) ?: return null
    if (value.isEmpty()) return null
    return normalizeHex(value, minimumChars = 2, maximumChars = maximumChars)
}

private fun normalizeHex(value: String, minimumChars: Int, maximumChars: Int): String {
    if (value.length !in minimumChars..maximumChars || value.length % 2 != 0 || value.any { character ->
            character !in '0'..'9' && character !in 'a'..'f' && character !in 'A'..'F'
        }
    ) {
        throw JsonSyntaxException()
    }
    return value.lowercase()
}

internal fun requireGaiaId(value: String): String {
    val match = GAIA_ID.matchEntire(value) ?: throw JsonSyntaxException()
    if (match.groupValues[1].length !in 3..64 || match.groupValues[2].length !in 3..253) throw JsonSyntaxException()
    return value
}

private val GAIA_ID = Regex("@([A-Za-z0-9._-]+):([A-Za-z0-9.-]+)")
private val NODE_NAME = Regex("[A-Za-z0-9.-]{3,253}")
