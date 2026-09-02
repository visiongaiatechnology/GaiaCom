// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

import java.nio.file.Path

class EmbeddedNodeBootstrap(
    val databasePath: Path,
    val storageRoot: Path,
    val serverName: String,
    serverPrivateKey: ByteArray,
    trustMeshEpochSecret: ByteArray,
    jwtSecret: ByteArray,
    shieldSecret: ByteArray,
    metricsToken: ByteArray,
) : AutoCloseable {
    private val privateKeyMaterial = serverPrivateKey.copyOf()
    private val trustMeshMaterial = trustMeshEpochSecret.copyOf()
    private val jwtMaterial = jwtSecret.copyOf()
    private val shieldMaterial = shieldSecret.copyOf()
    private val metricsMaterial = metricsToken.copyOf()
    private var closed = false

    init {
        require(databasePath.isAbsolute) { "embedded database path must be absolute" }
        require(storageRoot.isAbsolute) { "embedded storage root must be absolute" }
        require(SERVER_NAME.matches(serverName)) { "embedded server name is invalid" }
        require(privateKeyMaterial.size == ED25519_PRIVATE_KEY_BYTES) { "invalid server private key length" }
        require(trustMeshMaterial.size >= MIN_SECRET_BYTES) { "TrustMesh secret is too short" }
        require(jwtMaterial.size >= MIN_SECRET_BYTES) { "JWT secret is too short" }
        require(shieldMaterial.size >= MIN_SECRET_BYTES) { "shield secret is too short" }
        require(metricsMaterial.size >= MIN_SECRET_BYTES) { "metrics token is too short" }
    }

    internal fun consume(block: (NativeBootstrap) -> NativeNodeSession): NativeNodeSession {
        check(!closed) { "embedded node bootstrap is closed" }
        return block(
            NativeBootstrap(
                databasePath.toAbsolutePath().normalize().toString(),
                storageRoot.toAbsolutePath().normalize().toString(),
                serverName.lowercase(),
                privateKeyMaterial.copyOf(),
                trustMeshMaterial.copyOf(),
                jwtMaterial.copyOf(),
                shieldMaterial.copyOf(),
                metricsMaterial.copyOf(),
            ),
        )
    }

    override fun close() {
        if (!closed) {
            closed = true
            privateKeyMaterial.fill(0)
            trustMeshMaterial.fill(0)
            jwtMaterial.fill(0)
            shieldMaterial.fill(0)
            metricsMaterial.fill(0)
        }
    }

    companion object {
        private const val ED25519_PRIVATE_KEY_BYTES = 64
        private const val MIN_SECRET_BYTES = 32
        private val SERVER_NAME = Regex("(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])")
    }
}

internal class NativeBootstrap(
    val databasePath: String,
    val storageRoot: String,
    val serverName: String,
    val serverPrivateKey: ByteArray,
    val trustMeshEpochSecret: ByteArray,
    val jwtSecret: ByteArray,
    val shieldSecret: ByteArray,
    val metricsToken: ByteArray,
) {
    fun wipe() {
        serverPrivateKey.fill(0)
        trustMeshEpochSecret.fill(0)
        jwtSecret.fill(0)
        shieldSecret.fill(0)
        metricsToken.fill(0)
    }
}
