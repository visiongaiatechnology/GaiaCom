// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.contracts

import java.time.Instant
import java.util.UUID

@JvmInline
value class TransportMask(val bits: Int) {
    init {
        require(bits in 1..ALL_BITS && bits and ALL_BITS == bits) { "transport mask is invalid" }
    }

    operator fun contains(kind: TransportKind): Boolean = bits and kind.maskBit() != 0

    companion object {
        const val INTERNET = 1
        const val LOCAL_NETWORK = 2
        const val BLUETOOTH = 4
        const val ALL_BITS = INTERNET or LOCAL_NETWORK or BLUETOOTH
    }
}

class OutboundEnvelope(
    val envelopeId: String,
    val recipient: PeerId,
    payload: ByteArray,
    signature: ByteArray,
    val allowedTransports: TransportMask,
    val priority: Int,
    val createdAt: Instant,
    val expiresAt: Instant,
) {
    private val immutablePayload = payload.copyOf()
    private val immutableSignature = signature.copyOf()

    init {
        require(runCatching { UUID.fromString(envelopeId) }.isSuccess) { "envelope identity is invalid" }
        require(payload.isNotEmpty() && payload.size <= MAX_PAYLOAD_BYTES) { "transport payload is invalid" }
        require(signature.isNotEmpty() && signature.size <= MAX_SIGNATURE_BYTES) { "transport signature is invalid" }
        require(priority in 0..100) { "transport priority is invalid" }
        require(expiresAt.isAfter(createdAt) && !expiresAt.isAfter(createdAt.plusSeconds(MAX_RETENTION_SECONDS))) {
            "transport retention is invalid"
        }
    }

    fun payloadCopy(): ByteArray = immutablePayload.copyOf()

    fun signatureCopy(): ByteArray = immutableSignature.copyOf()

    companion object {
        private const val MAX_PAYLOAD_BYTES = 64 * 1024 * 1024
        private const val MAX_SIGNATURE_BYTES = 4096
        private const val MAX_RETENTION_SECONDS = 30L * 24L * 60L * 60L
    }
}

interface LeasedEnvelope : AutoCloseable {
    val envelopeId: String
    val recipient: PeerId
    val allowedTransports: TransportMask
    val attempts: Int

    fun payloadCopy(): ByteArray
}

enum class InboundDisposition {
    ACCEPTED,
    DUPLICATE,
}

interface TransportOutbox {
    suspend fun enqueue(envelope: OutboundEnvelope): Boolean

    suspend fun claim(now: Instant): LeasedEnvelope?

    suspend fun complete(lease: LeasedEnvelope, via: TransportKind, now: Instant)

    suspend fun defer(lease: LeasedEnvelope, reasonCode: String, deadLetter: Boolean, now: Instant)

    suspend fun claimInbound(
        envelopeId: String,
        payloadHash: ByteArray,
        via: TransportKind,
        now: Instant,
        expiresAt: Instant,
    ): InboundDisposition
}

fun TransportKind.maskBit(): Int = when (this) {
    TransportKind.INTERNET -> TransportMask.INTERNET
    TransportKind.LOCAL_NETWORK -> TransportMask.LOCAL_NETWORK
    TransportKind.BLUETOOTH -> TransportMask.BLUETOOTH
}
