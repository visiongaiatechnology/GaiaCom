// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

import de.gaiacom.nativecore.mobileapi.Mobileapi
import de.gaiacom.nativecore.mobileapi.Node
import de.gaiacom.nativecore.mobileapi.QueuedEnvelope
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

internal class GomobileNativeNodeBinding : NativeNodeBinding {
    override fun open(bootstrap: NativeBootstrap): NativeNodeSession {
        val nativeBootstrap = try {
            Mobileapi.newBootstrap(
                bootstrap.databasePath,
                bootstrap.storageRoot,
                bootstrap.serverName,
                bootstrap.serverPrivateKey,
                bootstrap.trustMeshEpochSecret,
                bootstrap.jwtSecret,
                bootstrap.shieldSecret,
                bootstrap.metricsToken,
            )
        } catch (exception: Exception) {
            throw NodeBridgeException("native bootstrap was rejected", exception)
        }
        return try {
            GomobileNodeSession(Mobileapi.openNode(nativeBootstrap))
        } catch (exception: Exception) {
            throw NodeBridgeException("native node initialization failed", exception)
        } finally {
            nativeBootstrap.close()
        }
    }
}

private class GomobileNodeSession(
    private val native: Node,
) : NativeNodeSession {
    private val closed = AtomicBoolean(false)

    override fun execute(
        method: String,
        path: String,
        headerNames: Array<String>,
        headerValues: Array<String>,
        body: ByteArray,
    ): NativeNodeResponse {
        ensureOpen()
        val headers = JSONObject()
        headerNames.indices.forEach { index -> headers.put(headerNames[index], headerValues[index]) }
        val response = try {
            native.execute(method, path, headers.toString(), body)
        } catch (exception: Exception) {
            throw NodeBridgeException("native node request failed", exception)
        }
        return try {
            val decodedHeaders = decodeHeaders(response.headersJSON())
            NativeNodeResponse(
                statusCode = checkedInt(response.statusCode(), "response status"),
                headerNames = decodedHeaders.first,
                headerValues = decodedHeaders.second,
                body = response.body(),
            )
        } finally {
            response.close()
        }
    }

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
        ensureOpen()
        return try {
            native.queueEnvelope(
                envelopeId,
                recipient,
                payload,
                signature,
                allowedTransports.toLong(),
                priority.toLong(),
                createdAtUnixMillis,
                expiresAtUnixMillis,
            )
        } catch (exception: Exception) {
            throw NodeBridgeException("native transport enqueue failed", exception)
        }
    }

    override fun claimEnvelope(nowUnixMillis: Long): NativeTransportLease? {
        ensureOpen()
        return try {
            native.claimEnvelope(nowUnixMillis)?.let { GomobileTransportLease(this, it) }
        } catch (exception: Exception) {
            throw NodeBridgeException("native transport claim failed", exception)
        }
    }

    override fun completeEnvelope(lease: NativeTransportLease, transport: Int, nowUnixMillis: Long) {
        ensureOpen()
        val owned = requireOwnedLease(lease)
        try {
            owned.withNative { nativeLease ->
                native.completeEnvelope(nativeLease, transport.toLong(), nowUnixMillis)
            }
        } catch (exception: Exception) {
            throw NodeBridgeException("native transport completion failed", exception)
        }
    }

    override fun deferEnvelope(
        lease: NativeTransportLease,
        reasonCode: String,
        deadLetter: Boolean,
        nowUnixMillis: Long,
    ) {
        ensureOpen()
        val owned = requireOwnedLease(lease)
        try {
            owned.withNative { nativeLease ->
                native.deferEnvelope(nativeLease, reasonCode, deadLetter, nowUnixMillis)
            }
        } catch (exception: Exception) {
            throw NodeBridgeException("native transport deferral failed", exception)
        }
    }

    override fun claimInboundEnvelope(
        envelopeId: String,
        payloadHash: ByteArray,
        transport: Int,
        nowUnixMillis: Long,
        expiresAtUnixMillis: Long,
    ): Int {
        ensureOpen()
        return try {
            checkedInt(
                native.claimInboundEnvelope(
                    envelopeId,
                    payloadHash,
                    transport.toLong(),
                    nowUnixMillis,
                    expiresAtUnixMillis,
                ),
                "inbound disposition",
            )
        } catch (exception: Exception) {
            throw NodeBridgeException("native inbound claim failed", exception)
        }
    }

    override fun close() {
        if (closed.compareAndSet(false, true)) {
            try {
                native.close()
            } catch (exception: Exception) {
                throw NodeBridgeException("native node shutdown failed", exception)
            }
        }
    }

    private fun requireOwnedLease(lease: NativeTransportLease): GomobileTransportLease {
        val owned = lease as? GomobileTransportLease
            ?: throw NodeBridgeException("native transport lease type is invalid")
        if (owned.owner !== this) {
            throw NodeBridgeException("native transport lease owner is invalid")
        }
        return owned
    }

    private fun ensureOpen() {
        check(!closed.get()) { "native node session is closed" }
    }

    private fun decodeHeaders(encoded: String): Pair<Array<String>, Array<String>> {
        val json = try {
            JSONObject(encoded)
        } catch (exception: Exception) {
            throw NodeBridgeException("native response headers are malformed", exception)
        }
        val names = json.keys().asSequence().toList().sorted()
        val values = names.map { name ->
            val value = json.get(name)
            value as? String ?: throw NodeBridgeException("native response header value is invalid")
        }
        return names.toTypedArray() to values.toTypedArray()
    }

    private fun checkedInt(value: Long, label: String): Int {
        if (value !in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong()) {
            throw NodeBridgeException("native $label is out of range")
        }
        return value.toInt()
    }
}

private class GomobileTransportLease(
    val owner: GomobileNodeSession,
    private val native: QueuedEnvelope,
) : NativeTransportLease {
    private val lock = ReentrantLock()
    private var closed = false

    override val envelopeId: String get() = lock.withLock { ensureOpen(); native.envelopeID() }
    override val recipient: String get() = lock.withLock { ensureOpen(); native.recipient() }
    override val allowedTransports: Int get() = lock.withLock {
        ensureOpen()
        val value = native.allowedTransports()
        if (value !in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong()) {
            throw NodeBridgeException("native transport mask is out of range")
        }
        value.toInt()
    }
    override val attempts: Int get() = lock.withLock {
        ensureOpen()
        val value = native.attempts()
        if (value !in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong()) {
            throw NodeBridgeException("native transport attempts are out of range")
        }
        value.toInt()
    }

    override fun payloadCopy(): ByteArray = lock.withLock { ensureOpen(); native.payload() }

    fun <T> withNative(operation: (QueuedEnvelope) -> T): T = lock.withLock {
        ensureOpen()
        operation(native)
    }

    override fun close() = lock.withLock {
        if (!closed) {
            closed = true
            native.close()
        }
    }

    private fun ensureOpen() {
        check(!closed) { "native transport lease is closed" }
    }
}
