// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import de.gaiacom.platform.identity.LocalIdentityKeyMaterial
import de.gaiacom.platform.remote.RemoteAccountSession
import de.gaiacom.platform.security.SecureVault

internal class PendingLogin(
    val username: String,
    passwordUtf8: ByteArray,
    mnemonicUtf8: ByteArray,
) : AutoCloseable {
    private val password = passwordUtf8.copyOf()
    private val mnemonic = mnemonicUtf8.copyOf()

    fun passwordString(): String = password.decodeToString(throwOnInvalidSequence = true)

    fun mnemonicCopy(): ByteArray = mnemonic.copyOf()

    fun isExpired(nowNanos: Long = System.nanoTime()): Boolean = nowNanos - expiresAtNanos >= 0

    override fun close() {
        password.fill(0)
        mnemonic.fill(0)
    }

    private val expiresAtNanos = System.nanoTime() + AUTHORIZATION_TIMEOUT_NANOS

    private companion object {
        const val AUTHORIZATION_TIMEOUT_NANOS = 120_000_000_000L
    }
}

internal data class Resources(
    val session: RemoteAccountSession?,
    val vault: SecureVault?,
    val identity: LocalIdentityKeyMaterial?,
) {
    fun close() {
        runCatching { session?.close() }
        runCatching { identity?.close() }
        runCatching { vault?.close() }
    }
}
