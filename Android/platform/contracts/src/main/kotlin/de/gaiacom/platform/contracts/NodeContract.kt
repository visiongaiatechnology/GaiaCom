// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.contracts

import java.net.URI

enum class NodeMethod {
    GET,
    POST,
    PUT,
    DELETE,
    OPTIONS,
}

class NodeRequest private constructor(
    val method: NodeMethod,
    val path: String,
    val headers: Map<String, String>,
    body: ByteArray,
) {
    private val immutableBody = body.copyOf()

    fun bodyCopy(): ByteArray = immutableBody.copyOf()

    companion object {
        private const val MAX_BODY_BYTES = 64 * 1024 * 1024
        private val allowedHeaders = setOf(
            "Authorization",
            "Content-Type",
            "Cookie",
            "X-Gaia-Pairing-Secret",
            "X-Gaia-S2S-V1",
        )

        fun create(
            method: NodeMethod,
            path: String,
            headers: Map<String, String> = emptyMap(),
            body: ByteArray = byteArrayOf(),
        ): NodeRequest {
            require(body.size <= MAX_BODY_BYTES) { "node request exceeds bridge limit" }
            val uri = runCatching { URI(path) }.getOrElse { throw IllegalArgumentException("node path is invalid") }
            val escapedPath = uri.rawPath.orEmpty().lowercase()
            require(!uri.isAbsolute && uri.host == null && uri.fragment == null) { "absolute node paths are forbidden" }
            require(uri.path?.startsWith('/') == true) { "node path must be rooted" }
            require(".." !in uri.path && "//" !in uri.path && "%2f" !in escapedPath) { "node path violates normalization" }
            val sanitizedHeaders = headers.mapKeys { (key, _) -> canonicalHeader(key) }
            sanitizedHeaders.forEach { (key, value) ->
                require(key in allowedHeaders) { "node header is not allowed" }
                require('\r' !in value && '\n' !in value) { "node header contains a line break" }
            }
            return NodeRequest(method, uri.toASCIIString(), sanitizedHeaders.toMap(), body)
        }

        private fun canonicalHeader(value: String): String = value
            .trim()
            .lowercase()
            .split('-')
            .joinToString("-") { part -> part.replaceFirstChar(Char::uppercaseChar) }
    }
}

class NodeResponse(
    val statusCode: Int,
    val headers: Map<String, List<String>>,
    body: ByteArray,
) {
    private val immutableBody = body.copyOf()

    init {
        require(statusCode in 100..599) { "node response status is invalid" }
    }

    fun bodyCopy(): ByteArray = immutableBody.copyOf()
}

interface NodeGateway : AutoCloseable {
    suspend fun execute(request: NodeRequest): NodeResponse
}
