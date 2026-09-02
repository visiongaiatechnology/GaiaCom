// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.node

internal data class NativeNodeResponse(
    val statusCode: Int,
    val headerNames: Array<String>,
    val headerValues: Array<String>,
    val body: ByteArray,
)

internal interface NativeNodeBinding {
    fun open(bootstrap: NativeBootstrap): NativeNodeSession
}

internal interface NativeNodeSession : NativeTransportSession {
    fun execute(
        method: String,
        path: String,
        headerNames: Array<String>,
        headerValues: Array<String>,
        body: ByteArray,
    ): NativeNodeResponse

    fun close()
}
