// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.time.Instant

@ConsistentCopyVisibility
data class PublicChannel internal constructor(
    val id: ChannelId,
    val name: String,
    val description: String,
    val avatar: JsonDocument?,
    val createdBy: IdentityId,
    val createdAt: Instant,
    val updatedAt: Instant,
    val subscriberCount: Long,
    val subscribed: Boolean,
    val admin: Boolean,
    val suspended: Boolean,
    val suspensionReason: String,
    val verified: Boolean,
    val commentsEnabled: Boolean,
    val category: String,
    val blocked: Boolean,
)

@ConsistentCopyVisibility
data class PublicChannelPost internal constructor(
    val id: ChannelPostId,
    val channelId: ChannelId,
    val authorIdentityId: IdentityId,
    val body: String,
    val formatting: JsonDocument?,
    val attachments: JsonDocument?,
    val createdAt: Instant,
    val pinned: Boolean,
    val reactions: Map<String, Int>,
    val reactedByMe: Map<String, Boolean>,
    val commentCount: Int,
)

@ConsistentCopyVisibility
data class GsnPost internal constructor(
    val id: GsnPostId,
    val gaiaId: String,
    val displayName: String,
    val avatar: String,
    val nodeId: String,
    val timestamp: Instant,
    val body: String,
    val imageAttachment: String,
    val signature: String,
    val repostOfPostId: String,
    val verifiedOperator: Boolean,
    val verifiedGovernance: Boolean,
    val verifiedPassport: Boolean,
    val reactions: Map<String, Int>,
    val reactedByMe: Map<String, Boolean>,
    val commentCount: Int,
)
