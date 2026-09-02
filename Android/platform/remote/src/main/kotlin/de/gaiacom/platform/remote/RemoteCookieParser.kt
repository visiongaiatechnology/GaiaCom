// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.remote

internal object RemoteCookieParser {
    private val NAME = Regex("[!#$%&'*+.^_`|~0-9A-Za-z-]{1,64}")
    private val VALUE = Regex("[A-Za-z0-9._~-]{16,4096}")

    fun extract(headers: Map<String?, List<String>>): Map<String, ByteArray> {
        val result = linkedMapOf<String, ByteArray>()
        headers.forEach { (name, values) ->
            if (!name.equals("Set-Cookie", ignoreCase = true)) {
                return@forEach
            }
            values.forEach { header ->
                val pair = header.substringBefore(';').trim()
                val separator = pair.indexOf('=')
                if (separator <= 0) {
                    return@forEach
                }
                val cookieName = pair.substring(0, separator).trim()
                val cookieValue = pair.substring(separator + 1).trim()
                if (NAME.matches(cookieName) && VALUE.matches(cookieValue)) {
                    result[cookieName] = cookieValue.encodeToByteArray()
                }
            }
        }
        return result
    }
}
