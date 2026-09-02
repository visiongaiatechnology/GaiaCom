// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.remote

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class RemoteCookieParserTest {
    @Test
    fun extractsOnlyStrictAuthenticationCookies() {
        val parsed = RemoteCookieParser.extract(
            mapOf(
                "Set-Cookie" to listOf(
                    "auth_token=header.payload.signature; Path=/; Secure; HttpOnly",
                    "refresh_token=12345678-1234-1234-1234-123456789abc.0123456789abcdef; Path=/api/v1/auth",
                    "broken=<script>; Path=/",
                ),
            ),
        )
        assertEquals(setOf("auth_token", "refresh_token"), parsed.keys)
        assertContentEquals("header.payload.signature".encodeToByteArray(), parsed.getValue("auth_token"))
        parsed.values.forEach { it.fill(0) }
    }
}
