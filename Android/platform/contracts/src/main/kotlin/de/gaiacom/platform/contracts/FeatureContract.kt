// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.contracts

enum class FeatureId {
    AUTH,
    DASHBOARD,
    MAIL,
    CHAT,
    GROUPS,
    CHANNELS,
    GSN,
    DRIVE,
    DROP,
    CONTACTS,
    PROFILE,
    SECURITY,
    GOVERNANCE,
    NETWORK,
    SETTINGS,
}

data class FeatureDescriptor(
    val id: FeatureId,
    val route: String,
    val title: String,
) {
    init {
        require(route.matches(Regex("^[a-z][a-z0-9-]{1,63}$"))) { "feature route is invalid" }
        require(title.isNotBlank() && title.length <= 64) { "feature title is invalid" }
    }
}
