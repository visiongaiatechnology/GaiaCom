// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.remote

import java.net.URI

data class RemoteServerConfig(
    val origin: URI = URI.create(PRODUCTION_ORIGIN),
) {
    init {
        require(origin.scheme == "https") { "remote GaiaCom origin must use HTTPS" }
        require(origin.userInfo == null && origin.query == null && origin.fragment == null) {
            "remote GaiaCom origin contains forbidden components"
        }
        require(origin.path.isNullOrEmpty() || origin.path == "/") { "remote GaiaCom origin must not contain a path" }
        require(origin.host?.isNotBlank() == true) { "remote GaiaCom origin has no host" }
        require(origin.port == -1 || origin.port == 443) { "remote GaiaCom origin uses a forbidden port" }
    }

    fun endpoint(path: String): URI {
        require(path.startsWith('/') && ".." !in path && "//" !in path) { "remote endpoint path is invalid" }
        return origin.resolve(path)
    }

    companion object {
        const val PRODUCTION_ORIGIN: String = "https://beta.gaiacom.de"
    }
}

enum class RemoteAuthFailure {
    INVALID_CREDENTIALS,
    RATE_LIMITED,
    NETWORK_UNAVAILABLE,
    TLS_REJECTED,
    SERVER_UNAVAILABLE,
    SESSION_EXPIRED,
    PROTOCOL_REJECTED,
}

class RemoteAuthException(
    val failure: RemoteAuthFailure,
    cause: Throwable? = null,
) : IllegalStateException("remote authentication failed: ${failure.name}", cause)

class RemoteAccountSession(
    val userId: String,
    val username: String,
    accessToken: ByteArray,
    refreshToken: ByteArray,
) : AutoCloseable {
    private val accessMaterial = accessToken.copyOf()
    private val refreshMaterial = refreshToken.copyOf()
    private var closed = false

    init {
        require(USER_ID.matches(userId)) { "remote user id is invalid" }
        require(username.length in 1..64) { "remote username is invalid" }
        require(accessMaterial.size in 16..MAX_TOKEN_BYTES) { "remote access token is invalid" }
        require(refreshMaterial.size in 16..MAX_TOKEN_BYTES) { "remote refresh token is invalid" }
    }

    @Synchronized
    fun accessTokenCopy(): ByteArray {
        check(!closed) { "remote session is closed" }
        return accessMaterial.copyOf()
    }

    @Synchronized
    fun refreshTokenCopy(): ByteArray {
        check(!closed) { "remote session is closed" }
        return refreshMaterial.copyOf()
    }

    @Synchronized
    override fun close() {
        if (!closed) {
            closed = true
            accessMaterial.fill(0)
            refreshMaterial.fill(0)
        }
    }

    companion object {
        const val MAX_TOKEN_BYTES: Int = 4_096
        private val USER_ID = Regex(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}",
        )
    }
}
