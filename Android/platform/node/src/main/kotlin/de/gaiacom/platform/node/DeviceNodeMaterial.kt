// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

import de.gaiacom.nativecore.mobileapi.Mobileapi
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

class DeviceNodeMaterial private constructor(
    val serverName: String,
    serverPrivateKey: ByteArray,
    trustMeshEpochSecret: ByteArray,
    jwtSecret: ByteArray,
    shieldSecret: ByteArray,
    metricsToken: ByteArray,
) : AutoCloseable {
    private val lock = ReentrantLock()
    private val privateKey = serverPrivateKey.copyOf()
    private val trustMeshSecret = trustMeshEpochSecret.copyOf()
    private val jwt = jwtSecret.copyOf()
    private val shield = shieldSecret.copyOf()
    private val metrics = metricsToken.copyOf()
    private var closed = false

    init {
        require(SERVER_NAME.matches(serverName)) { "device node server name is invalid" }
        require(privateKey.size == ED25519_PRIVATE_KEY_BYTES) { "device node private key is invalid" }
        require(trustMeshSecret.size == SECRET_BYTES && jwt.size == SECRET_BYTES &&
            shield.size == SECRET_BYTES && metrics.size == SECRET_BYTES
        ) { "device node runtime secret is invalid" }
    }

    fun serverPrivateKeyCopy(): ByteArray = copy(privateKey)
    fun trustMeshEpochSecretCopy(): ByteArray = copy(trustMeshSecret)
    fun jwtSecretCopy(): ByteArray = copy(jwt)
    fun shieldSecretCopy(): ByteArray = copy(shield)
    fun metricsTokenCopy(): ByteArray = copy(metrics)

    override fun close() = lock.withLock {
        if (!closed) {
            closed = true
            privateKey.fill(0)
            trustMeshSecret.fill(0)
            jwt.fill(0)
            shield.fill(0)
            metrics.fill(0)
        }
    }

    private fun copy(source: ByteArray): ByteArray = lock.withLock {
        check(!closed) { "device node material is closed" }
        source.copyOf()
    }

    companion object {
        const val ED25519_PRIVATE_KEY_BYTES = 64
        const val SECRET_BYTES = 32
        private val SERVER_NAME = Regex("(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])")

        fun create(
            serverName: String,
            serverPrivateKey: ByteArray,
            trustMeshEpochSecret: ByteArray,
            jwtSecret: ByteArray,
            shieldSecret: ByteArray,
            metricsToken: ByteArray,
        ): DeviceNodeMaterial = DeviceNodeMaterial(
            serverName,
            serverPrivateKey,
            trustMeshEpochSecret,
            jwtSecret,
            shieldSecret,
            metricsToken,
        )

        fun generate(): DeviceNodeMaterial {
            val generated = try {
                Mobileapi.generateDeviceSecrets()
            } catch (exception: Exception) {
                throw NodeBridgeException("device node material generation failed", exception)
            }
            val privateKey = generated.serverPrivateKey()
            val trustMesh = generated.trustMeshEpochSecret()
            val jwt = generated.jwtSecret()
            val shield = generated.shieldSecret()
            val metrics = generated.metricsToken()
            return try {
                create(generated.serverName(), privateKey, trustMesh, jwt, shield, metrics)
            } finally {
                privateKey.fill(0)
                trustMesh.fill(0)
                jwt.fill(0)
                shield.fill(0)
                metrics.fill(0)
                generated.close()
            }
        }
    }
}
