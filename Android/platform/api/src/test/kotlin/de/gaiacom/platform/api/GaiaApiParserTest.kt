// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertIs
import kotlin.test.assertTrue

class GaiaApiParserTest {
    @Test
    fun parsesAuthenticatedStatusAndCrossChecksNestedUser() {
        val status = GaiaApiParsers.authStatus(
            json(
                """{"status":"authenticated","user_id":"$USER_ID","username":"alice","allowAnonymousStats":false,"user":{"id":"$USER_ID","username":"alice","allowAnonymousStats":false}}""",
            ),
            200,
        )
        val authenticated = assertIs<AccountAuthStatus.Authenticated>(status)
        assertEquals(USER_ID, authenticated.userId.value)
        assertEquals("alice", authenticated.username)
    }

    @Test
    fun parsesIdentitySchemaWithGoFieldNames() {
        val publicRecord =
            """{"profile":{"bio":"hello"},"public_keys":{"identity":"${"A1".repeat(32)}","box":"${"b2".repeat(32)}","pke":"${"c3".repeat(1_568)}","mldsa87":"${"d4".repeat(2_592)}"}}"""
        val identities = GaiaApiParsers.identities(
            json(
                """[{"ID":"$IDENTITY_ID","UserID":"$USER_ID","GaiaID":"@alice:node.test","DisplayName":"Alice","Keys":{"ignored":"secret"},"PublicRecord":$publicRecord,"IsActive":true,"CreatedAt":"2026-07-18T10:00:00Z","UpdatedAt":"2026-07-18T10:01:00Z"}]""",
            ),
        )
        val identity = identities.single()
        assertEquals("@alice:node.test", identity.gaiaId)
        assertTrue(identity.publicRecord?.canonicalJson?.contains("\"public_keys\"") == true)
        assertEquals("a1".repeat(32), identity.publicKeys?.ed25519Hex)
        assertEquals("b2".repeat(32), identity.publicKeys?.x25519Hex)
        assertEquals(3_136, identity.publicKeys?.mlKem1024Hex?.length)
        assertEquals(5_184, identity.publicKeys?.mlDsa87Hex?.length)
    }

    @Test
    fun permitsAbsentPublicRecordButRejectsIncompleteOrMalformedIdentityKeys() {
        val base =
            """{"ID":"$IDENTITY_ID","UserID":"$USER_ID","GaiaID":"@alice:node.test","DisplayName":"Alice","IsActive":true,"CreatedAt":"2026-07-18T10:00:00Z","UpdatedAt":"2026-07-18T10:01:00Z"}"""
        val identity = GaiaApiParsers.identities(json("[$base]")).single()
        assertEquals(null, identity.publicRecord)
        assertEquals(null, identity.publicKeys)

        val explicitNull = base.dropLast(1) + ",\"PublicRecord\":null}"
        val nullRecordIdentity = GaiaApiParsers.identities(json("[$explicitNull]")).single()
        assertEquals(null, nullRecordIdentity.publicRecord)
        assertEquals(null, nullRecordIdentity.publicKeys)

        val validIdentity = "aa".repeat(32)
        val validBox = "bb".repeat(32)
        val validKem = "cc".repeat(1_568)
        val invalidKeySets = listOf(
            """{"identity":"$validIdentity","box":"$validBox"}""",
            """{"identity":"aa","box":"$validBox","pke":"$validKem"}""",
            """{"identity":"$validIdentity","box":"bb","pke":"$validKem"}""",
            """{"identity":"$validIdentity","box":"$validBox","pke":"cc"}""",
            """{"identity":"${"gg".repeat(32)}","box":"$validBox","pke":"$validKem"}""",
            """{"identity":"$validIdentity","box":"$validBox","pke":"$validKem","mldsa87":"dd"}""",
        )
        invalidKeySets.forEach { keySet ->
            val malformed = base.dropLast(1) + ",\"PublicRecord\":{\"public_keys\":$keySet}}"
            assertFailsWith<GaiaApiParseException> {
                GaiaApiParsers.identities(json("[$malformed]"))
            }
        }
    }

    @Test
    fun parsesEncryptedChatAndMailboxState() {
        val messages = GaiaApiParsers.messages(json(mailEnvelope()), mailboxRequired = true)
        val message = messages.single()
        assertEquals(MessageKind.ENCRYPTED, message.kind)
        assertEquals(MESSAGE_ID, message.id.value)
        assertEquals(ED25519_SIGNATURE, message.signature)
        val encrypted = assertIs<MessagePayload.Encrypted>(message.payload)
        assertEquals(EncryptionSuite.STANDARD, encrypted.envelope.suite)
        assertEquals(CLIENT_MESSAGE_ID, encrypted.envelope.clientMessageId.value)
        assertEquals("inbox", message.mailbox?.folder)
        assertEquals(listOf("secure"), message.mailbox?.labels)
    }

    @Test
    fun parsesChannelsPostsAndGsnFeed() {
        val channels = GaiaApiParsers.channels(
            json(
                """{"channels":[{"id":"$CHANNEL_ID","name":"Security","description":"Updates","avatar":null,"createdBy":"$AUTHOR_ID","createdAt":"2026-07-18T10:00:00Z","updatedAt":"2026-07-18T10:01:00Z","subscriberCount":7,"isSubscribed":true,"isAdmin":false,"isSuspended":false,"suspensionReason":"","isVerified":true,"commentsEnabled":true,"category":"News","isBlocked":false}]}""",
            ),
        )
        val posts = GaiaApiParsers.channelPosts(
            json(
                """{"posts":[{"id":"$CHANNEL_POST_ID","channelId":"$CHANNEL_ID","authorIdentityId":"$AUTHOR_ID","body":"Release","formatting":{"mode":"markdown-lite"},"attachments":[],"createdAt":"2026-07-18T10:02:00Z","isPinned":false,"reactionState":{"reactions":{"ok":2},"reactedByMe":{"ok":true}},"comments":[]}]}""",
            ),
        )
        val feed = GaiaApiParsers.gsnFeed(
            json(
                """[{"id":"post-1","gaiaId":"@alice:node.test","displayName":"Alice","avatar":"A","nodeId":"node.test","timestamp":"2026-07-18T10:03:00Z","body":"Hello","imageAttachment":"","signature":"sig","repostOfPostId":"","isVerifiedOperator":false,"isVerifiedGovernance":false,"isVerifiedPassport":true,"reactions":{"wave":3},"reactedByMe":{"wave":false},"commentCount":1}]""",
            ),
        )
        assertEquals("Security", channels.single().name)
        assertEquals(2, posts.single().reactions.getValue("ok"))
        assertEquals("post-1", feed.single().id.value)
        assertEquals(1, feed.single().commentCount)
    }

    @Test
    fun acceptsBackendNullOnlyAsAnEmptyGsnFeed() {
        assertEquals(emptyList(), GaiaApiParsers.gsnFeed(json("null")))
        assertFailsWith<GaiaApiParseException> { GaiaApiParsers.identities(json("null")) }
    }

    @Test
    fun toleratesMalformedOptionalDisplayFieldWithoutWeakeningIdentityFields() {
        val channels = GaiaApiParsers.channels(
            json(
                """{"channels":[{"id":"$CHANNEL_ID","name":42,"description":null,"avatar":null,"createdBy":"$AUTHOR_ID","createdAt":"2026-07-18T10:00:00Z","updatedAt":"2026-07-18T10:01:00Z","subscriberCount":0,"isSubscribed":false,"isAdmin":false,"isSuspended":false,"suspensionReason":null,"isVerified":false,"commentsEnabled":false,"category":null,"isBlocked":false}]}""",
            ),
        )
        assertEquals("", channels.single().name)
        assertEquals("", channels.single().description)
    }

    @Test
    fun rejectsDuplicateKeysAliasAmbiguityAndInvalidIdentifiers() {
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.authStatus(json("""{"status":"authenticated","status":"unauthenticated"}"""), 200)
        }
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.identities(
                json(
                    """[{"ID":"$IDENTITY_ID","id":"$IDENTITY_ID","UserID":"$USER_ID","GaiaID":"@alice:node.test","IsActive":true,"CreatedAt":"2026-07-18T10:00:00Z","UpdatedAt":"2026-07-18T10:00:00Z"}]""",
                ),
            )
        }
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.identities(
                json(
                    """[{"ID":"../../escape","UserID":"$USER_ID","GaiaID":"@alice:node.test","IsActive":true,"CreatedAt":"2026-07-18T10:00:00Z","UpdatedAt":"2026-07-18T10:00:00Z"}]""",
                ),
            )
        }
    }

    @Test
    fun rejectsUnsignedEncryptedEnvelopeAndMailboxMismatch() {
        val unsigned = mailEnvelope().replace(",\"Signature\":\"$ED25519_SIGNATURE\"", "")
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.messages(json(unsigned), mailboxRequired = true)
        }
        val mismatched = mailEnvelope().replace("\"messageId\":\"$MESSAGE_ID\"", "\"messageId\":\"$OTHER_MESSAGE_ID\"")
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.messages(json(mismatched), mailboxRequired = true)
        }
    }

    @Test
    fun rejectsCryptographicallyIncompleteOrInconsistentEncryptedEnvelope() {
        val badKem = mailEnvelope().replace("\"kem_ciphertext\":\"$KEM_CIPHERTEXT\"", "\"kem_ciphertext\":\"aa\"")
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.messages(json(badKem), mailboxRequired = true)
        }

        val inconsistentSignature = mailEnvelope().replace(
            "\"ed25519\":\"$ED25519_SIGNATURE\"",
            "\"ed25519\":\"${"ff".repeat(64)}\"",
        )
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.messages(json(inconsistentSignature), mailboxRequired = true)
        }
    }

    @Test
    fun parsesCompleteTopSecretSignatureBundleAndRejectsWrongMlDsaLength() {
        val mlDsaSignature = "11".repeat(4_627)
        val mlDsaPublic = "22".repeat(2_592)
        val topSecret = mailEnvelope()
            .replace(EncryptionSuite.STANDARD.wireName, EncryptionSuite.TOP_SECRET.wireName)
            .replace(
                "\"signature_bundle\":{\"ed25519\":\"$ED25519_SIGNATURE\",\"ml_dsa_87\":\"\",\"ml_dsa_87_public\":\"\"},\"sender_mldsa87_public\":\"\"",
                "\"signature_bundle\":{\"ed25519\":\"$ED25519_SIGNATURE\",\"ml_dsa_87\":\"$mlDsaSignature\",\"ml_dsa_87_public\":\"$mlDsaPublic\"},\"sender_mldsa87_public\":\"$mlDsaPublic\"",
            )
        val encrypted = assertIs<MessagePayload.Encrypted>(
            GaiaApiParsers.messages(json(topSecret), mailboxRequired = true).single().payload,
        )
        assertEquals(EncryptionSuite.TOP_SECRET, encrypted.envelope.suite)
        assertEquals(9_254, encrypted.envelope.signatures.mlDsa87Hex?.length)
        assertEquals(5_184, encrypted.envelope.signatures.mlDsa87PublicHex?.length)

        val wrongLength = topSecret.replace("\"ml_dsa_87\":\"$mlDsaSignature\"", "\"ml_dsa_87\":\"11\"")
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.messages(json(wrongLength), mailboxRequired = true)
        }
    }

    @Test
    fun marksLegacySmtpAsUntrustedFromItsFailClosedSecurityEnvelope() {
        val payload =
            """[{"ID":"$MESSAGE_ID","Type":"smtp.legacy","Sender":"sender@example.org","Recipient":"@bobby:node.test","Payload":{"type":"smtp.legacy","direction":"inbound","subject":"Legacy","body":"External","attachments":[],"security":{"transport":"legacy-smtp","endToEndEncrypted":false,"untrusted":true}},"Signature":"","CreatedAt":"2026-07-18T10:02:00Z"}]"""
        val message = GaiaApiParsers.messages(json(payload), mailboxRequired = false).single()
        val smtp = assertIs<MessagePayload.LegacySmtp>(message.payload)
        assertEquals(LegacyMailDirection.INBOUND, smtp.direction)
        assertTrue(message.untrusted)

        val weakened = payload.replace("\"untrusted\":true", "\"untrusted\":false")
        assertFailsWith<GaiaApiParseException> {
            GaiaApiParsers.messages(json(weakened), mailboxRequired = false)
        }
    }

    @Test
    fun canonicalDocumentDoesNotReintroduceExecutableSyntax() {
        val parsed = StrictJson.parse(json("""{"value":"<script>\n&"}"""))
        val document = StrictJson.document(parsed)
        assertTrue(document.canonicalJson.contains("\\n"))
        assertEquals("{\"value\":\"<script>\\n&\"}", document.canonicalJson)
    }

    private fun mailEnvelope(): String =
        """[{"ID":"$MESSAGE_ID","Type":"gaia.encrypted.v1","Sender":"@alice:node.test","Recipient":"@bobby:node.test","Payload":{"algorithm_suite":"${EncryptionSuite.STANDARD.wireName}","kem_ciphertext":"$KEM_CIPHERTEXT","ephemeral_pub":"${"bb".repeat(32)}","payload_ciphertext":"${"cc".repeat(16)}","iv":"${"dd".repeat(12)}","signature":"$ED25519_SIGNATURE","signature_bundle":{"ed25519":"$ED25519_SIGNATURE","ml_dsa_87":"","ml_dsa_87_public":""},"sender_mldsa87_public":"","client_message_id":"$CLIENT_MESSAGE_ID","timestamp":1784368920000,"recipient_device_key_id":"","recipient_device_box_public":"${"ee".repeat(32)}"},"Signature":"$ED25519_SIGNATURE","senderIdentityId":"$AUTHOR_ID","CreatedAt":"2026-07-18T10:02:00Z","untrusted":false,"isRead":false,"delivered":true,"reactions":{"lock":1},"reactedByMe":{"lock":true},"mailbox":{"userId":"$USER_ID","identityId":"$IDENTITY_ID","messageId":"$MESSAGE_ID","folder":"inbox","isRead":false,"isStarred":false,"isImportant":true,"isSpam":false,"isArchived":false,"labels":["secure"],"snoozedUntil":null}}]"""

    private fun json(value: String): ByteArray = value.encodeToByteArray()

    private companion object {
        const val USER_ID = "11111111-1111-4111-8111-111111111111"
        const val IDENTITY_ID = "22222222-2222-4222-8222-222222222222"
        const val MESSAGE_ID = "33333333-3333-4333-8333-333333333333"
        const val CLIENT_MESSAGE_ID = "88888888-8888-4888-8888-888888888888"
        const val OTHER_MESSAGE_ID = "77777777-7777-4777-8777-777777777777"
        const val CHANNEL_ID = "44444444-4444-4444-8444-444444444444"
        const val AUTHOR_ID = "55555555-5555-4555-8555-555555555555"
        const val CHANNEL_POST_ID = "66666666-6666-4666-8666-666666666666"
        val ED25519_SIGNATURE = "ab".repeat(64)
        val KEM_CIPHERTEXT = "aa".repeat(1_568)
    }
}
