// STATUS: DIAMANT VGT SUPREME
plugins {
    id("com.android.library")
}

android {
    namespace = "de.gaiacom.platform.identity"
    compileSdk = 37
    buildToolsVersion = "37.0.0"

    defaultConfig {
        minSdk = 26
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = true
        warningsAsErrors = true
    }
}

dependencies {
    compileOnly(files(rootProject.file("native/gaiacom-mobile.aar")))
    testImplementation(kotlin("test-junit"))
}
