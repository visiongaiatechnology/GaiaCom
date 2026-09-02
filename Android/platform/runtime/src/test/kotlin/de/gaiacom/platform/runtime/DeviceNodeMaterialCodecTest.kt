// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.runtime

import de.gaiacom.platform.node.DeviceNodeMaterial
import de.gaiacom.platform.node.NodeBridgeException
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class DeviceNodeMaterialCodecTest {
    @Test
    fun roundTripsFixedLengthDeviceMaterial() {
        val original = material()
        val encoded = DeviceNodeMaterialCodec.encode(original)
        val decoded = DeviceNodeMaterialCodec.decode(encoded)
        try {
            assertEquals(original.serverName, decoded.serverName)
            assertContentEquals(original.serverPrivateKeyCopy(), decoded.serverPrivateKeyCopy())
            assertContentEquals(original.metricsTokenCopy(), decoded.metricsTokenCopy())
        } finally {
            original.close()
            decoded.close()
            encoded.fill(0)
        }
    }

    @Test
    fun rejectsTrailingAndCorruptedData() {
        val original = material()
        val encoded = DeviceNodeMaterialCodec.encode(original)
        original.close()
        assertFailsWith<NodeBridgeException> {
            DeviceNodeMaterialCodec.decode(encoded + byteArrayOf(1))
        }
        encoded[0] = encoded[0].inc()
        assertFailsWith<NodeBridgeException> {
            DeviceNodeMaterialCodec.decode(encoded)
        }
        encoded.fill(0)
    }

    private fun material(): DeviceNodeMaterial = DeviceNodeMaterial.create(
        "device-0011223344556677.gaiacom.local",
        ByteArray(64) { 1 },
        ByteArray(32) { 2 },
        ByteArray(32) { 3 },
        ByteArray(32) { 4 },
        ByteArray(32) { 5 },
    )
}
