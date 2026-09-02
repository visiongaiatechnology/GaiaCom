// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.io.ByteArrayInputStream
import java.io.InputStream
import java.net.URL
import java.security.Principal
import java.security.cert.Certificate
import javax.net.ssl.HttpsURLConnection
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SecureHttpTransportTest {
    @Test
    fun appliesHardenedGetPolicyWithoutRetainingCallerToken() {
        val connection = FakeHttpsConnection(200, "{}".encodeToByteArray())
        val transport = SecureHttpTransport(HttpsConnectionFactory { connection })
        val token = "header.payload.signature".encodeToByteArray()
        val original = token.copyOf()

        val response = transport.get(
            GaiaApiUrlPolicy.build(ApiEndpoint.AUTH_STATUS),
            token,
            maximumResponseBytes = 64,
        )

        assertEquals("GET", connection.requestMethod)
        assertFalse(connection.instanceFollowRedirects)
        assertFalse(connection.useCaches)
        assertEquals(10_000, connection.connectTimeout)
        assertEquals(15_000, connection.readTimeout)
        assertEquals("identity", connection.getRequestProperty("Accept-Encoding"))
        assertEquals("Bearer header.payload.signature", connection.getRequestProperty("Authorization"))
        assertContentEquals(original, token)
        val responseBytes = response.body
        response.close()
        assertTrue(responseBytes.all { it == 0.toByte() })
        assertTrue(connection.disconnected)
    }

    @Test
    fun rejectsRedirectsAndUnexpectedMediaTypes() {
        val redirect = SecureHttpTransport(
            HttpsConnectionFactory { FakeHttpsConnection(302, byteArrayOf(), "application/json") },
        )
        assertFailsWith<GaiaApiProtocolException> {
            redirect.get(GaiaApiUrlPolicy.build(ApiEndpoint.AUTH_STATUS), null, 64)
        }

        val html = SecureHttpTransport(
            HttpsConnectionFactory { FakeHttpsConnection(200, "<html>".encodeToByteArray(), "text/html") },
        )
        assertFailsWith<GaiaApiProtocolException> {
            html.get(GaiaApiUrlPolicy.build(ApiEndpoint.AUTH_STATUS), null, 64)
        }
    }

    @Test
    fun readsExplicitlyAcceptedUnauthorizedStatusFromBoundedErrorStream() {
        val body = "{\"status\":\"unauthenticated\"}".encodeToByteArray()
        val transport = SecureHttpTransport(HttpsConnectionFactory { FakeHttpsConnection(401, body) })
        transport.get(
            GaiaApiUrlPolicy.build(ApiEndpoint.AUTH_STATUS),
            bearerToken = null,
            maximumResponseBytes = 64,
            acceptedStatuses = setOf(200, 401),
        ).use { response ->
            assertEquals(401, response.statusCode)
            assertContentEquals(body, response.body)
        }
    }

    private class FakeHttpsConnection(
        private val status: Int,
        private val responseBody: ByteArray,
        private val responseContentType: String = "application/json; charset=utf-8",
    ) : HttpsURLConnection(URL("https://beta.gaiacom.de/api/v1/auth/status")) {
        var disconnected: Boolean = false
            private set

        override fun connect() = Unit

        override fun disconnect() {
            disconnected = true
        }

        override fun usingProxy(): Boolean = false
        override fun getResponseCode(): Int = status
        override fun getInputStream(): InputStream = ByteArrayInputStream(responseBody)
        override fun getErrorStream(): InputStream = ByteArrayInputStream(responseBody)
        override fun getContentType(): String = responseContentType
        override fun getContentLengthLong(): Long = responseBody.size.toLong()
        override fun getCipherSuite(): String = "TLS_AES_256_GCM_SHA384"
        override fun getLocalCertificates(): Array<Certificate>? = null
        override fun getServerCertificates(): Array<Certificate> = emptyArray()
        override fun getPeerPrincipal(): Principal? = null
        override fun getLocalPrincipal(): Principal? = null
    }
}
