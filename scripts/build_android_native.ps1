# STATUS: DIAMANT VGT SUPREME
[CmdletBinding()]
param(
    [string]$OutputPath = "Android/native/gaiacom-mobile.aar"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$androidRoot = Join-Path $workspace "Android"
$backendRoot = Join-Path $workspace "Backend"
$sdkRoot = Join-Path $androidRoot ".toolchains/android-sdk"
$ndkRoot = Join-Path $sdkRoot "ndk/29.0.14206865"
$platformJar = Join-Path $sdkRoot "platforms/android-37.0/android.jar"
$buildToolsRoot = Join-Path $sdkRoot "build-tools/37.0.0"
$jdkContainer = Join-Path $androidRoot ".toolchains/jdk17"
$goMobileBin = Join-Path $androidRoot ".toolchains/go-mobile/bin"
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $workspace $OutputPath))
$nativeRoot = [System.IO.Path]::GetFullPath((Join-Path $androidRoot "native"))

if (-not $resolvedOutput.StartsWith($nativeRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Native output must remain inside Android/native."
}
foreach ($required in @($platformJar, $buildToolsRoot, $ndkRoot)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required Android toolchain component is missing: $required"
    }
}
foreach ($tool in @("gomobile.exe", "gobind.exe")) {
    $toolPath = Join-Path $goMobileBin $tool
    if (-not (Test-Path -LiteralPath $toolPath -PathType Leaf)) {
        throw "Verified Go mobile tool is missing: $toolPath"
    }
}

$jdk = Get-ChildItem -LiteralPath $jdkContainer -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "bin/java.exe") } |
    Select-Object -First 1
if ($null -eq $jdk) {
    throw "Verified JDK 17 installation is missing."
}

$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:ANDROID_NDK_HOME = $ndkRoot
$env:GOCACHE = Join-Path $backendRoot ".gocache-android-native"
$env:GOMODCACHE = Join-Path $backendRoot ".gomodcache-mobile"
$env:PATH = "$goMobileBin;$($jdk.FullName)\bin;C:\Windows\System32;C:\Windows;$env:PATH"
$gomobilePath = Join-Path $goMobileBin "gomobile.exe"

New-Item -ItemType Directory -Path (Split-Path -Parent $resolvedOutput) -Force | Out-Null
if (Test-Path -LiteralPath $resolvedOutput) {
    Remove-Item -LiteralPath $resolvedOutput -Force
}

Push-Location $backendRoot
try {
    & $gomobilePath bind `
        -target "android/arm64,android/amd64" `
        -androidapi 23 `
        -javapkg "de.gaiacom.nativecore" `
        -trimpath `
        -ldflags "-s -w -buildid=" `
        -o $resolvedOutput `
        "gaiacom/backend/mobileapi"
    if ($LASTEXITCODE -ne 0) {
        throw "gomobile bind failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedOutput)
try {
    $entries = @($archive.Entries | ForEach-Object { $_.FullName })
    $requiredEntries = @(
        "AndroidManifest.xml",
        "classes.jar",
        "jni/arm64-v8a/libgojni.so",
        "jni/x86_64/libgojni.so"
    )
    foreach ($entry in $requiredEntries) {
        if ($entry -notin $entries) {
            throw "Generated AAR is missing required entry: $entry"
        }
    }
} finally {
    $archive.Dispose()
}

$hash = (Get-FileHash -LiteralPath $resolvedOutput -Algorithm SHA256).Hash.ToLowerInvariant()
$hashRecord = "$hash  $([System.IO.Path]::GetFileName($resolvedOutput))`n"
[System.IO.File]::WriteAllText("$resolvedOutput.sha256", $hashRecord, [System.Text.UTF8Encoding]::new($false))
Write-Output "ANDROID_NATIVE_AAR=$resolvedOutput"
Write-Output "SHA256=$hash"
