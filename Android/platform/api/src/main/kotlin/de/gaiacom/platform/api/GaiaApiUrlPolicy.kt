// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.net.URI

internal enum class ApiEndpoint(
    val path: String,
    val allowedQueryKeys: Set<String> = emptySet(),
    val acceptsPathSegment: Boolean = false,
) {
    AUTH_STATUS("/api/v1/auth/status"),
    IDENTITIES("/api/v1/identity/me"),
    PUBLIC_IDENTITY("/api/v1/public/identity/", acceptsPathSegment = true),
    RECIPIENT_DEVICE_KEYS("/api/v1/devices/recipient-keys", setOf("identityId")),
    CHAT_SEND("/api/v1/messaging/send"),
    CHAT_INBOX("/api/v1/messaging/inbox", setOf("identityId")),
    CHAT_READ("/api/v1/messaging/read"),
    MAIL_MESSAGES(
        "/api/v1/mailbox/messages",
        setOf("identityId", "folder", "q", "from", "subject", "label", "unread", "starred", "important", "limit"),
    ),
    CHANNELS("/api/v1/public-channels"),
    CHANNEL_POSTS("/api/v1/public-channels/posts", setOf("channelId", "identityId", "limit")),
    CHANNEL_POST_CREATE("/api/v1/public-channels/posts/create"),
    GSN_POST_CREATE("/api/v1/gsn/posts"),
    GSN_NODE_FEED("/api/v1/gsn/feed/node", setOf("node_id")),
    GSN_FOLLOWING_FEED("/api/v1/gsn/feed/following"),
}

internal object GaiaApiUrlPolicy {
    const val PRODUCTION_ORIGIN: String = "https://beta.gaiacom.de"
    private const val MAX_URL_CHARS = 2_048
    private const val MAX_QUERY_VALUE_BYTES = 512
    private val unreserved = (('a'..'z') + ('A'..'Z') + ('0'..'9') + listOf('-', '.', '_', '~')).toSet()

    fun build(endpoint: ApiEndpoint, parameters: List<Pair<String, String>> = emptyList()): URI {
        if (endpoint.acceptsPathSegment) throw GaiaApiPolicyException()
        if (parameters.size > endpoint.allowedQueryKeys.size || parameters.map(Pair<String, String>::first).toSet().size != parameters.size) {
            throw GaiaApiPolicyException()
        }
        val query = parameters.joinToString("&") { (key, value) ->
            if (key !in endpoint.allowedQueryKeys || value.isEmpty()) throw GaiaApiPolicyException()
            "$key=${percentEncode(value)}"
        }
        val uriText = buildString {
            append(PRODUCTION_ORIGIN)
            append(endpoint.path)
            if (query.isNotEmpty()) {
                append('?')
                append(query)
            }
        }
        if (uriText.length > MAX_URL_CHARS) throw GaiaApiPolicyException()
        return URI.create(uriText).also { assertAllowed(it, endpoint) }
    }

    fun buildWithPathSegment(endpoint: ApiEndpoint, segment: String): URI {
        if (!endpoint.acceptsPathSegment || segment.isEmpty()) throw GaiaApiPolicyException()
        val uriText = PRODUCTION_ORIGIN + endpoint.path + percentEncode(segment)
        if (uriText.length > MAX_URL_CHARS) throw GaiaApiPolicyException()
        return URI.create(uriText).also { assertAllowed(it, endpoint) }
    }

    fun assertAllowed(uri: URI, endpoint: ApiEndpoint? = null) {
        val matchingEndpoints = ApiEndpoint.entries.filter { candidate -> pathMatches(candidate, uri.path) }
        val expectedPathMatches = endpoint == null || pathMatches(endpoint, uri.path)
        if (uri.scheme != "https" || uri.host != "beta.gaiacom.de" ||
            (uri.port != -1 && uri.port != 443) || uri.userInfo != null || uri.fragment != null ||
            matchingEndpoints.size != 1 || !expectedPathMatches
        ) {
            throw GaiaApiPolicyException()
        }
    }

    private fun pathMatches(endpoint: ApiEndpoint, path: String): Boolean = if (endpoint.acceptsPathSegment) {
        path.startsWith(endpoint.path) && path.length > endpoint.path.length &&
            '/' !in path.substring(endpoint.path.length)
    } else {
        path == endpoint.path
    }

    private fun percentEncode(value: String): String {
        val bytes = value.encodeToByteArray()
        if (bytes.size !in 1..MAX_QUERY_VALUE_BYTES || value.any(Char::isISOControl)) {
            bytes.fill(0)
            throw GaiaApiPolicyException()
        }
        return try {
            buildString(bytes.size) {
                bytes.forEach { rawByte ->
                    val unsigned = rawByte.toInt() and 0xff
                    val character = unsigned.toChar()
                    if (character in unreserved) {
                        append(character)
                    } else {
                        append('%')
                        append(HEX[unsigned ushr 4])
                        append(HEX[unsigned and 0x0f])
                    }
                }
            }
        } finally {
            bytes.fill(0)
        }
    }

    private const val HEX = "0123456789ABCDEF"
}
