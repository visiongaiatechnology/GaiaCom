// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.app.session

import de.gaiacom.platform.remote.RemoteAccountSession
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets

internal data class StoredRemoteSession(
    val userId: String,
    val username: String,
    val refreshToken: ByteArray,
) : AutoCloseable {
    override fun close() = refreshToken.fill(0)
}

internal object StoredRemoteSessionCodec {
    private const val MAGIC = 0x47415331 // GAS1
    private const val VERSION: Byte = 1
    private const val HEADER_BYTES = 11
    private const val MAX_ENVELOPE_BYTES = 8_192

    fun encode(session: RemoteAccountSession): ByteArray {
        val userId = session.userId.encodeToByteArray()
        val username = session.username.encodeToByteArray()
        val refresh = session.refreshTokenCopy()
        try {
            require(userId.size <= 64 && username.size <= 256) { "remote session identity is too large" }
            val size = HEADER_BYTES + userId.size + username.size + refresh.size
            require(size <= MAX_ENVELOPE_BYTES) { "remote session envelope is too large" }
            return ByteBuffer.allocate(size)
                .order(ByteOrder.BIG_ENDIAN)
                .putInt(MAGIC)
                .put(VERSION)
                .putShort(userId.size.toShort())
                .putShort(username.size.toShort())
                .putShort(refresh.size.toShort())
                .put(userId)
                .put(username)
                .put(refresh)
                .array()
        } finally {
            userId.fill(0)
            username.fill(0)
            refresh.fill(0)
        }
    }

    fun decode(encoded: ByteArray): StoredRemoteSession {
        require(encoded.size in HEADER_BYTES..MAX_ENVELOPE_BYTES) { "remote session envelope has invalid size" }
        val buffer = ByteBuffer.wrap(encoded).order(ByteOrder.BIG_ENDIAN)
        require(buffer.int == MAGIC && buffer.get() == VERSION) { "remote session envelope header is invalid" }
        val userIdSize = buffer.short.toInt() and 0xffff
        val usernameSize = buffer.short.toInt() and 0xffff
        val refreshSize = buffer.short.toInt() and 0xffff
        require(userIdSize in 1..64 && usernameSize in 1..256) { "remote session identity size is invalid" }
        require(refreshSize in 16..RemoteAccountSession.MAX_TOKEN_BYTES) { "remote session token size is invalid" }
        require(buffer.remaining() == userIdSize + usernameSize + refreshSize) { "remote session envelope is truncated" }
        val userId = ByteArray(userIdSize).also(buffer::get)
        val username = ByteArray(usernameSize).also(buffer::get)
        val refresh = ByteArray(refreshSize).also(buffer::get)
        try {
            return StoredRemoteSession(
                userId = decodeUtf8(userId),
                username = decodeUtf8(username),
                refreshToken = refresh,
            )
        } catch (exception: Exception) {
            refresh.fill(0)
            throw exception
        } finally {
            userId.fill(0)
            username.fill(0)
        }
    }

    private fun decodeUtf8(value: ByteArray): String = StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPORT)
        .onUnmappableCharacter(CodingErrorAction.REPORT)
        .decode(ByteBuffer.wrap(value))
        .toString()
}
