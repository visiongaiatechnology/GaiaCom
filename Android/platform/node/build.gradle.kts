// STATUS: DIAMANT VGT SUPREME
plugins {
    id("com.android.library")
}

android {
    namespace = "de.gaiacom.platform.node"
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
}

dependencies {
    api(project(":platform:contracts"))
    implementation(files(rootProject.file("native/gaiacom-mobile.aar")))
    testImplementation(kotlin("test-junit"))
}
