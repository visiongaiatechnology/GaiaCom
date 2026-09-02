// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import de.gaiacom.platform.identity.LocalIdentityKeyMaterial
import de.gaiacom.platform.remote.RemoteAccountSession
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets

internal class StoredAccountBundle(
    val userId: String,
    val username: String,
    refreshToken: ByteArray,
    ed25519PrivateSeed: ByteArray,
    x25519Private: ByteArray,
    mlKem1024Private: ByteArray,
    mlDsa87Private: ByteArray,
) : AutoCloseable {
    private val refresh = refreshToken.copyOf()
    private val ed25519 = ed25519PrivateSeed.copyOf()
    private val x25519 = x25519Private.copyOf()
    private val mlKem1024 = mlKem1024Private.copyOf()
    private val mlDsa87 = mlDsa87Private.copyOf()
    private var closed = false

    @Synchronized
    fun refreshTokenCopy(): ByteArray = copyOpen(refresh)

    @Synchronized
    fun privateKeyCopies(): PrivateIdentityKeyCopies {
        check(!closed) { "stored account bundle is closed" }
        return PrivateIdentityKeyCopies(ed25519, x25519, mlKem1024, mlDsa87)
    }

    @Synchronized
    override fun close() {
        if (closed) return
        closed = true
        arrayOf(refresh, ed25519, x25519, mlKem1024, mlDsa87).forEach { material -> material.fill(0) }
    }

    private fun copyOpen(source: ByteArray): ByteArray {
        check(!closed) { "stored account bundle is closed" }
        return source.copyOf()
    }
}

internal class PrivateIdentityKeyCopies(
    ed25519PrivateSeed: ByteArray,
    x25519Private: ByteArray,
    mlKem1024Private: ByteArray,
    mlDsa87Private: ByteArray,
) : AutoCloseable {
    val ed25519 = ed25519PrivateSeed.copyOf()
    val x25519 = x25519Private.copyOf()
    val mlKem1024 = mlKem1024Private.copyOf()
    val mlDsa87 = mlDsa87Private.copyOf()

    override fun close() = arrayOf(ed25519, x25519, mlKem1024, mlDsa87).forEach { material -> material.fill(0) }
}

internal object StoredAccountBundleCodec {
    private const val MAGIC = 0x47414231 // GAB1
    private const val VERSION: Byte = 1
    private const val FIELD_COUNT: Byte = 7
    private const val HEADER_BYTES = 6 + Int.SIZE_BYTES * FIELD_COUNT
    private const val ED25519_PRIVATE_BYTES = 32
    private const val X25519_PRIVATE_BYTES = 32
    private const val ML_KEM_1024_PRIVATE_BYTES = 3_168
    private const val ML_DSA_87_PRIVATE_BYTES = 4_896
    private const val MAX_ENVELOPE_BYTES = 16 * 1_024
    private val USER_ID = Regex(
        "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}",
    )
    private val TOKEN_CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._~-".toSet()

    fun encode(session: RemoteAccountSession, identity: LocalIdentityKeyMaterial): ByteArray {
        val userId = session.userId.encodeToByteArray()
        val username = session.username.encodeToByteArray()
        val refresh = session.refreshTokenCopy()
        val keys = readPrivateKeys(identity)
        try {
            validateIdentity(session.userId, session.username)
            validateRefresh(refresh)
            val fields = arrayOf(userId, username, refresh, keys.ed25519, keys.x25519, keys.mlKem1024, keys.mlDsa87)
            val totalSize = HEADER_BYTES + fields.sumOf(ByteArray::size)
            require(totalSize <= MAX_ENVELOPE_BYTES) { "stored account bundle exceeds size boundary" }
            val buffer = ByteBuffer.allocate(totalSize).order(ByteOrder.BIG_ENDIAN)
                .putInt(MAGIC)
                .put(VERSION)
                .put(FIELD_COUNT)
            fields.forEach { field -> buffer.putInt(field.size) }
            fields.forEach(buffer::put)
            return buffer.array()
        } finally {
            userId.fill(0)
            username.fill(0)
            refresh.fill(0)
            keys.close()
        }
    }

    fun decode(encoded: ByteArray): StoredAccountBundle {
        require(encoded.size in HEADER_BYTES..MAX_ENVELOPE_BYTES) { "stored account bundle has invalid size" }
        val buffer = ByteBuffer.wrap(encoded).order(ByteOrder.BIG_ENDIAN)
        require(buffer.int == MAGIC && buffer.get() == VERSION && buffer.get() == FIELD_COUNT) {
            "stored account bundle header is invalid"
        }
        val lengths = IntArray(FIELD_COUNT.toInt()) { buffer.int }
        validateLengths(lengths)
        require(lengths.sum() == buffer.remaining()) { "stored account bundle is truncated" }
        val fields = lengths.map { size -> ByteArray(size).also(buffer::get) }
        try {
            val userId = decodeUtf8(fields[0])
            val username = decodeUtf8(fields[1])
            validateIdentity(userId, username)
            validateRefresh(fields[2])
            return StoredAccountBundle(userId, username, fields[2], fields[3], fields[4], fields[5], fields[6])
        } finally {
            fields.forEach { field -> field.fill(0) }
            lengths.fill(0)
        }
    }

    private fun readPrivateKeys(identity: LocalIdentityKeyMaterial): PrivateIdentityKeyCopies {
        val ed25519 = identity.ed25519PrivateSeedCopy()
        val x25519 = identity.x25519PrivateCopy()
        val mlKem1024 = identity.mlKem1024PrivateCopy()
        val mlDsa87 = identity.mlDsa87PrivateCopy()
        return try {
            PrivateIdentityKeyCopies(ed25519, x25519, mlKem1024, mlDsa87)
        } finally {
            arrayOf(ed25519, x25519, mlKem1024, mlDsa87).forEach { material -> material.fill(0) }
        }
    }

    private fun validateLengths(lengths: IntArray) {
        require(lengths[0] in 1..64 && lengths[1] in 1..256) { "stored account identity size is invalid" }
        require(lengths[2] in 16..RemoteAccountSession.MAX_TOKEN_BYTES) { "stored refresh token size is invalid" }
        require(lengths[3] == ED25519_PRIVATE_BYTES && lengths[4] == X25519_PRIVATE_BYTES) {
            "stored classical private key size is invalid"
        }
        require(lengths[5] == ML_KEM_1024_PRIVATE_BYTES && lengths[6] == ML_DSA_87_PRIVATE_BYTES) {
            "stored post-quantum private key size is invalid"
        }
    }

    private fun validateIdentity(userId: String, username: String) {
        require(USER_ID.matches(userId)) { "stored account user identifier is invalid" }
        require(username.length in 1..64) { "stored account username is invalid" }
    }

    private fun validateRefresh(refresh: ByteArray) {
        require(refresh.size in 16..RemoteAccountSession.MAX_TOKEN_BYTES) { "stored refresh token size is invalid" }
        require(refresh.all { value -> (value.toInt() and 0xff).toChar() in TOKEN_CHARACTERS }) {
            "stored refresh token encoding is invalid"
        }
    }

    private fun decodeUtf8(value: ByteArray): String = StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPORT)
        .onUnmappableCharacter(CodingErrorAction.REPORT)
        .decode(ByteBuffer.wrap(value))
        .toString()
}
