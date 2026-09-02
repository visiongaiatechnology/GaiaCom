// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

import de.gaiacom.platform.contracts.OutboundEnvelope
import de.gaiacom.platform.contracts.PeerId
import de.gaiacom.platform.contracts.TransportKind
import de.gaiacom.platform.contracts.TransportMask
import java.time.Instant
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class EmbeddedTransportOutboxTest {
    @Test
    fun copiesSensitiveMaterialAndCompletesOnlyOwnedLease() {
        val binding = RecordingTransportBinding()
        val outbox = EmbeddedTransportOutbox(binding)
        val now = Instant.parse("2026-07-17T14:00:00Z")
        val outbound = OutboundEnvelope(
            envelopeId = TEST_ID,
            recipient = PeerId("@peer:gaiacom.local"),
            payload = byteArrayOf(1, 2, 3),
            signature = byteArrayOf(4, 5, 6),
            allowedTransports = TransportMask(TransportMask.ALL_BITS),
            priority = 90,
            createdAt = now,
            expiresAt = now.plusSeconds(3600),
        )

        assertTrue(executeSuspending { outbox.enqueue(outbound) })
        assertTrue(binding.queuedPayload.all { it == 0.toByte() })
        assertTrue(binding.queuedSignature.all { it == 0.toByte() })

        val lease = requireNotNull(executeSuspending { outbox.claim(now) })
        assertContentEquals(byteArrayOf(1, 2, 3), lease.payloadCopy())
        executeSuspending { outbox.complete(lease, TransportKind.LOCAL_NETWORK, now.plusSeconds(1)) }
        assertEquals(TransportMask.LOCAL_NETWORK, binding.completedTransport)
        assertTrue(binding.lease.closed)
        assertFailsWith<IllegalStateException> { lease.payloadCopy() }
    }

    @Test
    fun rejectsLeaseFromDifferentOutboxBeforeNativeMutation() {
        val binding = RecordingTransportBinding()
        val first = EmbeddedTransportOutbox(binding)
        val second = EmbeddedTransportOutbox(binding)
        val now = Instant.parse("2026-07-17T15:00:00Z")
        val lease = requireNotNull(executeSuspending { first.claim(now) })

        assertFailsWith<IllegalArgumentException> {
            executeSuspending { second.complete(lease, TransportKind.BLUETOOTH, now) }
        }
        assertEquals(0, binding.completedTransport)
        lease.close()
    }
}

private class RecordingTransportBinding : NativeTransportSession {
    var queuedPayload = ByteArray(0)
    var queuedSignature = ByteArray(0)
    var completedTransport = 0
    val lease = RecordingNativeLease()

    override fun queueEnvelope(
        envelopeId: String,
        recipient: String,
        payload: ByteArray,
        signature: ByteArray,
        allowedTransports: Int,
        priority: Int,
        createdAtUnixMillis: Long,
        expiresAtUnixMillis: Long,
    ): Boolean {
        queuedPayload = payload
        queuedSignature = signature
        return true
    }

    override fun claimEnvelope(nowUnixMillis: Long): NativeTransportLease = lease

    override fun completeEnvelope(lease: NativeTransportLease, transport: Int, nowUnixMillis: Long) {
        completedTransport = transport
    }

    override fun deferEnvelope(
        lease: NativeTransportLease,
        reasonCode: String,
        deadLetter: Boolean,
        nowUnixMillis: Long,
    ) = Unit

    override fun claimInboundEnvelope(
        envelopeId: String,
        payloadHash: ByteArray,
        transport: Int,
        nowUnixMillis: Long,
        expiresAtUnixMillis: Long,
    ): Int = 1
}

private class RecordingNativeLease : NativeTransportLease {
    override val envelopeId = TEST_ID
    override val recipient = "@peer:gaiacom.local"
    override val allowedTransports = TransportMask.ALL_BITS
    override val attempts = 1
    var closed = false

    override fun payloadCopy(): ByteArray = byteArrayOf(1, 2, 3)

    override fun close() {
        closed = true
    }
}

private const val TEST_ID = "018f4d1e-7614-7a3a-8e37-61f0f75a0201"

private fun <T> executeSuspending(block: suspend () -> T): T {
    var outcome: Result<T>? = null
    block.startCoroutine(object : Continuation<T> {
        override val context = EmptyCoroutineContext
        override fun resumeWith(result: Result<T>) {
            outcome = result
        }
    })
    return requireNotNull(outcome).getOrThrow()
}
