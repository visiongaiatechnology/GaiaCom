// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertIs
import kotlin.test.assertTrue

class GaiaApiWriteAndKeyContractTest {
    @Test
    fun serializesStandardEnvelopeAsNestedBackendFields() {
        standardEnvelope().use { envelope ->
            val encoded = GaiaWriteJson.directMessage(IdentityId(SENDER_ID), IdentityId(RECIPIENT_ID), envelope)
            try {
                val root = StrictJson.parse(encoded).requireObject()
                assertEquals(SENDER_ID, (root.fields.getValue("senderIdentityId") as JsonString).value)
                assertEquals(RECIPIENT_ID, ((root.fields.getValue("recipientIds") as JsonArray).values.single() as JsonString).value)
                val payload = assertIs<JsonObject>(root.fields.getValue("envelopeData"))
                assertEquals(EncryptionSuite.STANDARD.wireName, (payload.fields.getValue("algorithm_suite") as JsonString).value)
                assertEquals("aa".repeat(1_568), (payload.fields.getValue("kem_ciphertext") as JsonString).value)
                assertEquals("cc".repeat(16), (payload.fields.getValue("payload_ciphertext") as JsonString).value)
                assertEquals(DEVICE_KEY_ID, (payload.fields.getValue("recipient_device_key_id") as JsonString).value)
                assertEquals(SENDER_DEVICE_KEY_ID, (payload.fields.getValue("sender_device_key_id") as JsonString).value)
                assertEquals("11".repeat(64), (payload.fields.getValue("device_signature") as JsonString).value)
                assertEquals(setOf("ed25519"), (payload.fields.getValue("signature_bundle") as JsonObject).fields.keys)
            } finally {
                encoded.fill(0)
            }
        }
    }

    @Test
    fun serializesCompleteTopSecretSignatureBundleFieldForField() {
        topSecretEnvelope().use { envelope ->
            val encoded = GaiaWriteJson.directMessage(IdentityId(SENDER_ID), IdentityId(RECIPIENT_ID), envelope)
            try {
                val payload = StrictJson.parse(encoded).requireObject().requiredObject("envelopeData")
                val bundle = payload.requiredObject("signature_bundle")
                assertEquals(EncryptionSuite.TOP_SECRET.wireName, payload.requiredString("algorithm_suite", maximumLength = 128))
                assertEquals("ee".repeat(64), bundle.requiredString("ed25519", maximumLength = 128))
                assertEquals("22".repeat(4_627), bundle.requiredString("ml_dsa_87", maximumLength = 9_254))
                assertEquals("33".repeat(2_592), bundle.requiredString("ml_dsa_87_public", maximumLength = 5_184))
                assertEquals("33".repeat(2_592), payload.requiredString("sender_mldsa87_public", maximumLength = 5_184))
            } finally {
                encoded.fill(0)
            }
        }
    }

    @Test
    fun serializesReadChannelAndGsnPayloadsExactly() {
        val read = GaiaWriteJson.markRead(
            IdentityId(RECIPIENT_ID),
            listOf(MessageId(MESSAGE_ID), MessageId(MESSAGE_ID), MessageId(OTHER_MESSAGE_ID)),
        )
        assertEquals(
            "{\"identityId\":\"$RECIPIENT_ID\",\"messageIds\":[\"$MESSAGE_ID\",\"$OTHER_MESSAGE_ID\"]}",
            read.decodeToString(),
        )
        read.fill(0)

        val attachments = JsonDocument.parseUtf8("[{\"fileId\":\"asset-1\"}]".encodeToByteArray())
        val channel = GaiaWriteJson.channelPost(
            ChannelPostPublishRequest(
                IdentityId(SENDER_ID), ChannelId(CHANNEL_ID), "Release **now**",
                attachments = attachments, scheduledFor = "2026-07-18T12:00:00Z",
            ),
        )
        assertEquals(
            "{\"identityId\":\"$SENDER_ID\",\"channelId\":\"$CHANNEL_ID\",\"body\":\"Release **now**\",\"formatting\":{\"mode\":\"markdown-lite\"},\"attachments\":[{\"fileId\":\"asset-1\"}],\"scheduledFor\":\"2026-07-18T12:00:00Z\"}",
            channel.decodeToString(),
        )
        channel.fill(0)

        val image = GsnImageAttachment(FILE_ID, "44".repeat(32), "55".repeat(12), "photo.webp")
        val timestamp = Instant.parse("2026-07-18T12:00:00Z")
        GsnPostPublishRequest.create(
            IdentityId(SENDER_ID), "Hello", image, GsnPostId("post-parent"), timestamp, ByteArray(64) { 0x66 },
        ).use { request ->
            assertEquals(
                "$timestamp:Hello:${image.canonicalJson()}:post-parent",
                request.signingPayloadCopy().decodeToString(),
            )
            val gsn = StrictJson.parse(GaiaWriteJson.gsnPost(request)).requireObject()
            assertEquals(image.canonicalJson(), gsn.requiredString("imageAttachment", maximumLength = 524_288))
            assertEquals("66".repeat(64), gsn.requiredString("signature", maximumLength = 128))
        }
    }

    @Test
    fun parsesFoundAndNeutralPublicIdentityAndRejectsMalformedKeys() {
        val record = publicRecord()
        val foundBody = jsonObject(
            "id" to JsonString(RECIPIENT_ID),
            "gaiaId" to JsonString(GAIA_ID),
            "gaiaID" to JsonString(GAIA_ID),
            "displayName" to JsonString("Bob"),
            "publicRecord" to JsonString(record),
        )
        val found = assertIs<PublicIdentityResult.Found>(GaiaApiParsers.publicIdentity(foundBody, GAIA_ID))
        assertEquals(RECIPIENT_ID, found.id.value)
        assertEquals("aa".repeat(32), found.publicKeys.ed25519Hex)
        assertEquals(3_136, found.publicKeys.mlKem1024Hex.length)

        val neutral = jsonObject(
            "id" to JsonString(""),
            "gaiaId" to JsonString(GAIA_ID),
            "gaiaID" to JsonString(GAIA_ID),
            "displayName" to JsonString(""),
            "publicRecord" to JsonNull,
            "found" to JsonBoolean(false),
        )
        assertIs<PublicIdentityResult.NotFound>(GaiaApiParsers.publicIdentity(neutral, GAIA_ID))

        val malformed = foundBody.decodeToString().replace("aa".repeat(32), "aa")
        assertFailsWith<GaiaApiParseException> { GaiaApiParsers.publicIdentity(malformed.encodeToByteArray(), GAIA_ID) }
    }

    @Test
    fun parsesOnlyActiveBoundRecipientDeviceKeys() {
        val active = deviceKeysBody("active", "bb".repeat(32), "cc".repeat(1_568), "dd".repeat(32))
        val key = GaiaApiParsers.recipientDeviceKeys(active, IdentityId(RECIPIENT_ID)).single()
        assertEquals(DEVICE_KEY_ID, key.id.value)
        assertEquals(DeviceKeyStatus.ACTIVE, key.status)
        assertEquals("bb".repeat(32), key.boxPublicHex)

        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.recipientDeviceKeys(
                deviceKeysBody("revoked", "bb".repeat(32), "cc".repeat(1_568), "dd".repeat(32)),
                IdentityId(RECIPIENT_ID),
            )
        }
        listOf(
            deviceKeysBody("active", "bb", "cc".repeat(1_568), "dd".repeat(32)),
            deviceKeysBody("active", "bb".repeat(32), "cc", "dd".repeat(32)),
            deviceKeysBody("active", "bb".repeat(32), "cc".repeat(1_568), "gg".repeat(32)),
        ).forEach { malformed ->
            assertFailsWith<GaiaApiParseException> {
                GaiaApiParsers.recipientDeviceKeys(malformed, IdentityId(RECIPIENT_ID))
            }
        }
    }

    @Test
    fun parsesWriteAcknowledgementsAndUsesExactProductionEndpoints() {
        val receipt = GaiaApiParsers.messageSendReceipt(
            "{\"status\":\"sent\",\"messageId\":\"$MESSAGE_ID\"}".encodeToByteArray(),
        )
        assertEquals(MESSAGE_ID, receipt.messageId.value)
        GaiaApiParsers.readAcknowledgement("{\"status\":\"read\"}".encodeToByteArray())
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.readAcknowledgement("{\"status\":\"ok\"}".encodeToByteArray())
        }
        assertEquals(
            "https://beta.gaiacom.de/api/v1/public/identity/%40bob%3Anode.test",
            GaiaApiUrlPolicy.buildWithPathSegment(ApiEndpoint.PUBLIC_IDENTITY, GAIA_ID).toASCIIString(),
        )
        assertEquals(
            "https://beta.gaiacom.de/api/v1/devices/recipient-keys?identityId=$RECIPIENT_ID",
            GaiaApiUrlPolicy.build(ApiEndpoint.RECIPIENT_DEVICE_KEYS, listOf("identityId" to RECIPIENT_ID)).toString(),
        )
        assertTrue(GaiaApiUrlPolicy.build(ApiEndpoint.CHAT_SEND).path.endsWith("/messaging/send"))
    }

    private fun standardEnvelope(): OutboundEncryptedEnvelope = envelope(EncryptionSuite.STANDARD)

    private fun topSecretEnvelope(): OutboundEncryptedEnvelope = envelope(EncryptionSuite.TOP_SECRET)

    private fun envelope(suite: EncryptionSuite): OutboundEncryptedEnvelope = OutboundEncryptedEnvelope.create(
        suite = suite,
        kemCiphertext = ByteArray(1_568) { 0xaa.toByte() },
        ephemeralPublic = ByteArray(32) { 0xbb.toByte() },
        payloadCiphertext = ByteArray(16) { 0xcc.toByte() },
        iv = ByteArray(12) { 0xdd.toByte() },
        ed25519Signature = ByteArray(64) { 0xee.toByte() },
        mlDsa87Signature = if (suite == EncryptionSuite.TOP_SECRET) ByteArray(4_627) { 0x22 } else byteArrayOf(),
        senderMlDsa87Public = if (suite == EncryptionSuite.TOP_SECRET) ByteArray(2_592) { 0x33 } else byteArrayOf(),
        clientMessageId = MESSAGE_ID,
        timestampEpochMillis = 1_784_370_000_000,
        recipientDeviceKeyId = DEVICE_KEY_ID,
        recipientDeviceBoxPublic = ByteArray(32) { 0xff.toByte() },
        senderDeviceKeyId = SENDER_DEVICE_KEY_ID,
        deviceSignature = ByteArray(64) { 0x11 },
        recipientGaia = GAIA_ID,
        readReceiptSourceId = OTHER_MESSAGE_ID,
    )

    private fun publicRecord(): String = StrictJson.document(
        JsonObject(
            linkedMapOf(
                "public_keys" to JsonObject(
                    linkedMapOf(
                        "identity" to JsonString("aa".repeat(32)),
                        "box" to JsonString("bb".repeat(32)),
                        "pke" to JsonString("cc".repeat(1_568)),
                        "mldsa87" to JsonString("dd".repeat(2_592)),
                    ),
                ),
            ),
        ),
    ).canonicalJson

    private fun deviceKeysBody(status: String, box: String, kem: String, sign: String): ByteArray = jsonObject(
        "keys" to JsonArray(
            listOf(
                JsonObject(
                    linkedMapOf(
                        "id" to JsonString(DEVICE_KEY_ID),
                        "identityId" to JsonString(RECIPIENT_ID),
                        "boxPublic" to JsonString(box),
                        "kemPublic" to JsonString(kem),
                        "signPublic" to JsonString(sign),
                        "status" to JsonString(status),
                    ),
                ),
            ),
        ),
    )

    private fun jsonObject(vararg fields: Pair<String, JsonNode>): ByteArray =
        StrictJson.document(JsonObject(linkedMapOf(*fields))).canonicalJson.encodeToByteArray()

    private companion object {
        const val SENDER_ID = "11111111-1111-4111-8111-111111111111"
        const val RECIPIENT_ID = "22222222-2222-4222-8222-222222222222"
        const val MESSAGE_ID = "33333333-3333-4333-8333-333333333333"
        const val OTHER_MESSAGE_ID = "44444444-4444-4444-8444-444444444444"
        const val CHANNEL_ID = "55555555-5555-4555-8555-555555555555"
        const val DEVICE_KEY_ID = "66666666-6666-4666-8666-666666666666"
        const val SENDER_DEVICE_KEY_ID = "77777777-7777-4777-8777-777777777777"
        const val FILE_ID = "88888888-8888-4888-8888-888888888888"
        const val GAIA_ID = "@bob:node.test"
    }
}
