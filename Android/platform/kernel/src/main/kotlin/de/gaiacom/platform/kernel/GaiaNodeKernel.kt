// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.kernel

import de.gaiacom.platform.contracts.GaiaTransport
import de.gaiacom.platform.contracts.NodeGateway
import de.gaiacom.platform.contracts.NodeRequest
import de.gaiacom.platform.contracts.NodeResponse
import de.gaiacom.platform.contracts.TransportFrame
import de.gaiacom.platform.contracts.TransportResult
import de.gaiacom.platform.contracts.TransportState
import java.util.concurrent.atomic.AtomicBoolean

class GaiaNodeKernel(
    private val node: NodeGateway,
    transports: Collection<GaiaTransport>,
) : AutoCloseable {
    private val closed = AtomicBoolean(false)
    private val orderedTransports = transports
        .sortedWith(compareByDescending<GaiaTransport> { it.priority }.thenBy { it.kind.name })
        .also { values ->
            require(values.map { it.kind }.distinct().size == values.size) { "transport kinds must be unique" }
        }

    suspend fun start() {
        ensureOpen()
        orderedTransports.forEach { transport ->
            if (transport.state == TransportState.STOPPED) {
                transport.start()
            }
        }
    }

    suspend fun execute(request: NodeRequest): NodeResponse {
        ensureOpen()
        return node.execute(request)
    }

    suspend fun dispatch(frame: TransportFrame): TransportResult {
        ensureOpen()
        val reasons = mutableListOf<String>()
        for (transport in orderedTransports) {
            if (transport.state !in setOf(TransportState.AVAILABLE, TransportState.DEGRADED)) {
                continue
            }
            when (val result = transport.send(frame)) {
                is TransportResult.Delivered -> return result
                is TransportResult.Deferred -> reasons += "${transport.kind}:${result.reason.take(96)}"
            }
        }
        val reason = reasons.joinToString(separator = ";").ifBlank { "no authenticated transport available" }
        return TransportResult.Deferred(reason.take(256))
    }

    suspend fun stop() {
        if (!closed.compareAndSet(false, true)) {
            return
        }
        orderedTransports.asReversed().forEach { transport ->
            runCatching { transport.stop() }
        }
        orderedTransports.asReversed().forEach { transport ->
            runCatching { transport.close() }
        }
        node.close()
    }

    override fun close() {
        if (closed.compareAndSet(false, true)) {
            orderedTransports.asReversed().forEach { transport -> runCatching { transport.close() } }
            node.close()
        }
    }

    private fun ensureOpen() {
        check(!closed.get()) { "Gaia node kernel is closed" }
    }
}
