#!/usr/bin/env python3
# STATUS: DIAMANT VGT SUPREME

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ANDROID_ROOT = ROOT / "Android"
MAX_SOURCE_LINES = 500
SOURCE_SUFFIXES = {".kt", ".kts", ".java", ".rs", ".go", ".c", ".cc", ".cpp", ".h", ".hpp"}
IGNORED_COMPONENTS = {".gradle", ".toolchains", "build"}
FORBIDDEN_GLOBAL = {
    "android.webkit.WebView": "WebView is forbidden",
    "android.webkit.WebViewClient": "WebView is forbidden",
}
FORBIDDEN_FEATURE_IMPORTS = {
    "android.bluetooth.": "Bluetooth belongs to transport modules",
    "android.net.wifi.": "Wi-Fi belongs to transport modules",
    "android.security.keystore.": "Keystore belongs to platform:security",
    "java.net.HttpURLConnection": "networking belongs to platform:transport",
    "java.security.": "cryptography belongs to platform:security",
    "javax.crypto.": "cryptography belongs to platform:security",
    "android.database.sqlite.": "persistence belongs to platform:node",
}
FEATURE_DEPENDENCY = re.compile(r"project\(\s*[\"']:(?:feature)[^\"']+[\"']\s*\)")


def source_files() -> list[Path]:
    if not ANDROID_ROOT.exists():
        return []
    return sorted(
        path
        for path in ANDROID_ROOT.rglob("*")
        if path.is_file()
        and path.suffix.lower() in SOURCE_SUFFIXES
        and not any(component in IGNORED_COMPONENTS for component in path.relative_to(ANDROID_ROOT).parts)
    )


def inspect(path: Path) -> list[str]:
    relative = path.relative_to(ROOT).as_posix()
    content = path.read_text(encoding="utf-8")
    findings: list[str] = []
    line_count = len(content.splitlines())
    if line_count > MAX_SOURCE_LINES:
        findings.append(f"{relative}: {line_count} lines exceeds {MAX_SOURCE_LINES}")
    for token, reason in FORBIDDEN_GLOBAL.items():
        if token in content:
            findings.append(f"{relative}: {reason} ({token})")
    if "/feature/" in f"/{relative.lower()}/" or relative.lower().startswith("android/feature/"):
        for token, reason in FORBIDDEN_FEATURE_IMPORTS.items():
            if token in content:
                findings.append(f"{relative}: {reason} ({token})")
        if path.name.endswith(".gradle.kts") and FEATURE_DEPENDENCY.search(content):
            findings.append(f"{relative}: feature-to-feature dependency is forbidden")
    return findings


def main() -> int:
    files = source_files()
    findings = [finding for path in files for finding in inspect(path)]
    if findings:
        print("[ANDROID-ARCHITECTURE] BLOCKED")
        for finding in findings:
            print(f"- {finding}")
        return 1
    print(f"[ANDROID-ARCHITECTURE] PASS: {len(files)} source files checked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
