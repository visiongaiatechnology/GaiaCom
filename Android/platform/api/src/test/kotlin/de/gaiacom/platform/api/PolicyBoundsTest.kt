// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.io.ByteArrayInputStream
import java.net.URI
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class PolicyBoundsTest {
    @Test
    fun buildsOnlyPinnedOriginAndPercentEncodesQueryValues() {
        val uri = GaiaApiUrlPolicy.build(
            ApiEndpoint.MAIL_MESSAGES,
            listOf("identityId" to IDENTITY_ID, "q" to "hello world&admin=true", "limit" to "50"),
        )
        assertEquals("https", uri.scheme)
        assertEquals("beta.gaiacom.de", uri.host)
        assertEquals(
            "https://beta.gaiacom.de/api/v1/mailbox/messages?identityId=$IDENTITY_ID&q=hello%20world%26admin%3Dtrue&limit=50",
            uri.toASCIIString(),
        )
    }

    @Test
    fun rejectsAlternateOriginsPortsCredentialsAndPaths() {
        listOf(
            "http://beta.gaiacom.de/api/v1/auth/status",
            "https://beta.gaiacom.de.attacker.example/api/v1/auth/status",
            "https://user:secret@beta.gaiacom.de/api/v1/auth/status",
            "https://beta.gaiacom.de:444/api/v1/auth/status",
            "https://beta.gaiacom.de/api/v1/../admin",
        ).forEach { value ->
            assertFailsWith<GaiaApiPolicyException> {
                GaiaApiUrlPolicy.assertAllowed(URI.create(value))
            }
        }
    }

    @Test
    fun rejectsUnapprovedQueryKeysAndCallerControlledBounds() {
        assertFailsWith<GaiaApiPolicyException> {
            GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_INBOX, listOf("redirect" to "https://attacker.example"))
        }
        assertFailsWith<IllegalArgumentException> { MailboxQuery(limit = 0) }
        assertFailsWith<IllegalArgumentException> { MailboxQuery(text = "safe\r\nX-Header: injected") }
    }

    @Test
    fun boundedReaderAcceptsBoundaryAndRejectsOneAdditionalByte() {
        val accepted = ByteArray(32) { it.toByte() }
        assertContentEquals(accepted, readBounded(ByteArrayInputStream(accepted), accepted.size))
        assertFailsWith<GaiaApiResponseTooLargeException> {
            readBounded(ByteArrayInputStream(ByteArray(33)), 32)
        }
    }

    @Test
    fun bearerPolicyRejectsHeaderInjectionAndOversizedTokens() {
        validateBearerToken("header.payload.signature".encodeToByteArray())
        assertFailsWith<GaiaApiPolicyException> {
            validateBearerToken("header.payload\r\nX-Evil:true".encodeToByteArray())
        }
        assertFailsWith<GaiaApiPolicyException> {
            validateBearerToken(ByteArray(4_097) { 'a'.code.toByte() })
        }
    }

    @Test
    fun strictJsonRejectsInvalidUtf8ExcessiveDepthAndDuplicateMembers() {
        assertFailsWith<JsonSyntaxException> { StrictJson.parse(byteArrayOf(0xc3.toByte(), 0x28)) }
        val deeplyNested = "[".repeat(33) + "0" + "]".repeat(33)
        assertFailsWith<JsonSyntaxException> { StrictJson.parse(deeplyNested.encodeToByteArray()) }
        assertFailsWith<JsonSyntaxException> { StrictJson.parse("{\"x\":1,\"x\":2}".encodeToByteArray()) }
    }

    private companion object {
        const val IDENTITY_ID = "22222222-2222-4222-8222-222222222222"
    }
}
