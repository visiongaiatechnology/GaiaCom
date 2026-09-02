// STATUS: DIAMANT VGT SUPREME
plugins {
    id("com.android.library")
}

android {
    namespace = "de.gaiacom.platform.security.auth"
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
}

dependencies {
    api(project(":platform:security-android"))
    api("androidx.fragment:fragment:1.8.9")
    implementation("androidx.biometric:biometric:1.1.0")
    testImplementation(kotlin("test-junit"))
}
