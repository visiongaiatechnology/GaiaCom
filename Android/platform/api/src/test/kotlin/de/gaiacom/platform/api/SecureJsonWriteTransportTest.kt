// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.io.OutputStream
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

class SecureJsonWriteTransportTest {
    @Test
    fun writesBoundedJsonWithBearerAndSupportsPatch() {
        listOf(JsonWriteMethod.POST, JsonWriteMethod.PATCH).forEach { method ->
            val connection = FakeWriteConnection(200, "{}".encodeToByteArray())
            val transport = SecureHttpTransport(HttpsConnectionFactory { connection })
            val body = "{\"value\":1}".encodeToByteArray()
            val original = body.copyOf()
            val token = "header.payload.signature".encodeToByteArray()

            transport.sendJson(
                GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_READ), method, token, body,
                maximumRequestBytes = 64, maximumResponseBytes = 64, acceptedStatuses = setOf(200),
            ).use { response -> assertEquals(200, response.statusCode) }

            assertEquals(method.wireName, connection.requestMethod)
            assertEquals("application/json; charset=utf-8", connection.getRequestProperty("Content-Type"))
            assertEquals("Bearer header.payload.signature", connection.getRequestProperty("Authorization"))
            assertFalse(connection.instanceFollowRedirects)
            assertContentEquals(original, body)
            assertContentEquals(original, connection.written.toByteArray())
            assertTrue(connection.disconnected)
        }
    }

    @Test
    fun rejectsInvalidRequestJsonBeforeOpeningConnection() {
        var opened = false
        val transport = SecureHttpTransport(HttpsConnectionFactory {
            opened = true
            FakeWriteConnection(200, "{}".encodeToByteArray())
        })
        assertFailsWith<GaiaApiPolicyException> {
            transport.sendJson(
                GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_READ), JsonWriteMethod.POST,
                "header.payload.signature".encodeToByteArray(), byteArrayOf(0xc3.toByte(), 0x28),
                64, 64, setOf(200),
            )
        }
        assertFalse(opened)
        assertFailsWith<GaiaApiPolicyException> {
            transport.sendJson(
                GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_READ), JsonWriteMethod.POST,
                "header.payload.signature".encodeToByteArray(), "{]".encodeToByteArray(),
                64, 64, setOf(200),
            )
        }
    }

    @Test
    fun rejectsWrongMimeCharsetRedirectAndOversizeResponses() {
        listOf("text/html", "application/json; charset=iso-8859-1", "application/json; charset").forEach { mime ->
            val transport = SecureHttpTransport(HttpsConnectionFactory {
                FakeWriteConnection(200, "{}".encodeToByteArray(), contentType = mime)
            })
            assertFailsWith<GaiaApiProtocolException> { sendSmall(transport) }
        }
        val redirect = SecureHttpTransport(HttpsConnectionFactory {
            FakeWriteConnection(307, byteArrayOf(), contentType = "application/json")
        })
        assertFailsWith<GaiaApiProtocolException> { sendSmall(redirect) }

        val declared = SecureHttpTransport(HttpsConnectionFactory {
            FakeWriteConnection(200, "{}".encodeToByteArray(), declaredLength = 65)
        })
        assertFailsWith<GaiaApiResponseTooLargeException> { sendSmall(declared) }
        val streamed = SecureHttpTransport(HttpsConnectionFactory {
            FakeWriteConnection(200, "{\"padding\":\"${"x".repeat(80)}\"}".encodeToByteArray(), declaredLength = -1)
        })
        assertFailsWith<GaiaApiResponseTooLargeException> { sendSmall(streamed) }
    }

    @Test
    fun mapsAuthClientRateAndServerFailuresWithoutReadingBodies() {
        val failures = listOf(
            401 to GaiaApiAuthenticationException::class,
            403 to GaiaApiAuthenticationException::class,
            400 to GaiaApiRequestRejectedException::class,
            404 to GaiaApiRequestRejectedException::class,
            429 to GaiaApiRateLimitException::class,
            500 to GaiaApiServerException::class,
            503 to GaiaApiServerException::class,
        )
        failures.forEach { (status, type) ->
            val transport = SecureHttpTransport(HttpsConnectionFactory {
                FakeWriteConnection(status, "{\"error\":\"opaque\"}".encodeToByteArray())
            })
            val exception = assertFailsWith<GaiaApiException> { sendSmall(transport) }
            assertTrue(type.isInstance(exception), "status $status mapped to ${exception::class}")
        }
    }

    @Test
    fun rejectsRequestBeyondCallBoundary() {
        val transport = SecureHttpTransport(HttpsConnectionFactory { FakeWriteConnection(200, byteArrayOf()) })
        assertFailsWith<GaiaApiPolicyException> {
            transport.sendJson(
                GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_READ), JsonWriteMethod.POST,
                "header.payload.signature".encodeToByteArray(), "{\"padding\":\"xxxxxxxx\"}".encodeToByteArray(),
                maximumRequestBytes = 8, maximumResponseBytes = 64, acceptedStatuses = setOf(200),
            )
        }
    }

    private fun sendSmall(transport: SecureHttpTransport) {
        transport.sendJson(
            GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_READ), JsonWriteMethod.POST,
            "header.payload.signature".encodeToByteArray(), "{}".encodeToByteArray(),
            maximumRequestBytes = 64, maximumResponseBytes = 64, acceptedStatuses = setOf(200),
        ).close()
    }

    private class FakeWriteConnection(
        private val status: Int,
        private val responseBody: ByteArray,
        private val contentType: String = "application/json; charset=utf-8",
        private val declaredLength: Long = responseBody.size.toLong(),
    ) : HttpsURLConnection(URL("https://beta.gaiacom.de/api/v1/messaging/read")) {
        val written = ByteArrayOutputStream()
        private var observedMethod = "GET"
        var disconnected = false
            private set

        override fun setRequestMethod(method: String) { observedMethod = method }
        override fun getRequestMethod(): String = observedMethod
        override fun connect() = Unit
        override fun disconnect() { disconnected = true }
        override fun usingProxy(): Boolean = false
        override fun getResponseCode(): Int = status
        override fun getInputStream(): InputStream = ByteArrayInputStream(responseBody)
        override fun getErrorStream(): InputStream = ByteArrayInputStream(responseBody)
        override fun getOutputStream(): OutputStream = written
        override fun getContentType(): String = contentType
        override fun getContentLengthLong(): Long = declaredLength
        override fun getCipherSuite(): String = "TLS_AES_256_GCM_SHA384"
        override fun getLocalCertificates(): Array<Certificate>? = null
        override fun getServerCertificates(): Array<Certificate> = emptyArray()
        override fun getPeerPrincipal(): Principal? = null
        override fun getLocalPrincipal(): Principal? = null
    }
}
