#!/usr/bin/env python3
# STATUS: DIAMANT VGT SUPREME

import hashlib
import os
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
MAX_SOURCE_BYTES = 5 * 1024 * 1024
TEXT_SCAN_BYTES = 1024 * 1024
GRADLE_WRAPPER_PATH = "Android/gradle/wrapper/gradle-wrapper.jar"
GRADLE_WRAPPER_SHA256 = "55243ef57851f12b070ad14f7f5bb8302daceeebc5bce5ece5fa6edb23e1145c"
APPROVED_BINARY_SHA256 = {
    "Frontend/frontend/src/sovereign/vendor/liboqs-hqc256/hqc-256.runtime.js": (
        "702568b508256ca21f2177726602c5cf8be88c38335f74a670056647da04559c"
    ),
    "Frontend/frontend/src/sovereign/wasm/gaiacom_sovereign_wasm_bg.wasm": (
        "29f40661b6b90325eb092697602b2fa12d2bf67e64cdaab9918c4fa8a1c35e19"
    ),
}

FORBIDDEN_COMPONENTS = {
    ".cache",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "target",
}
FORBIDDEN_SUFFIXES = {
    ".db",
    ".exe",
    ".key",
    ".log",
    ".pem",
    ".sqlite",
    ".sqlite3",
    ".tar.gz",
    ".zip",
}
FORBIDDEN_BASENAME_PATTERNS = (
    re.compile(r"^\.auth-.*-server\.pid$", re.IGNORECASE),
    re.compile(r"^(?:inspect|refactor)_.+\.py$", re.IGNORECASE),
    re.compile(r"^test_.+\.txt$", re.IGNORECASE),
    re.compile(r".+\.bak(?:_.+)?$", re.IGNORECASE),
)
ALLOWED_ENVIRONMENT_FILES = {".env.example", "Backend/.env.example"}
PRIVATE_KEY_PATTERN = re.compile(rb"-----BEGIN (?:[A-Z ]+ )?PRIVATE" + rb" KEY-----")
JWT_PATTERN = re.compile(rb"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")
AWS_SECRET_PATTERN = re.compile(rb"AKIA[0-9A-Z]{16}")
SECRET_ASSIGNMENT_PATTERN = re.compile(
    rb"(?im)^[ \t]*(?:GAIACOM_[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE_KEY)|JWT_SECRET|SMTP_PASSWORD|AWS_SECRET_ACCESS_KEY)[ \t]*=[ \t]*['\"]?([^'\"\s#]+)"
)


def prospective_files() -> list[str]:
    completed = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return sorted(path for path in completed.stdout.decode("utf-8", errors="strict").split("\x00") if path)


def forbidden_suffix(path: str) -> bool:
    lowered = path.lower()
    return any(lowered.endswith(suffix) for suffix in FORBIDDEN_SUFFIXES)


def placeholder_secret(value: bytes) -> bool:
    lowered = value.lower()
    return (
        value.startswith(b"<")
        or value in {b"...", b"***"}
        or any(marker in lowered for marker in (b"test_only", b"synthetic", b"fixture", b"replace", b"example"))
    )


def approved_binary_asset(path: str) -> bool:
    if path == GRADLE_WRAPPER_PATH:
        return True
    if path in APPROVED_BINARY_SHA256:
        return True
    lowered = path.lower()
    if not lowered.endswith((".png", ".webp", ".ico", ".icns")):
        return False
    return (
        path == "gaiacom.png"
        or path.startswith("DesktopClient/src-tauri/icons/")
        or path.startswith("Frontend/frontend/public/")
        or path.startswith("Frontend/frontend/src/")
    )


def inspect(path: str) -> list[str]:
    failures: list[str] = []
    pure_path = PurePosixPath(path)
    filesystem_path = ROOT / Path(*pure_path.parts)
    if not filesystem_path.exists():
        return [f"tracked/prospective file is missing: {path}"]
    if filesystem_path.is_symlink():
        return [f"symbolic links are forbidden in the release source: {path}"]
    if any(component in FORBIDDEN_COMPONENTS for component in pure_path.parts):
        failures.append(f"generated/dependency directory is present: {path}")
    if path.startswith("GaiaCom-") or path.startswith("GaiaCom_GitHub_Source_"):
        failures.append(f"release bundle is present in source: {path}")
    if pure_path.name == ".env" and path not in ALLOWED_ENVIRONMENT_FILES:
        failures.append(f"production/local environment file is present: {path}")
    if any(pattern.fullmatch(pure_path.name) for pattern in FORBIDDEN_BASENAME_PATTERNS):
        failures.append(f"local development artifact is present: {path}")
    if forbidden_suffix(path):
        failures.append(f"binary/runtime artifact is present: {path}")

    size = filesystem_path.stat().st_size
    if size > MAX_SOURCE_BYTES:
        failures.append(f"source file exceeds {MAX_SOURCE_BYTES} bytes: {path}")
        return failures
    if size > TEXT_SCAN_BYTES:
        return failures
    content = filesystem_path.read_bytes()
    if path == GRADLE_WRAPPER_PATH:
        actual = hashlib.sha256(content).hexdigest()
        if actual != GRADLE_WRAPPER_SHA256:
            failures.append(f"Gradle wrapper checksum mismatch: {path}")
    if path in APPROVED_BINARY_SHA256:
        actual = hashlib.sha256(content).hexdigest()
        if actual != APPROVED_BINARY_SHA256[path]:
            failures.append(f"approved binary checksum mismatch: {path}")
    if b"\x00" in content:
        if not approved_binary_asset(path):
            failures.append(f"unapproved binary content is present: {path}")
        return failures
    if PRIVATE_KEY_PATTERN.search(content):
        failures.append(f"private-key material detected: {path}")
    if JWT_PATTERN.search(content):
        failures.append(f"JWT-shaped credential detected: {path}")
    if AWS_SECRET_PATTERN.search(content):
        failures.append(f"AWS access-key identifier detected: {path}")
    for match in SECRET_ASSIGNMENT_PATTERN.finditer(content):
        value = match.group(1)
        if len(value) >= 16 and not placeholder_secret(value):
            failures.append(f"credential assignment without an explicit test placeholder detected: {path}")
            break
    return failures


def main() -> int:
    files = prospective_files()
    failures = [failure for path in files for failure in inspect(path)]
    if failures:
        print("[REPOSITORY-HYGIENE] BLOCKED")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print(f"[REPOSITORY-HYGIENE] PASS: {len(files)} source files checked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
