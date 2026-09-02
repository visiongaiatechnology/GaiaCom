// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import android.content.Context
import de.gaiacom.platform.identity.LocalIdentityKeyMaterial
import de.gaiacom.platform.remote.RemoteAccountSession
import de.gaiacom.platform.security.SecureVault
import de.gaiacom.platform.security.VaultRecordId
import de.gaiacom.platform.security.android.AndroidSecureVaultFactory

internal sealed interface StoredAccountSource : AutoCloseable {
    data class Current(val bundle: StoredAccountBundle) : StoredAccountSource {
        override fun close() = bundle.close()
    }

    data class Legacy(
        val session: StoredRemoteSession,
        val identity: StoredIdentitySecret,
    ) : StoredAccountSource {
        override fun close() {
            session.close()
            identity.close()
        }
    }

    data object Missing : StoredAccountSource {
        override fun close() = Unit
    }
}

internal object SessionVaultStore {
    val ACCOUNT_BUNDLE_RECORD = VaultRecordId("account", "native-session-v2")
    private val LEGACY_SESSION_RECORD = VaultRecordId("remote", "account-session-v1")
    private val LEGACY_IDENTITY_RECORD = VaultRecordId("identity", "mnemonic-v1")

    fun hasPersistedAccount(context: Context): Boolean =
        AndroidSecureVaultFactory.hasRecord(context, ACCOUNT_BUNDLE_RECORD) ||
            AndroidSecureVaultFactory.hasRecord(context, LEGACY_SESSION_RECORD) ||
            AndroidSecureVaultFactory.hasRecord(context, LEGACY_IDENTITY_RECORD)

    fun read(vault: SecureVault): StoredAccountSource {
        val currentBytes = vault.read(ACCOUNT_BUNDLE_RECORD)
        if (currentBytes != null) {
            val current = try {
                StoredAccountBundleCodec.decode(currentBytes)
            } finally {
                currentBytes.fill(0)
            }
            return try {
                deleteLegacy(vault)
                StoredAccountSource.Current(current)
            } catch (failure: Throwable) {
                current.close()
                throw failure
            }
        }
        val sessionBytes = vault.read(LEGACY_SESSION_RECORD)
        val identityBytes = vault.read(LEGACY_IDENTITY_RECORD)
        if (sessionBytes == null || identityBytes == null) {
            sessionBytes?.fill(0)
            identityBytes?.fill(0)
            deleteAll(vault)
            return StoredAccountSource.Missing
        }
        return try {
            val session = StoredRemoteSessionCodec.decode(sessionBytes)
            try {
                val identity = StoredIdentitySecretCodec.decode(identityBytes)
                StoredAccountSource.Legacy(session, identity)
            } catch (failure: Throwable) {
                session.close()
                throw failure
            }
        } finally {
            sessionBytes.fill(0)
            identityBytes.fill(0)
        }
    }

    fun commit(vault: SecureVault, session: RemoteAccountSession, identity: LocalIdentityKeyMaterial) {
        val encoded = StoredAccountBundleCodec.encode(session, identity)
        try {
            vault.write(ACCOUNT_BUNDLE_RECORD, encoded)
            deleteLegacy(vault)
        } catch (failure: Throwable) {
            runCatching { vault.delete(ACCOUNT_BUNDLE_RECORD) }
            throw failure
        } finally {
            encoded.fill(0)
        }
    }

    fun deleteAll(vault: SecureVault) {
        var failure: Throwable? = null
        arrayOf(ACCOUNT_BUNDLE_RECORD, LEGACY_SESSION_RECORD, LEGACY_IDENTITY_RECORD).forEach { record ->
            try {
                vault.delete(record)
            } catch (caught: Throwable) {
                failure = failure?.also { it.addSuppressed(caught) } ?: caught
            }
        }
        failure?.let { throw it }
    }

    private fun deleteLegacy(vault: SecureVault) {
        vault.delete(LEGACY_SESSION_RECORD)
        vault.delete(LEGACY_IDENTITY_RECORD)
    }
}
