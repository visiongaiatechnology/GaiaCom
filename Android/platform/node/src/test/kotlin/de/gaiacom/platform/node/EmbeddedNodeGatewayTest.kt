// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

import de.gaiacom.platform.contracts.NodeMethod
import de.gaiacom.platform.contracts.NodeRequest
import java.nio.file.Path
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class EmbeddedNodeGatewayTest {
    @Test
    fun executesThroughSingleNativeHandleAndClosesOnce() {
        val binding = RecordingBinding()
        val gateway = EmbeddedNodeGateway.open(bootstrap(), binding)
        val response = runSuspend {
            gateway.execute(NodeRequest.create(NodeMethod.POST, "/api/v1/test", body = byteArrayOf(7, 8)))
        }
        assertEquals(204, response.statusCode)
        assertContentEquals(byteArrayOf(9, 10), response.bodyCopy())
        assertEquals(1, binding.session.executeCount)
        gateway.close()
        gateway.close()
        assertEquals(1, binding.closeCount)
    }

    @Test
    fun rejectsMalformedNativeResponse() {
        val binding = RecordingBinding(
            NativeNodeResponse(200, arrayOf("Unsafe Header"), arrayOf("value"), byteArrayOf(1)),
        )
        val gateway = EmbeddedNodeGateway.open(bootstrap(), binding)
        assertFailsWith<NodeBridgeException> {
            runSuspend { gateway.execute(NodeRequest.create(NodeMethod.GET, "/api/v1/test")) }
        }
        gateway.close()
    }

    @Test
    fun bootstrapSecretsAreWipedAfterOpen() {
        val binding = RecordingBinding()
        EmbeddedNodeGateway.open(bootstrap(), binding).close()
        assertTrue(binding.observedBootstrapWipedAfterReturn)
    }

    private fun bootstrap() = EmbeddedNodeBootstrap(
        databasePath = Path.of("C:/gaiacom-test/node.db").toAbsolutePath(),
        storageRoot = Path.of("C:/gaiacom-test/objects").toAbsolutePath(),
        serverName = "device.test.gaiacom.local",
        serverPrivateKey = ByteArray(64) { 1 },
        trustMeshEpochSecret = ByteArray(32) { 2 },
        jwtSecret = ByteArray(32) { 3 },
        shieldSecret = ByteArray(32) { 4 },
        metricsToken = ByteArray(32) { 5 },
    )
}

private class RecordingBinding(
    private val response: NativeNodeResponse = NativeNodeResponse(
        204,
        arrayOf("Content-Type"),
        arrayOf("application/json"),
        byteArrayOf(9, 10),
    ),
) : NativeNodeBinding {
    val session = RecordingNodeSession(response)
    var observedBootstrapWipedAfterReturn: Boolean = false
    private var bootstrapReference: NativeBootstrap? = null

    override fun open(bootstrap: NativeBootstrap): NativeNodeSession {
        bootstrapReference = bootstrap
        session.onOperation = {
            observedBootstrapWipedAfterReturn = bootstrapReference?.jwtSecret?.all { it == 0.toByte() } == true
        }
        return session
    }

    val closeCount: Int get() = session.closeCount
}

private class RecordingNodeSession(
    private val response: NativeNodeResponse,
) : NativeNodeSession {
    var executeCount = 0
    var closeCount = 0
    var onOperation: () -> Unit = {}

    override fun execute(
        method: String,
        path: String,
        headerNames: Array<String>,
        headerValues: Array<String>,
        body: ByteArray,
    ): NativeNodeResponse {
        onOperation()
        executeCount += 1
        return response.copy(body = response.body.copyOf())
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
    ): Boolean = true

    override fun claimEnvelope(nowUnixMillis: Long): NativeTransportLease? = null

    override fun completeEnvelope(lease: NativeTransportLease, transport: Int, nowUnixMillis: Long) = Unit

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

    override fun close() {
        onOperation()
        closeCount += 1
    }
}

private fun <T> runSuspend(block: suspend () -> T): T {
    var outcome: Result<T>? = null
    block.startCoroutine(object : Continuation<T> {
        override val context = EmptyCoroutineContext
        override fun resumeWith(result: Result<T>) {
            outcome = result
        }
    })
    return requireNotNull(outcome).getOrThrow()
}
