// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.api

sealed class GaiaApiException protected constructor(
    message: String,
    cause: Throwable? = null,
) : IllegalStateException(message, cause)

class GaiaApiPolicyException internal constructor(cause: Throwable? = null) :
    GaiaApiException("GaiaCom API request rejected by local policy.", cause)

class GaiaApiAuthenticationException internal constructor() :
    GaiaApiException("GaiaCom API session is not authorized.")

class GaiaApiRateLimitException internal constructor() :
    GaiaApiException("GaiaCom API rate limit reached.")

class GaiaApiRequestRejectedException internal constructor() :
    GaiaApiException("GaiaCom API request was rejected by the server.")

class GaiaApiServerException internal constructor() :
    GaiaApiException("GaiaCom API server is temporarily unavailable.")

class GaiaApiNetworkException internal constructor(cause: Throwable? = null) :
    GaiaApiException("GaiaCom API network connection failed.", cause)

class GaiaApiTlsException internal constructor(cause: Throwable? = null) :
    GaiaApiException("GaiaCom API TLS validation failed.", cause)

class GaiaApiTimeoutException internal constructor(cause: Throwable? = null) :
    GaiaApiException("GaiaCom API request timed out.", cause)

class GaiaApiResponseTooLargeException internal constructor() :
    GaiaApiException("GaiaCom API response exceeded its local size boundary.")

class GaiaApiProtocolException internal constructor(cause: Throwable? = null) :
    GaiaApiException("GaiaCom API response violated the protocol contract.", cause)

class GaiaApiParseException internal constructor(cause: Throwable? = null) :
    GaiaApiException("GaiaCom API response could not be decoded safely.", cause)
