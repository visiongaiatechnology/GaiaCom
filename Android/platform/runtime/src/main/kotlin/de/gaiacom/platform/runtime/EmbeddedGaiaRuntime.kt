// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.runtime

import android.content.Context
import android.system.ErrnoException
import android.system.Os
import de.gaiacom.platform.contracts.NodeGateway
import de.gaiacom.platform.contracts.NodeRequest
import de.gaiacom.platform.contracts.NodeResponse
import de.gaiacom.platform.contracts.TransportOutbox
import de.gaiacom.platform.node.DeviceNodeMaterial
import de.gaiacom.platform.node.EmbeddedNodeBootstrap
import de.gaiacom.platform.node.EmbeddedNodeGateway
import de.gaiacom.platform.node.NodeBridgeException
import de.gaiacom.platform.security.SecureVault
import de.gaiacom.platform.security.VaultRecordId
import java.io.File

class EmbeddedGaiaRuntime private constructor(
    private val gateway: EmbeddedNodeGateway,
) : NodeGateway, AutoCloseable {
    val transportOutbox: TransportOutbox get() = gateway.transportOutbox

    override suspend fun execute(request: NodeRequest): NodeResponse = gateway.execute(request)

    override fun close() = gateway.close()

    companion object {
        private val BOOTSTRAP_RECORD = VaultRecordId("system", "device-node-bootstrap-v1")
        private const val RUNTIME_DIRECTORY = "embedded-node-v1"
        private const val DATABASE_FILE = "node.db"
        private const val OBJECT_DIRECTORY = "objects"
        private const val DIRECTORY_MODE = 0x1c0 // 0700

        fun open(context: Context, vault: SecureVault): EmbeddedGaiaRuntime {
            val material = loadOrCreateMaterial(vault)
            return material.use {
                val root = initializeRuntimeDirectory(context.applicationContext)
                val privateKey = material.serverPrivateKeyCopy()
                val trustMesh = material.trustMeshEpochSecretCopy()
                val jwt = material.jwtSecretCopy()
                val shield = material.shieldSecretCopy()
                val metrics = material.metricsTokenCopy()
                val bootstrap = try {
                    EmbeddedNodeBootstrap(
                        databasePath = File(root, DATABASE_FILE).toPath(),
                        storageRoot = File(root, OBJECT_DIRECTORY).also(::ensurePrivateDirectory).toPath(),
                        serverName = material.serverName,
                        serverPrivateKey = privateKey,
                        trustMeshEpochSecret = trustMesh,
                        jwtSecret = jwt,
                        shieldSecret = shield,
                        metricsToken = metrics,
                    )
                } finally {
                    privateKey.fill(0)
                    trustMesh.fill(0)
                    jwt.fill(0)
                    shield.fill(0)
                    metrics.fill(0)
                }
                EmbeddedGaiaRuntime(EmbeddedNodeGateway.open(bootstrap))
            }
        }

        private fun loadOrCreateMaterial(vault: SecureVault): DeviceNodeMaterial {
            val encoded = vault.read(BOOTSTRAP_RECORD)
            if (encoded != null) {
                return try {
                    DeviceNodeMaterialCodec.decode(encoded)
                } finally {
                    encoded.fill(0)
                }
            }
            val generated = DeviceNodeMaterial.generate()
            val serialized = DeviceNodeMaterialCodec.encode(generated)
            try {
                vault.write(BOOTSTRAP_RECORD, serialized)
            } catch (exception: Exception) {
                generated.close()
                throw exception
            } finally {
                serialized.fill(0)
            }
            return generated
        }

        private fun initializeRuntimeDirectory(context: Context): File {
            val noBackupRoot = context.noBackupFilesDir.canonicalFile
            val runtimeRoot = File(noBackupRoot, RUNTIME_DIRECTORY)
            ensurePrivateDirectory(runtimeRoot)
            val canonical = runtimeRoot.canonicalFile
            if (canonical.parentFile != noBackupRoot) {
                throw NodeBridgeException("embedded node directory escaped application storage")
            }
            return canonical
        }

        private fun ensurePrivateDirectory(directory: File) {
            if (!directory.exists() && !directory.mkdirs()) {
                throw NodeBridgeException("embedded node directory could not be created")
            }
            if (!directory.isDirectory) {
                throw NodeBridgeException("embedded node storage path is invalid")
            }
            try {
                Os.chmod(directory.absolutePath, DIRECTORY_MODE)
            } catch (exception: ErrnoException) {
                throw NodeBridgeException("embedded node directory permissions could not be enforced", exception)
            }
        }
    }
}
