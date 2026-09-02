// STATUS: DIAMANT VGT SUPREME
plugins {
    id("com.android.library")
}

android {
    namespace = "de.gaiacom.platform.security.android"
    compileSdk = 37
    buildToolsVersion = "37.0.0"

    defaultConfig {
        minSdk = 23
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isIncludeAndroidResources = false
    }
}

dependencies {
    api(project(":platform:security"))
    testImplementation(kotlin("test-junit"))
}
