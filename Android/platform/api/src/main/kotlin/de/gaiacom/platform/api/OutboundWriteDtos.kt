// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import java.time.Instant

class OutboundEncryptedEnvelope private constructor(
    val suite: EncryptionSuite,
    kemCiphertext: ByteArray,
    ephemeralPublic: ByteArray,
    payloadCiphertext: ByteArray,
    iv: ByteArray,
    ed25519Signature: ByteArray,
    mlDsa87Signature: ByteArray,
    senderMlDsa87Public: ByteArray,
    val clientMessageId: String,
    val timestampEpochMillis: Long,
    val recipientDeviceKeyId: String,
    recipientDeviceBoxPublic: ByteArray,
    val senderDeviceKeyId: String,
    deviceSignature: ByteArray,
    val recipientGaia: String,
    val readReceiptSourceId: String,
) : AutoCloseable {
    private val monitor = Any()
    private val kemCiphertext = kemCiphertext.copyOf()
    private val ephemeralPublic = ephemeralPublic.copyOf()
    private val payloadCiphertext = payloadCiphertext.copyOf()
    private val iv = iv.copyOf()
    private val ed25519Signature = ed25519Signature.copyOf()
    private val mlDsa87Signature = mlDsa87Signature.copyOf()
    private val senderMlDsa87Public = senderMlDsa87Public.copyOf()
    private val recipientDeviceBoxPublic = recipientDeviceBoxPublic.copyOf()
    private val deviceSignature = deviceSignature.copyOf()
    private var closed = false

    internal fun jsonNode(): JsonObject = synchronized(monitor) {
        if (closed) throw GaiaApiPolicyException()
        val signatureFields = linkedMapOf<String, JsonNode>(
            "ed25519" to JsonString(ed25519Signature.lowerHex()),
        )
        if (suite == EncryptionSuite.TOP_SECRET) {
            signatureFields["ml_dsa_87"] = JsonString(mlDsa87Signature.lowerHex())
            signatureFields["ml_dsa_87_public"] = JsonString(senderMlDsa87Public.lowerHex())
        }
        val fields = linkedMapOf<String, JsonNode>(
            "algorithm_suite" to JsonString(suite.wireName),
            "kem_ciphertext" to JsonString(kemCiphertext.lowerHex()),
            "ephemeral_pub" to JsonString(ephemeralPublic.lowerHex()),
            "payload_ciphertext" to JsonString(payloadCiphertext.lowerHex()),
            "iv" to JsonString(iv.lowerHex()),
            "signature" to JsonString(ed25519Signature.lowerHex()),
            "signature_bundle" to JsonObject(signatureFields),
            "sender_mldsa87_public" to JsonString(senderMlDsa87Public.lowerHex()),
            "client_message_id" to JsonString(clientMessageId),
            "timestamp" to JsonNumber(timestampEpochMillis.toString()),
            "recipient_device_key_id" to JsonString(recipientDeviceKeyId),
            "recipient_device_box_public" to JsonString(recipientDeviceBoxPublic.lowerHex()),
        )
        if (recipientGaia.isNotEmpty()) fields["recipient_gaia"] = JsonString(recipientGaia)
        if (readReceiptSourceId.isNotEmpty()) fields["read_receipt_source_id"] = JsonString(readReceiptSourceId)
        if (senderDeviceKeyId.isNotEmpty()) {
            fields["sender_device_key_id"] = JsonString(senderDeviceKeyId)
            fields["device_signature"] = JsonString(deviceSignature.lowerHex())
        }
        JsonObject(fields)
    }

    override fun close() = synchronized(monitor) {
        if (!closed) {
            listOf(
                kemCiphertext,
                ephemeralPublic,
                payloadCiphertext,
                iv,
                ed25519Signature,
                mlDsa87Signature,
                senderMlDsa87Public,
                recipientDeviceBoxPublic,
                deviceSignature,
            ).forEach { value -> value.fill(0) }
            closed = true
        }
    }

    companion object {
        @Suppress("LongParameterList")
        fun create(
            suite: EncryptionSuite,
            kemCiphertext: ByteArray,
            ephemeralPublic: ByteArray,
            payloadCiphertext: ByteArray,
            iv: ByteArray,
            ed25519Signature: ByteArray,
            mlDsa87Signature: ByteArray = byteArrayOf(),
            senderMlDsa87Public: ByteArray = byteArrayOf(),
            clientMessageId: String,
            timestampEpochMillis: Long,
            recipientDeviceKeyId: String = "",
            recipientDeviceBoxPublic: ByteArray,
            senderDeviceKeyId: String = "",
            deviceSignature: ByteArray = byteArrayOf(),
            recipientGaia: String = "",
            readReceiptSourceId: String = "",
        ): OutboundEncryptedEnvelope {
            validateOutboundEnvelope(
                suite,
                kemCiphertext,
                ephemeralPublic,
                payloadCiphertext,
                iv,
                ed25519Signature,
                mlDsa87Signature,
                senderMlDsa87Public,
                clientMessageId,
                timestampEpochMillis,
                recipientDeviceKeyId,
                recipientDeviceBoxPublic,
                senderDeviceKeyId,
                deviceSignature,
                recipientGaia,
                readReceiptSourceId,
            )
            return OutboundEncryptedEnvelope(
                suite,
                kemCiphertext,
                ephemeralPublic,
                payloadCiphertext,
                iv,
                ed25519Signature,
                mlDsa87Signature,
                senderMlDsa87Public,
                clientMessageId,
                timestampEpochMillis,
                recipientDeviceKeyId,
                recipientDeviceBoxPublic,
                senderDeviceKeyId,
                deviceSignature,
                recipientGaia,
                readReceiptSourceId,
            )
        }
    }
}

enum class ChannelPostFormat(internal val wireName: String) {
    MARKDOWN_LITE("markdown-lite"),
}

data class ChannelPostPublishRequest(
    val identityId: IdentityId,
    val channelId: ChannelId,
    val body: String,
    val format: ChannelPostFormat? = ChannelPostFormat.MARKDOWN_LITE,
    val attachments: JsonDocument? = null,
    val scheduledFor: String = "",
) {
    init {
        if (body.codePointCount(0, body.length) > 3_000 || body.hasForbiddenWriteControl() ||
            scheduledFor.length > 64 || scheduledFor.any(Char::isISOControl) ||
            (body.isBlank() && attachments == null) ||
            (attachments?.canonicalJson?.encodeToByteArray()?.size ?: 0) > 2 * 1_024 * 1_024
        ) {
            throw GaiaApiPolicyException()
        }
    }
}

data class GsnImageAttachment(
    val fileId: String,
    val keyHex: String,
    val ivHex: String,
    val fileName: String,
) {
    init {
        try {
            requireUuid(fileId)
            requireExactHex(keyHex, 64)
            requireExactHex(ivHex, 24)
        } catch (exception: RuntimeException) {
            throw GaiaApiPolicyException(exception)
        }
        if (fileName.isBlank() || fileName.length > 255 || fileName.any(Char::isISOControl)) {
            throw GaiaApiPolicyException()
        }
    }

    internal fun canonicalJson(): String = StrictJson.document(
        JsonObject(
            linkedMapOf(
                "fileId" to JsonString(fileId),
                "keyHex" to JsonString(keyHex.lowercase()),
                "ivHex" to JsonString(ivHex.lowercase()),
                "fileName" to JsonString(fileName),
            ),
        ),
    ).canonicalJson
}

class GsnPostPublishRequest private constructor(
    val identityId: IdentityId,
    val body: String,
    val imageAttachment: GsnImageAttachment?,
    val repostOfPostId: GsnPostId?,
    val timestamp: Instant,
    signature: ByteArray,
) : AutoCloseable {
    private val monitor = Any()
    private val signature = signature.copyOf()
    private var closed = false

    internal fun signatureHex(): String = synchronized(monitor) {
        if (closed) throw GaiaApiPolicyException()
        signature.lowerHex()
    }

    fun signingPayloadCopy(): ByteArray = signingPayload(body, imageAttachment, repostOfPostId, timestamp)

    override fun close() = synchronized(monitor) {
        if (!closed) {
            signature.fill(0)
            closed = true
        }
    }

    companion object {
        fun create(
            identityId: IdentityId,
            body: String,
            imageAttachment: GsnImageAttachment? = null,
            repostOfPostId: GsnPostId? = null,
            timestamp: Instant,
            signature: ByteArray,
        ): GsnPostPublishRequest {
            if ((body.isBlank() && imageAttachment == null) || body.codePointCount(0, body.length) > 100_000 ||
                body.hasForbiddenWriteControl() || signature.size != 64
            ) {
                throw GaiaApiPolicyException()
            }
            return GsnPostPublishRequest(identityId, body, imageAttachment, repostOfPostId, timestamp, signature)
        }

        fun signingPayload(
            body: String,
            imageAttachment: GsnImageAttachment? = null,
            repostOfPostId: GsnPostId? = null,
            timestamp: Instant,
        ): ByteArray {
            if (body.hasForbiddenWriteControl()) throw GaiaApiPolicyException()
            val attachment = imageAttachment?.canonicalJson().orEmpty()
            return "${timestamp}:$body:$attachment:${repostOfPostId?.value.orEmpty()}".encodeToByteArray()
        }
    }
}

@ConsistentCopyVisibility
data class MessageSendReceipt internal constructor(val messageId: MessageId)

private fun validateOutboundEnvelope(
    suite: EncryptionSuite,
    kem: ByteArray,
    ephemeral: ByteArray,
    ciphertext: ByteArray,
    iv: ByteArray,
    edSignature: ByteArray,
    mlSignature: ByteArray,
    mlPublic: ByteArray,
    messageId: String,
    timestamp: Long,
    recipientDeviceKeyId: String,
    recipientBox: ByteArray,
    senderDeviceKeyId: String,
    deviceSignature: ByteArray,
    recipientGaia: String,
    readReceiptSourceId: String,
) {
    val fixedShapeValid = kem.size == 1_568 && ephemeral.size == 32 && ciphertext.size in 16..1_048_576 &&
        iv.size == 12 && edSignature.size == 64 && recipientBox.size == 32 &&
        timestamp in 1_577_836_800_000L..4_102_444_800_000L
    val suiteValid = when (suite) {
        EncryptionSuite.STANDARD -> mlSignature.isEmpty() && mlPublic.isEmpty()
        EncryptionSuite.TOP_SECRET -> mlSignature.size == 4_627 && mlPublic.size == 2_592
    }
    val senderProofValid = (senderDeviceKeyId.isEmpty() && deviceSignature.isEmpty()) ||
        (senderDeviceKeyId.isNotEmpty() && deviceSignature.size == 64)
    try {
        requireUuid(messageId)
        if (recipientDeviceKeyId.isNotEmpty()) requireUuid(recipientDeviceKeyId)
        if (senderDeviceKeyId.isNotEmpty()) requireUuid(senderDeviceKeyId)
        if (readReceiptSourceId.isNotEmpty()) requireUuid(readReceiptSourceId)
    } catch (exception: RuntimeException) {
        throw GaiaApiPolicyException(exception)
    }
    if (!fixedShapeValid || !suiteValid || !senderProofValid ||
        (recipientGaia.isNotEmpty() && !OUTBOUND_GAIA_ID.matches(recipientGaia))
    ) {
        throw GaiaApiPolicyException()
    }
}

private fun requireExactHex(value: String, length: Int) {
    if (value.length != length || value.any { character ->
            character !in '0'..'9' && character !in 'a'..'f' && character !in 'A'..'F'
        }
    ) {
        throw GaiaApiPolicyException()
    }
}

private fun String.hasForbiddenWriteControl(): Boolean =
    any { character -> character.isISOControl() && character != '\n' && character != '\r' && character != '\t' }

internal fun ByteArray.lowerHex(): String {
    val output = CharArray(size * 2)
    forEachIndexed { index, byte ->
        val value = byte.toInt() and 0xff
        output[index * 2] = HEX[value ushr 4]
        output[index * 2 + 1] = HEX[value and 0x0f]
    }
    return output.concatToString()
}

private const val HEX = "0123456789abcdef"
private val OUTBOUND_GAIA_ID = Regex("@[A-Za-z0-9._-]{3,64}:[A-Za-z0-9.-]{3,253}")
