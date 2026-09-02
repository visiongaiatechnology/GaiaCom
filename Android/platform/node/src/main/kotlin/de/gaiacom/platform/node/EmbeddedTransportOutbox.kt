// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

import de.gaiacom.platform.contracts.InboundDisposition
import de.gaiacom.platform.contracts.LeasedEnvelope
import de.gaiacom.platform.contracts.OutboundEnvelope
import de.gaiacom.platform.contracts.PeerId
import de.gaiacom.platform.contracts.TransportKind
import de.gaiacom.platform.contracts.TransportMask
import de.gaiacom.platform.contracts.TransportOutbox
import de.gaiacom.platform.contracts.maskBit
import java.time.Instant
import java.util.UUID
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

internal class EmbeddedTransportOutbox(
    private val session: NativeTransportSession,
) : TransportOutbox {
    override suspend fun enqueue(envelope: OutboundEnvelope): Boolean {
        val payload = envelope.payloadCopy()
        val signature = envelope.signatureCopy()
        return try {
            session.queueEnvelope(
                envelope.envelopeId,
                envelope.recipient.value,
                payload,
                signature,
                envelope.allowedTransports.bits,
                envelope.priority,
                envelope.createdAt.toEpochMilli(),
                envelope.expiresAt.toEpochMilli(),
            )
        } finally {
            payload.fill(0)
            signature.fill(0)
        }
    }

    override suspend fun claim(now: Instant): LeasedEnvelope? {
        val nativeLease = session.claimEnvelope(now.toEpochMilli()) ?: return null
        return try {
            ValidatedLease(nativeLease)
        } catch (failure: RuntimeException) {
            nativeLease.close()
            throw failure
        }
    }

    override suspend fun complete(lease: LeasedEnvelope, via: TransportKind, now: Instant) {
        val validated = requireOwnedLease(lease)
        validated.mutateAndClose { native ->
            session.completeEnvelope(native, via.maskBit(), now.toEpochMilli())
        }
    }

    override suspend fun defer(lease: LeasedEnvelope, reasonCode: String, deadLetter: Boolean, now: Instant) {
        require(REASON_CODE.matches(reasonCode)) { "transport reason code is invalid" }
        val validated = requireOwnedLease(lease)
        validated.mutateAndClose { native ->
            session.deferEnvelope(native, reasonCode, deadLetter, now.toEpochMilli())
        }
    }

    override suspend fun claimInbound(
        envelopeId: String,
        payloadHash: ByteArray,
        via: TransportKind,
        now: Instant,
        expiresAt: Instant,
    ): InboundDisposition {
        require(runCatching { UUID.fromString(envelopeId) }.isSuccess) { "envelope identity is invalid" }
        require(payloadHash.size == SHA256_BYTES) { "payload hash is invalid" }
        val hashCopy = payloadHash.copyOf()
        return try {
            when (
                session.claimInboundEnvelope(
                    envelopeId,
                    hashCopy,
                    via.maskBit(),
                    now.toEpochMilli(),
                    expiresAt.toEpochMilli(),
                )
            ) {
                1 -> InboundDisposition.ACCEPTED
                2 -> InboundDisposition.DUPLICATE
                else -> throw NodeBridgeException("native node returned an invalid inbound disposition")
            }
        } finally {
            hashCopy.fill(0)
        }
    }

    private fun requireOwnedLease(lease: LeasedEnvelope): ValidatedLease {
        val validated = lease as? ValidatedLease
            ?: throw IllegalArgumentException("transport lease belongs to another outbox")
        require(validated.owner === this) { "transport lease belongs to another outbox" }
        return validated
    }

    private inner class ValidatedLease(
        private val native: NativeTransportLease,
    ) : LeasedEnvelope {
        val owner: EmbeddedTransportOutbox = this@EmbeddedTransportOutbox
        private val lock = ReentrantLock()
        private var closed = false
        override val envelopeId = native.envelopeId.also {
            require(runCatching { UUID.fromString(it) }.isSuccess) { "native envelope identity is invalid" }
        }
        override val recipient = PeerId(native.recipient)
        override val allowedTransports = TransportMask(native.allowedTransports)
        override val attempts = native.attempts.also { require(it in 1..MAX_ATTEMPTS) { "native attempts are invalid" } }

        override fun payloadCopy(): ByteArray = lock.withLock {
            check(!closed) { "transport lease is closed" }
            native.payloadCopy().also {
                require(it.isNotEmpty() && it.size <= MAX_PAYLOAD_BYTES) { "native payload is invalid" }
            }
        }

        fun mutateAndClose(operation: (NativeTransportLease) -> Unit) = lock.withLock {
            check(!closed) { "transport lease is closed" }
            try {
                operation(native)
            } finally {
                closed = true
                native.close()
            }
        }

        override fun close() = lock.withLock {
            if (!closed) {
                closed = true
                native.close()
            }
        }
    }

    companion object {
        private const val SHA256_BYTES = 32
        private const val MAX_ATTEMPTS = 12
        private const val MAX_PAYLOAD_BYTES = 64 * 1024 * 1024
        private val REASON_CODE = Regex("[a-z0-9_-]{1,64}")
    }
}
