// STATUS: DIAMANT VGT SUPREME
plugins {
    kotlin("jvm")
}

kotlin {
    jvmToolchain(17)
    compilerOptions {
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    api(project(":platform:contracts"))
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}
