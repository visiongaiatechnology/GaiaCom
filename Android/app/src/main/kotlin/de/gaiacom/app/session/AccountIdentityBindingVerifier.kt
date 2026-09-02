// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import de.gaiacom.platform.api.GaiaApiClient
import de.gaiacom.platform.api.GaiaApiException
import de.gaiacom.platform.identity.LocalIdentityKeyMaterial
import de.gaiacom.platform.remote.RemoteAccountSession
import java.security.MessageDigest

internal enum class IdentityBindingFailure {
    MISMATCH,
    ACCOUNT_HAS_NO_IDENTITY,
    VERIFICATION_UNAVAILABLE,
}

internal class IdentityBindingException(
    val failure: IdentityBindingFailure,
    cause: Throwable? = null,
) : SecurityException("local recovery identity does not match the authenticated account", cause)

internal class AccountIdentityBindingVerifier(
    private val apiClient: GaiaApiClient = GaiaApiClient(),
) {
    fun verify(session: RemoteAccountSession, localIdentity: LocalIdentityKeyMaterial) {
        val token = session.accessTokenCopy()
        val localPublic = localIdentity.ed25519PublicCopy()
        try {
            val identities = try {
                apiClient.identities(token)
            } catch (exception: GaiaApiException) {
                throw IdentityBindingException(IdentityBindingFailure.VERIFICATION_UNAVAILABLE, exception)
            }
            if (identities.isEmpty()) {
                throw IdentityBindingException(IdentityBindingFailure.ACCOUNT_HAS_NO_IDENTITY)
            }
            val matches = identities.any { identity ->
                val encoded = identity.publicKeys?.ed25519Hex ?: return@any false
                val remotePublic = decodeFixedHex(encoded, ED25519_PUBLIC_BYTES) ?: return@any false
                try {
                    MessageDigest.isEqual(localPublic, remotePublic)
                } finally {
                    remotePublic.fill(0)
                }
            }
            if (!matches) throw IdentityBindingException(IdentityBindingFailure.MISMATCH)
        } finally {
            token.fill(0)
            localPublic.fill(0)
        }
    }

    private fun decodeFixedHex(value: String, expectedBytes: Int): ByteArray? {
        if (value.length != expectedBytes * 2) return null
        val decoded = ByteArray(expectedBytes)
        for (index in decoded.indices) {
            val high = value[index * 2].digitToIntOrNull(16)
            val low = value[index * 2 + 1].digitToIntOrNull(16)
            if (high == null || low == null) {
                decoded.fill(0)
                return null
            }
            decoded[index] = ((high shl 4) or low).toByte()
        }
        return decoded
    }

    private companion object {
        const val ED25519_PUBLIC_BYTES = 32
    }
}
