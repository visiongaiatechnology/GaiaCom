// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

import de.gaiacom.platform.contracts.NodeGateway
import de.gaiacom.platform.contracts.NodeRequest
import de.gaiacom.platform.contracts.NodeResponse
import de.gaiacom.platform.contracts.TransportOutbox
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

class EmbeddedNodeGateway private constructor(
    private val session: NativeNodeSession,
) : NodeGateway {
    private val lifecycleLock = ReentrantReadWriteLock()
    private var closed = false
    val transportOutbox: TransportOutbox = EmbeddedTransportOutbox(session)

    override suspend fun execute(request: NodeRequest): NodeResponse = lifecycleLock.read {
        check(!closed) { "embedded node gateway is closed" }
        request.bodyCopy().let { body ->
            val nativeResponse = try {
                session.execute(
                    request.method.name,
                    request.path,
                    request.headers.keys.toTypedArray(),
                    request.headers.values.toTypedArray(),
                    body,
                )
            } finally {
                body.fill(0)
            }
            validateResponse(nativeResponse)
        }
    }

    override fun close() {
        lifecycleLock.write {
            if (closed) {
                return
            }
            closed = true
            session.close()
        }
    }

    companion object {
        private const val MAX_RESPONSE_BYTES = 128 * 1024 * 1024
        private const val MAX_HEADER_COUNT = 128
        private const val MAX_HEADER_VALUE_CHARS = 16 * 1024

        fun open(bootstrap: EmbeddedNodeBootstrap): EmbeddedNodeGateway =
            open(bootstrap, GomobileNativeNodeBinding())

        internal fun open(
            bootstrap: EmbeddedNodeBootstrap,
            binding: NativeNodeBinding,
        ): EmbeddedNodeGateway {
            val session = try {
                bootstrap.consume { nativeBootstrap ->
                    try {
                        binding.open(nativeBootstrap)
                    } finally {
                        nativeBootstrap.wipe()
                    }
                }
            } finally {
                bootstrap.close()
            }
            return EmbeddedNodeGateway(session)
        }

        private fun validateResponse(response: NativeNodeResponse): NodeResponse {
            if (response.statusCode !in 100..599) {
                response.body.fill(0)
                throw NodeBridgeException("native node returned an invalid status")
            }
            if (response.body.size > MAX_RESPONSE_BYTES) {
                response.body.fill(0)
                throw NodeBridgeException("native node response exceeded the bridge limit")
            }
            if (response.headerNames.size != response.headerValues.size ||
                response.headerNames.size > MAX_HEADER_COUNT
            ) {
                response.body.fill(0)
                throw NodeBridgeException("native node returned malformed headers")
            }
            val headers = linkedMapOf<String, MutableList<String>>()
            response.headerNames.indices.forEach { index ->
                val name = response.headerNames[index]
                val value = response.headerValues[index]
                if (!HEADER_NAME.matches(name) || value.length > MAX_HEADER_VALUE_CHARS ||
                    '\r' in value || '\n' in value
                ) {
                    response.body.fill(0)
                    throw NodeBridgeException("native node returned an unsafe header")
                }
                headers.getOrPut(name) { mutableListOf() }.add(value)
            }
            return try {
                NodeResponse(response.statusCode, headers.mapValues { it.value.toList() }, response.body)
            } finally {
                response.body.fill(0)
            }
        }

        private val HEADER_NAME = Regex("[A-Za-z0-9!#$%&'*+.^_`|~-]{1,128}")
    }
}

class NodeBridgeException(message: String, cause: Throwable? = null) : IllegalStateException(message, cause)
