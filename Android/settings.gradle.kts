// STATUS: DIAMANT VGT SUPREME
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "GaiaComAndroid"

include(":platform:contracts")
include(":platform:kernel")
include(":platform:node")
include(":platform:security")
include(":platform:security-android")
include(":platform:security-auth")
include(":platform:runtime")
include(":platform:remote")
include(":platform:api")
include(":platform:identity")
include(":app")
