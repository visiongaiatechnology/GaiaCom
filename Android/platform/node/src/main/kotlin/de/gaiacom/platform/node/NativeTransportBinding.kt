// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

internal interface NativeTransportLease : AutoCloseable {
    val envelopeId: String
    val recipient: String
    val allowedTransports: Int
    val attempts: Int

    fun payloadCopy(): ByteArray
}

internal interface NativeTransportSession {
    fun queueEnvelope(
        envelopeId: String,
        recipient: String,
        payload: ByteArray,
        signature: ByteArray,
        allowedTransports: Int,
        priority: Int,
        createdAtUnixMillis: Long,
        expiresAtUnixMillis: Long,
    ): Boolean

    fun claimEnvelope(nowUnixMillis: Long): NativeTransportLease?

    fun completeEnvelope(lease: NativeTransportLease, transport: Int, nowUnixMillis: Long)

    fun deferEnvelope(lease: NativeTransportLease, reasonCode: String, deadLetter: Boolean, nowUnixMillis: Long)

    fun claimInboundEnvelope(
        envelopeId: String,
        payloadHash: ByteArray,
        transport: Int,
        nowUnixMillis: Long,
        expiresAtUnixMillis: Long,
    ): Int
}
