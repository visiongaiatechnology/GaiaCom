// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import de.gaiacom.platform.remote.RemoteAccountSession
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class StoredRemoteSessionCodecTest {
    @Test
    fun roundTripPreservesOnlyRefreshMaterialAndIdentity() {
        val refresh = "12345678-1234-1234-1234-123456789abc.0123456789abcdef".encodeToByteArray()
        val auth = "header.payload.signature".encodeToByteArray()
        val session = RemoteAccountSession(
            userId = "12345678-1234-4234-9234-123456789abc",
            username = "gaia-user",
            accessToken = auth,
            refreshToken = refresh,
        )
        val encoded = StoredRemoteSessionCodec.encode(session)
        val decoded = StoredRemoteSessionCodec.decode(encoded)
        try {
            assertEquals(session.userId, decoded.userId)
            assertEquals(session.username, decoded.username)
            assertContentEquals(refresh, decoded.refreshToken)
            val encodedText = encoded.toString(Charsets.ISO_8859_1)
            assertEquals(false, encodedText.contains("header.payload.signature"))
        } finally {
            decoded.close()
            session.close()
            encoded.fill(0)
            refresh.fill(0)
            auth.fill(0)
        }
    }
}
