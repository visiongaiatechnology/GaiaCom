// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.io.IOException
import java.io.InputStream
import java.net.SocketTimeoutException
import java.net.URI
import java.net.UnknownHostException
import java.nio.charset.StandardCharsets
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLException

internal fun interface HttpsConnectionFactory {
    fun open(uri: URI): HttpsURLConnection
}

internal enum class JsonWriteMethod(val wireName: String) {
    POST("POST"),
    PATCH("PATCH"),
}

internal class SecureHttpTransport(
    private val connectionFactory: HttpsConnectionFactory = HttpsConnectionFactory { uri ->
        uri.toURL().openConnection() as HttpsURLConnection
    },
) {
    fun get(
        uri: URI,
        bearerToken: ByteArray?,
        maximumResponseBytes: Int,
        acceptedStatuses: Set<Int> = setOf(200),
    ): SecureHttpResponse = execute(
        uri = uri,
        method = "GET",
        bearerToken = bearerToken,
        requestBody = null,
        maximumResponseBytes = maximumResponseBytes,
        acceptedStatuses = acceptedStatuses,
    )

    fun sendJson(
        uri: URI,
        method: JsonWriteMethod,
        bearerToken: ByteArray,
        requestBody: ByteArray,
        maximumRequestBytes: Int,
        maximumResponseBytes: Int,
        acceptedStatuses: Set<Int>,
    ): SecureHttpResponse {
        if (maximumRequestBytes !in 2..ABSOLUTE_MAX_REQUEST_BYTES ||
            requestBody.size !in 2..maximumRequestBytes
        ) {
            throw GaiaApiPolicyException()
        }
        val bodyCopy = requestBody.copyOf()
        return try {
            try {
                StrictJson.parse(bodyCopy)
            } catch (exception: RuntimeException) {
                throw GaiaApiPolicyException(exception)
            }
            execute(
                uri = uri,
                method = method.wireName,
                bearerToken = bearerToken,
                requestBody = bodyCopy,
                maximumResponseBytes = maximumResponseBytes,
                acceptedStatuses = acceptedStatuses,
            )
        } finally {
            bodyCopy.fill(0)
        }
    }

    private fun execute(
        uri: URI,
        method: String,
        bearerToken: ByteArray?,
        requestBody: ByteArray?,
        maximumResponseBytes: Int,
        acceptedStatuses: Set<Int>,
    ): SecureHttpResponse {
        GaiaApiUrlPolicy.assertAllowed(uri)
        if (maximumResponseBytes !in 1..ABSOLUTE_MAX_RESPONSE_BYTES || acceptedStatuses.isEmpty()) {
            throw GaiaApiPolicyException()
        }
        val connection = try {
            connectionFactory.open(uri)
        } catch (exception: SSLException) {
            throw GaiaApiTlsException(exception)
        } catch (exception: SocketTimeoutException) {
            throw GaiaApiTimeoutException(exception)
        } catch (exception: UnknownHostException) {
            throw GaiaApiNetworkException(exception)
        } catch (exception: IOException) {
            throw GaiaApiNetworkException(exception)
        }
        try {
            configure(connection, method, bearerToken, requestBody)
            if (requestBody != null) {
                connection.outputStream.use { output ->
                    output.write(requestBody)
                    output.flush()
                }
            }
            val status = connection.responseCode
            if (status in 300..399) throw GaiaApiProtocolException()
            if (status !in acceptedStatuses) throw statusFailure(status)
            validateContentType(connection.contentType)
            val contentEncoding = connection.contentEncoding
            if (contentEncoding != null && !contentEncoding.equals("identity", ignoreCase = true)) {
                throw GaiaApiProtocolException()
            }
            val declaredLength = connection.contentLengthLong
            if (declaredLength > maximumResponseBytes) throw GaiaApiResponseTooLargeException()
            if (declaredLength < -1L) throw GaiaApiProtocolException()
            val responseStream = if (status >= 400) connection.errorStream else connection.inputStream
            val body = readBounded(responseStream ?: throw GaiaApiProtocolException(), maximumResponseBytes)
            return SecureHttpResponse(status, body)
        } catch (exception: GaiaApiException) {
            throw exception
        } catch (exception: SSLException) {
            throw GaiaApiTlsException(exception)
        } catch (exception: SocketTimeoutException) {
            throw GaiaApiTimeoutException(exception)
        } catch (exception: UnknownHostException) {
            throw GaiaApiNetworkException(exception)
        } catch (exception: IOException) {
            throw GaiaApiNetworkException(exception)
        } finally {
            connection.disconnect()
        }
    }

    private fun configure(
        connection: HttpsURLConnection,
        method: String,
        bearerToken: ByteArray?,
        requestBody: ByteArray?,
    ) {
        connection.requestMethod = method
        connection.instanceFollowRedirects = false
        connection.connectTimeout = CONNECT_TIMEOUT_MS
        connection.readTimeout = READ_TIMEOUT_MS
        connection.doInput = true
        connection.doOutput = requestBody != null
        connection.useCaches = false
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Accept-Encoding", "identity")
        connection.setRequestProperty("Cache-Control", "no-store")
        connection.setRequestProperty("User-Agent", USER_AGENT)
        if (requestBody != null) {
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            connection.setFixedLengthStreamingMode(requestBody.size)
        }
        if (bearerToken != null) {
            val tokenCopy = bearerToken.copyOf()
            try {
                validateBearerToken(tokenCopy)
                connection.setRequestProperty(
                    "Authorization",
                    "Bearer ${tokenCopy.toString(StandardCharsets.US_ASCII)}",
                )
            } finally {
                tokenCopy.fill(0)
            }
        }
    }

    private fun validateContentType(contentType: String?) {
        val segments = contentType?.split(';') ?: throw GaiaApiProtocolException()
        if (segments.firstOrNull()?.trim()?.lowercase() != "application/json") throw GaiaApiProtocolException()
        var charsetSeen = false
        segments.drop(1).forEach { segment ->
            val parameter = segment.split('=', limit = 2)
            if (parameter.size != 2 || parameter[0].isBlank() || parameter[1].isBlank()) {
                throw GaiaApiProtocolException()
            }
            if (!parameter[0].trim().equals("charset", ignoreCase = true)) return@forEach
            if (charsetSeen || !parameter[1].trim().trim('"').equals("utf-8", ignoreCase = true)) {
                throw GaiaApiProtocolException()
            }
            charsetSeen = true
        }
    }

    private fun statusFailure(status: Int): GaiaApiException = when (status) {
        401, 403 -> GaiaApiAuthenticationException()
        429 -> GaiaApiRateLimitException()
        in 400..499 -> GaiaApiRequestRejectedException()
        in 500..599 -> GaiaApiServerException()
        else -> GaiaApiProtocolException()
    }

    companion object {
        const val ABSOLUTE_MAX_REQUEST_BYTES: Int = 4 * 1_024 * 1_024
        const val ABSOLUTE_MAX_RESPONSE_BYTES: Int = 4 * 1_024 * 1_024
        private const val CONNECT_TIMEOUT_MS = 10_000
        private const val READ_TIMEOUT_MS = 15_000
        private const val USER_AGENT = "GaiaCom-Android/0.1"
    }
}

internal data class SecureHttpResponse(
    val statusCode: Int,
    val body: ByteArray,
) : AutoCloseable {
    override fun close() {
        body.fill(0)
    }
}

internal fun validateBearerToken(token: ByteArray) {
    if (token.size !in 16..4_096 || token.any { byte ->
            val character = (byte.toInt() and 0xff).toChar()
            character !in TOKEN_CHARACTERS
        }
    ) {
        throw GaiaApiPolicyException()
    }
}

internal fun readBounded(input: InputStream, maximumBytes: Int): ByteArray {
    if (maximumBytes !in 1..SecureHttpTransport.ABSOLUTE_MAX_RESPONSE_BYTES) throw GaiaApiPolicyException()
    return input.use { stream ->
        val buffer = ByteArray(8_192)
        var collected = ByteArray(minOf(maximumBytes, 16_384))
        var size = 0
        try {
            while (true) {
                val count = stream.read(buffer)
                if (count < 0) break
                if (count == 0) continue
                if (size > maximumBytes - count) throw GaiaApiResponseTooLargeException()
                val requiredSize = size + count
                if (requiredSize > collected.size) {
                    val nextSize = minOf(maximumBytes, maxOf(requiredSize, collected.size * 2))
                    val replacement = ByteArray(nextSize)
                    collected.copyInto(replacement, endIndex = size)
                    collected.fill(0)
                    collected = replacement
                }
                buffer.copyInto(collected, destinationOffset = size, endIndex = count)
                size = requiredSize
            }
            collected.copyOf(size)
        } finally {
            buffer.fill(0)
            collected.fill(0)
        }
    }
}

private val TOKEN_CHARACTERS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._~-".toSet()
