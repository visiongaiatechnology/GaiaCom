// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.time.Instant

enum class MessageKind(internal val wireName: String) {
    ENCRYPTED("gaia.encrypted.v1"),
    SYSTEM("system"),
    LEGACY_SMTP("smtp.legacy"),
}

sealed interface MessagePayload {
    @ConsistentCopyVisibility
    data class Encrypted internal constructor(val envelope: EncryptedEnvelope) : MessagePayload

    @ConsistentCopyVisibility
    data class SystemNotice internal constructor(
        val subject: String,
        val body: String,
    ) : MessagePayload

    @ConsistentCopyVisibility
    data class LegacySmtp internal constructor(
        val direction: LegacyMailDirection,
        val subject: String,
        val body: String,
        val attachments: JsonDocument?,
    ) : MessagePayload
}

enum class EncryptionSuite(val wireName: String) {
    STANDARD("GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM"),
    TOP_SECRET("GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87"),
}

@ConsistentCopyVisibility
data class EnvelopeSignatures internal constructor(
    val ed25519Hex: String,
    val mlDsa87Hex: String?,
    val mlDsa87PublicHex: String?,
)

@ConsistentCopyVisibility
data class EncryptedEnvelope internal constructor(
    val suite: EncryptionSuite,
    val kemCiphertextHex: String,
    val ephemeralPublicHex: String,
    val payloadCiphertextHex: String,
    val ivHex: String,
    val signatures: EnvelopeSignatures,
    val clientMessageId: MessageId,
    val timestampEpochMillis: Long,
    val recipientDeviceKeyId: String,
    val recipientDeviceBoxPublicHex: String,
    val canonicalEnvelope: JsonDocument,
)

enum class LegacyMailDirection {
    INBOUND,
    OUTBOUND,
}

@ConsistentCopyVisibility
data class MailboxState internal constructor(
    val folder: String,
    val read: Boolean,
    val starred: Boolean,
    val important: Boolean,
    val spam: Boolean,
    val archived: Boolean,
    val labels: List<String>,
    val snoozedUntil: Instant?,
)

@ConsistentCopyVisibility
data class MessageEnvelope internal constructor(
    val id: MessageId,
    val kind: MessageKind,
    val sender: String,
    val recipient: String,
    val payload: MessagePayload,
    val signature: String?,
    val senderIdentityId: IdentityId?,
    val channelId: String?,
    val clientMessageId: String?,
    val createdAt: Instant,
    val editedAt: Instant?,
    val untrusted: Boolean,
    val read: Boolean,
    val delivered: Boolean,
    val reactions: Map<String, Int>,
    val reactedByMe: Map<String, Boolean>,
    val mailbox: MailboxState?,
)

enum class MailFolder(val wireName: String) {
    INBOX("inbox"),
    SENT("sent"),
    ARCHIVE("archive"),
    SPAM("spam"),
    TRASH("trash"),
    SNOOZED("snoozed"),
}

data class MailboxQuery(
    val folder: MailFolder? = null,
    val text: String = "",
    val from: String = "",
    val subject: String = "",
    val label: String = "",
    val unread: Boolean = false,
    val starred: Boolean = false,
    val important: Boolean = false,
    val limit: Int = 100,
) {
    init {
        require(text.length <= 128 && from.length <= 254 && subject.length <= 256 && label.length <= 64) {
            "mailbox filter exceeded its local boundary"
        }
        require(listOf(text, from, subject, label).none { value -> value.any(Char::isISOControl) }) {
            "mailbox filter contains control characters"
        }
        require(limit in 1..200) { "mailbox limit is outside policy" }
    }
}
