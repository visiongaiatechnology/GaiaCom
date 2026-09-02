// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.contracts

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertFailsWith

class NodeContractTest {
    @Test
    fun defensivelyCopiesRequestBodies() {
        val source = byteArrayOf(1, 2, 3)
        val request = NodeRequest.create(NodeMethod.POST, "/api/v1/auth/status", body = source)
        source[0] = 9
        assertContentEquals(byteArrayOf(1, 2, 3), request.bodyCopy())
    }

    @Test
    fun rejectsUntrustedBridgeInputs() {
        assertFailsWith<IllegalArgumentException> { NodeRequest.create(NodeMethod.GET, "https://attacker.invalid/api") }
        assertFailsWith<IllegalArgumentException> { NodeRequest.create(NodeMethod.GET, "/api/v1/../metrics") }
        assertFailsWith<IllegalArgumentException> {
            NodeRequest.create(NodeMethod.GET, "/livez", mapOf("X-Forwarded-Host" to "attacker.invalid"))
        }
        assertFailsWith<IllegalArgumentException> {
            NodeRequest.create(NodeMethod.GET, "/livez", mapOf("Authorization" to "safe\r\nInjected: yes"))
        }
    }
}
