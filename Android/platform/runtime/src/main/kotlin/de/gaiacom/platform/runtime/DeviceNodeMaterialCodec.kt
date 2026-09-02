// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.runtime

import de.gaiacom.platform.node.DeviceNodeMaterial
import de.gaiacom.platform.node.NodeBridgeException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets

internal object DeviceNodeMaterialCodec {
    private val magic = byteArrayOf(0x47, 0x43, 0x4e, 0x4f, 0x44, 0x45, 0x30, 0x31)
    private const val VERSION = 1
    private const val HEADER_BYTES = 16
    private const val MAX_SERVER_NAME_BYTES = 253
    private const val FIXED_SECRET_BYTES = DeviceNodeMaterial.ED25519_PRIVATE_KEY_BYTES +
        DeviceNodeMaterial.SECRET_BYTES * 4

    fun encode(material: DeviceNodeMaterial): ByteArray {
        val name = material.serverName.encodeToByteArray()
        require(name.size in 1..MAX_SERVER_NAME_BYTES) { "device node server name is invalid" }
        val privateKey = material.serverPrivateKeyCopy()
        val trustMesh = material.trustMeshEpochSecretCopy()
        val jwt = material.jwtSecretCopy()
        val shield = material.shieldSecretCopy()
        val metrics = material.metricsTokenCopy()
        return try {
            ByteBuffer.allocate(HEADER_BYTES + name.size + FIXED_SECRET_BYTES)
                .order(ByteOrder.BIG_ENDIAN)
                .put(magic)
                .putInt(VERSION)
                .putInt(name.size)
                .put(name)
                .put(privateKey)
                .put(trustMesh)
                .put(jwt)
                .put(shield)
                .put(metrics)
                .array()
        } finally {
            name.fill(0)
            privateKey.fill(0)
            trustMesh.fill(0)
            jwt.fill(0)
            shield.fill(0)
            metrics.fill(0)
        }
    }

    fun decode(encoded: ByteArray): DeviceNodeMaterial {
        if (encoded.size !in (HEADER_BYTES + 1 + FIXED_SECRET_BYTES)..
            (HEADER_BYTES + MAX_SERVER_NAME_BYTES + FIXED_SECRET_BYTES)
        ) {
            throw NodeBridgeException("device node material envelope size is invalid")
        }
        val buffer = ByteBuffer.wrap(encoded).order(ByteOrder.BIG_ENDIAN)
        val actualMagic = ByteArray(magic.size).also(buffer::get)
        val version = buffer.int
        val nameLength = buffer.int
        if (!actualMagic.contentEquals(magic) || version != VERSION || nameLength !in 1..MAX_SERVER_NAME_BYTES ||
            buffer.remaining() != nameLength + FIXED_SECRET_BYTES
        ) {
            actualMagic.fill(0)
            throw NodeBridgeException("device node material envelope is invalid")
        }
        actualMagic.fill(0)
        val nameBytes = ByteArray(nameLength).also(buffer::get)
        val privateKey = ByteArray(DeviceNodeMaterial.ED25519_PRIVATE_KEY_BYTES).also(buffer::get)
        val trustMesh = ByteArray(DeviceNodeMaterial.SECRET_BYTES).also(buffer::get)
        val jwt = ByteArray(DeviceNodeMaterial.SECRET_BYTES).also(buffer::get)
        val shield = ByteArray(DeviceNodeMaterial.SECRET_BYTES).also(buffer::get)
        val metrics = ByteArray(DeviceNodeMaterial.SECRET_BYTES).also(buffer::get)
        return try {
            DeviceNodeMaterial.create(
                decodeUtf8(nameBytes),
                privateKey,
                trustMesh,
                jwt,
                shield,
                metrics,
            )
        } catch (exception: IllegalArgumentException) {
            throw NodeBridgeException("device node material fields are invalid", exception)
        } finally {
            nameBytes.fill(0)
            privateKey.fill(0)
            trustMesh.fill(0)
            jwt.fill(0)
            shield.fill(0)
            metrics.fill(0)
        }
    }

    private fun decodeUtf8(value: ByteArray): String = try {
        StandardCharsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(ByteBuffer.wrap(value))
            .toString()
    } catch (exception: Exception) {
        throw NodeBridgeException("device node server name encoding is invalid", exception)
    }
}
