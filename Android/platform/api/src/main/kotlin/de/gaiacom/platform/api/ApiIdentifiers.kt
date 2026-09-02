// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

private val UUID_PATTERN = Regex("[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")
private val OPAQUE_ID_PATTERN = Regex("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")

internal fun requireUuid(value: String): String {
    require(UUID_PATTERN.matches(value)) { "identifier is not a canonical UUID" }
    return value
}

internal fun requireOpaqueId(value: String): String {
    require(OPAQUE_ID_PATTERN.matches(value)) { "identifier contains forbidden characters" }
    return value
}

@JvmInline
value class UserId internal constructor(val value: String) {
    init {
        requireUuid(value)
    }
}

@JvmInline
value class IdentityId internal constructor(val value: String) {
    init {
        requireUuid(value)
    }
}

@JvmInline
value class MessageId internal constructor(val value: String) {
    init {
        requireUuid(value)
    }
}

@JvmInline
value class DeviceKeyId internal constructor(val value: String) {
    init {
        requireUuid(value)
    }
}

@JvmInline
value class ChannelId internal constructor(val value: String) {
    init {
        requireUuid(value)
    }
}

@JvmInline
value class ChannelPostId internal constructor(val value: String) {
    init {
        requireUuid(value)
    }
}

@JvmInline
value class GsnPostId internal constructor(val value: String) {
    init {
        requireOpaqueId(value)
    }
}

@ConsistentCopyVisibility
data class JsonDocument internal constructor(val canonicalJson: String) {
    init {
        require(canonicalJson.length in 2..MAX_DOCUMENT_CHARS) { "JSON document size is invalid" }
    }

    companion object {
        fun parseUtf8(jsonUtf8: ByteArray): JsonDocument = try {
            StrictJson.document(StrictJson.parse(jsonUtf8))
        } catch (exception: RuntimeException) {
            throw GaiaApiPolicyException(exception)
        }

        const val MAX_DOCUMENT_CHARS = 1_048_576
    }
}
