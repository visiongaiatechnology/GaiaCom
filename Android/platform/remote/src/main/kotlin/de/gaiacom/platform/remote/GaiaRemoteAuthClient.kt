// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.remote

import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.nio.charset.StandardCharsets
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLException
import org.json.JSONException
import org.json.JSONObject

class GaiaRemoteAuthClient(
    private val config: RemoteServerConfig = RemoteServerConfig(),
) {
    fun login(username: String, password: String): RemoteAccountSession {
        val normalizedUsername = username.trim()
        if (normalizedUsername.length !in 1..64 || password.length !in 1..512) {
            throw RemoteAuthException(RemoteAuthFailure.INVALID_CREDENTIALS)
        }
        val payload = JSONObject()
            .put("username", normalizedUsername)
            .put("password", password)
            .toString()
            .toByteArray(StandardCharsets.UTF_8)
        return try {
            request("/api/v1/auth/login", payload).use { response ->
                parseSession(response, normalizedUsername, RemoteAuthFailure.INVALID_CREDENTIALS)
            }
        } finally {
            payload.fill(0)
        }
    }

    fun refresh(username: String, refreshToken: ByteArray): RemoteAccountSession {
        validateToken(refreshToken)
        val tokenText = refreshToken.toString(StandardCharsets.UTF_8)
        val payload = JSONObject()
            .put("refreshToken", tokenText)
            .toString()
            .toByteArray(StandardCharsets.UTF_8)
        return try {
            request("/api/v1/auth/refresh", payload).use { response ->
                parseSession(response, username, RemoteAuthFailure.SESSION_EXPIRED)
            }
        } finally {
            payload.fill(0)
        }
    }

    fun logout(session: RemoteAccountSession) {
        val accessToken = session.accessTokenCopy()
        try {
            request(
                path = "/api/v1/auth/logout",
                body = EMPTY_JSON,
                bearerToken = accessToken,
                acceptedStatuses = setOf(200, 204, 401),
            ).close()
        } finally {
            accessToken.fill(0)
        }
    }

    private fun parseSession(
        response: RemoteResponse,
        username: String,
        unauthorizedFailure: RemoteAuthFailure,
    ): RemoteAccountSession {
        when (response.statusCode) {
            200 -> Unit
            401 -> throw RemoteAuthException(unauthorizedFailure)
            429 -> throw RemoteAuthException(RemoteAuthFailure.RATE_LIMITED)
            in 500..599 -> throw RemoteAuthException(RemoteAuthFailure.SERVER_UNAVAILABLE)
            else -> throw RemoteAuthException(RemoteAuthFailure.PROTOCOL_REJECTED)
        }
        var access = byteArrayOf()
        var refresh = byteArrayOf()
        try {
            val json = JSONObject(response.body.toString(StandardCharsets.UTF_8))
            if (json.getString("token_type") != TOKEN_TYPE) {
                throw RemoteAuthException(RemoteAuthFailure.PROTOCOL_REJECTED)
            }
            val userId = json.getString("user_id")
            access = json.getString("access_token").toByteArray(StandardCharsets.UTF_8)
            refresh = json.getString("refresh_token").toByteArray(StandardCharsets.UTF_8)
            validateToken(access)
            validateToken(refresh)
            return RemoteAccountSession(userId, username.trim(), access, refresh)
        } catch (exception: JSONException) {
            throw RemoteAuthException(RemoteAuthFailure.PROTOCOL_REJECTED, exception)
        } finally {
            access.fill(0)
            refresh.fill(0)
        }
    }

    private fun request(
        path: String,
        body: ByteArray,
        bearerToken: ByteArray? = null,
        acceptedStatuses: Set<Int> = emptySet(),
    ): RemoteResponse {
        require(body.size <= MAX_REQUEST_BYTES) { "remote request exceeds size boundary" }
        val connection = config.endpoint(path).toURL().openConnection() as HttpsURLConnection
        try {
            connection.requestMethod = "POST"
            connection.instanceFollowRedirects = false
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS
            connection.doOutput = true
            connection.useCaches = false
            connection.setFixedLengthStreamingMode(body.size)
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Accept-Encoding", "identity")
            connection.setRequestProperty("Cache-Control", "no-store")
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            connection.setRequestProperty("User-Agent", USER_AGENT)
            connection.setRequestProperty(NATIVE_CLIENT_HEADER, NATIVE_CLIENT_ID)
            if (bearerToken != null) {
                validateToken(bearerToken)
                connection.setRequestProperty(
                    "Authorization",
                    "Bearer ${bearerToken.toString(StandardCharsets.UTF_8)}",
                )
            }
            connection.outputStream.use { it.write(body) }
            val statusCode = connection.responseCode
            val responseBody = readBounded(
                if (statusCode >= 400) connection.errorStream else connection.inputStream,
            )
            if (acceptedStatuses.isNotEmpty() && statusCode !in acceptedStatuses) {
                responseBody.fill(0)
                throw statusFailure(statusCode)
            }
            return RemoteResponse(statusCode = statusCode, body = responseBody)
        } catch (exception: RemoteAuthException) {
            throw exception
        } catch (exception: SSLException) {
            throw RemoteAuthException(RemoteAuthFailure.TLS_REJECTED, exception)
        } catch (exception: SocketTimeoutException) {
            throw RemoteAuthException(RemoteAuthFailure.NETWORK_UNAVAILABLE, exception)
        } catch (exception: UnknownHostException) {
            throw RemoteAuthException(RemoteAuthFailure.NETWORK_UNAVAILABLE, exception)
        } catch (exception: IOException) {
            throw RemoteAuthException(RemoteAuthFailure.NETWORK_UNAVAILABLE, exception)
        } finally {
            connection.disconnect()
        }
    }

    private fun readBounded(stream: InputStream?): ByteArray {
        if (stream == null) return byteArrayOf()
        return stream.use { input ->
            val output = ByteArrayOutputStream()
            val buffer = ByteArray(8_192)
            try {
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    if (output.size() + count > MAX_RESPONSE_BYTES) {
                        throw RemoteAuthException(RemoteAuthFailure.PROTOCOL_REJECTED)
                    }
                    output.write(buffer, 0, count)
                }
                output.toByteArray()
            } finally {
                buffer.fill(0)
            }
        }
    }

    private fun validateToken(token: ByteArray) {
        if (token.size !in 16..RemoteAccountSession.MAX_TOKEN_BYTES ||
            token.any { it.toInt().toChar() !in TOKEN_CHARACTERS }
        ) {
            throw RemoteAuthException(RemoteAuthFailure.PROTOCOL_REJECTED)
        }
    }

    private fun statusFailure(status: Int): RemoteAuthException = when (status) {
        401 -> RemoteAuthException(RemoteAuthFailure.SESSION_EXPIRED)
        429 -> RemoteAuthException(RemoteAuthFailure.RATE_LIMITED)
        in 500..599 -> RemoteAuthException(RemoteAuthFailure.SERVER_UNAVAILABLE)
        else -> RemoteAuthException(RemoteAuthFailure.PROTOCOL_REJECTED)
    }

    private data class RemoteResponse(
        val statusCode: Int,
        val body: ByteArray,
    ) : AutoCloseable {
        override fun close() = body.fill(0)
    }

    companion object {
        private const val NATIVE_CLIENT_HEADER = "X-Gaia-Client"
        private const val NATIVE_CLIENT_ID = "android-native-v1"
        private const val TOKEN_TYPE = "Bearer"
        private const val CONNECT_TIMEOUT_MS = 10_000
        private const val READ_TIMEOUT_MS = 15_000
        private const val MAX_REQUEST_BYTES = 16 * 1_024
        private const val MAX_RESPONSE_BYTES = 64 * 1_024
        private const val USER_AGENT = "GaiaCom-Android/0.1 (Native)"
        private val EMPTY_JSON = "{}".encodeToByteArray()
        private val TOKEN_CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._~-".toSet()
    }
}
