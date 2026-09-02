# STATUS: DIAMANT VGT SUPREME
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$androidRoot = Join-Path $workspace "Android"
$sdkRoot = Join-Path $androidRoot ".toolchains/android-sdk"
$sdkManager = Join-Path $sdkRoot "cmdline-tools/latest/bin/sdkmanager.bat"
$jdkContainer = Join-Path $androidRoot ".toolchains/jdk17"

if (-not (Test-Path -LiteralPath $sdkManager)) {
    throw "Verified Android SDK Manager is missing: $sdkManager"
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
$env:PATH = "$($jdk.FullName)\bin;C:\Windows\System32;C:\Windows;$env:PATH"

Write-Output "Google Android SDK license review starts now."
Write-Output "Read each license and answer the prompts yourself; this script never auto-accepts."
& $sdkManager --sdk_root=$sdkRoot --licenses
if ($LASTEXITCODE -ne 0) {
    throw "Android SDK license review failed with exit code $LASTEXITCODE."
}

$licenseRoot = Join-Path $sdkRoot "licenses"
$licenseFiles = if (Test-Path -LiteralPath $licenseRoot) {
    @(Get-ChildItem -LiteralPath $licenseRoot -File)
} else {
    @()
}
if ($licenseFiles.Count -eq 0) {
    throw "No Android SDK license records were created."
}
Write-Output "ANDROID_SDK_LICENSES_RECORDED=$($licenseFiles.Count)"
