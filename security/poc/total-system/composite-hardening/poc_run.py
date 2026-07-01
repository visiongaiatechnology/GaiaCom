# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import os
import re
import subprocess
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def run_command(args, cwd, timeout=90):
    env = os.environ.copy()
    backend_dir = repo_root() / "Backend"
    env["GAIACOM_DEV_MODE"] = "true"
    env["GAIACOM_SHIELD_SECRET"] = "composite_hardening_security_test_secret"
    env["GAIACOM_JWT_SECRET"] = "composite_hardening_jwt_secret_32_bytes_minimum"
    env["GOCACHE"] = str(backend_dir / ".gocache")
    result = subprocess.run(args, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.returncode != 0 and result.stderr.strip():
        print(result.stderr.strip())
    return result.returncode == 0


def assert_no_match(label, pattern, roots):
    combined = ""
    for root in roots:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            parts = set(path.parts)
            if {"node_modules", "build", ".git"} & parts:
                continue
            if path.suffix.lower() not in {".go", ".js", ".jsx", ".md"}:
                continue
            if path.name.endswith("_test.go"):
                continue
            combined += "\n" + path.read_text(encoding="utf-8", errors="ignore")
    if re.search(pattern, combined):
        print(f"[COMPOSITE-HARDENING] FAIL: {label}")
        return False
    print(f"[COMPOSITE-HARDENING] PASS: {label}")
    return True


def assert_json_parse_allowlist(label, root):
    allowed = {
        str(root / "utils" / "safeJson.js"),
        str(root / "crypto.js"),
    }
    offenders = []
    for path in root.rglob("*.js"):
        if not path.is_file() or "node_modules" in path.parts or "build" in path.parts:
            continue
        source = path.read_text(encoding="utf-8", errors="ignore")
        if "JSON.parse(" in source and str(path) not in allowed:
            offenders.append(str(path.relative_to(root)))
    if offenders:
        print(f"[COMPOSITE-HARDENING] FAIL: {label}: {', '.join(offenders[:8])}")
        return False
    print(f"[COMPOSITE-HARDENING] PASS: {label}")
    return True


def run_poc():
    root = repo_root()
    backend_dir = root / "Backend"
    frontend_src = root / "Frontend" / "frontend" / "src"
    docs_dir = root / "docs"

    print("[COMPOSITE-HARDENING] Running nested regression chain...")
    tests = [
        "TestStorageHandler",
        "TestStorageService",
        "TestStorageServiceEnforcesUserQuota",
        "TestStorageSweeperDeletesStalePendingUploadChunks",
        "TestLocalObjectStoreJailAndRoundTrip",
        "TestLocalObjectStoreRejectsOversizeAndDeletesPartial",
        "TestS3ObjectStoreSignsAndTransfersObjects",
        "TestS3ObjectStoreRejectsOversizeBeforeNetwork",
        "TestS3ObjectStoreRejectsEscapedKeys",
        "TestS3ObjectStoreConfigValidation",
        "TestSQLiteBusyRetryRetriesTransientLocks",
        "TestSQLiteBusyRetryRespectsContextCancel",
    ]
    pattern = "^(" + "|".join(tests) + ")$"
    if not run_command(["go", "test", "./storage", "./repository", "-run", pattern, "-count=1"], backend_dir):
        print("[COMPOSITE-HARDENING] FAIL: storage/governance nested backend regression failed")
        return False

    if not run_command(["go", "test", "./internal/security", "-count=1"], backend_dir):
        print("[COMPOSITE-HARDENING] FAIL: hermetic internal security tests failed")
        return False

    static_checks = [
        (
            "no direct err.Error() leaks through backend HTTP helpers",
            r"(WriteError|http\.Error)\([^\n]*err\.Error\(\)",
            [backend_dir],
        ),
        (
            "no broad production CSP style-src unsafe-inline regression",
            r"style-src 'self' 'unsafe-inline'",
            [backend_dir, docs_dir],
        ),
        (
            "no plaintext crypto session object is persisted in sessionStorage",
            r"sessionStorage\.setItem\(\s*['\"]gaia_crypto_session['\"]",
            [frontend_src],
        ),
        (
            "no mnemonic-bearing value is written to sessionStorage",
            r"sessionStorage\.setItem\([\s\S]{0,220}(mnemonic|seed|private|secret)",
            [frontend_src],
        ),
        (
            "no native browser modal primitives in GaiaCom UI code",
            r"(?<!deferredPrompt\.)\b(prompt|alert|confirm)\(",
            [frontend_src],
        ),
    ]
    for label, pattern, roots in static_checks:
        if not assert_no_match(label, pattern, roots):
            return False
    if not assert_json_parse_allowlist("frontend JSON.parse remains centralized behind safeJson/crypto decrypt", frontend_src):
        return False

    print("[COMPOSITE-HARDENING] PASS: nested Storage ACL + ObjectStore + SQLite busy retry + frontend/static hardening checks hold")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
