// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.contracts

enum class TransportKind {
    INTERNET,
    LOCAL_NETWORK,
    BLUETOOTH,
}

enum class TransportCapability {
    FEDERATION,
    PEER_DISCOVERY,
    STORE_AND_FORWARD,
    LARGE_PAYLOAD,
}

enum class TransportState {
    STOPPED,
    STARTING,
    AVAILABLE,
    DEGRADED,
    UNAVAILABLE,
}

@JvmInline
value class PeerId(val value: String) {
    init {
        require(value.matches(Regex("^[A-Za-z0-9@._:-]{3,253}$"))) { "peer identity is invalid" }
    }
}

class TransportFrame(
    val envelopeId: String,
    val recipient: PeerId,
    payload: ByteArray,
) {
    private val immutablePayload = payload.copyOf()

    init {
        require(envelopeId.matches(Regex("^[0-9a-fA-F-]{36}$"))) { "envelope identity is invalid" }
        require(payload.isNotEmpty() && payload.size <= 64 * 1024 * 1024) { "transport payload is invalid" }
    }

    fun payloadCopy(): ByteArray = immutablePayload.copyOf()
}

sealed interface TransportResult {
    data class Delivered(val transport: TransportKind) : TransportResult
    data class Deferred(val reason: String) : TransportResult
}

interface GaiaTransport : AutoCloseable {
    val kind: TransportKind
    val priority: Int
    val capabilities: Set<TransportCapability>
    val state: TransportState

    suspend fun start()
    suspend fun send(frame: TransportFrame): TransportResult
    suspend fun stop()
}
