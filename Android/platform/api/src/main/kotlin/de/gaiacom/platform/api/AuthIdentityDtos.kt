// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.time.Instant

sealed interface AccountAuthStatus {
    data object Unauthenticated : AccountAuthStatus

    @ConsistentCopyVisibility
    data class Authenticated internal constructor(
        val userId: UserId,
        val username: String,
        val allowAnonymousStats: Boolean,
    ) : AccountAuthStatus
}

@ConsistentCopyVisibility
data class IdentityPublicKeys internal constructor(
    val ed25519Hex: String,
    val x25519Hex: String,
    val mlKem1024Hex: String,
    val mlDsa87Hex: String?,
)

@ConsistentCopyVisibility
data class GaiaIdentity internal constructor(
    val id: IdentityId,
    val userId: UserId,
    val gaiaId: String,
    val displayName: String,
    val publicRecord: JsonDocument?,
    val publicKeys: IdentityPublicKeys?,
    val active: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

sealed interface PublicIdentityResult {
    val gaiaId: String

    @ConsistentCopyVisibility
    data class Found internal constructor(
        val id: IdentityId,
        override val gaiaId: String,
        val displayName: String,
        val publicRecord: JsonDocument,
        val publicKeys: IdentityPublicKeys,
    ) : PublicIdentityResult

    @ConsistentCopyVisibility
    data class NotFound internal constructor(
        override val gaiaId: String,
    ) : PublicIdentityResult
}

enum class DeviceKeyStatus(internal val wireName: String) {
    ACTIVE("active"),
}

@ConsistentCopyVisibility
data class RecipientDeviceKey internal constructor(
    val id: DeviceKeyId,
    val identityId: IdentityId,
    val boxPublicHex: String,
    val mlKem1024PublicHex: String,
    val ed25519PublicHex: String,
    val status: DeviceKeyStatus,
)
