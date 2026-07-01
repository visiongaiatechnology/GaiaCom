# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import re
import sys
from pathlib import Path


FORBIDDEN_PATTERNS = [
    r"\breadAllMessages\b",
    r"\bdecryptUserData\b",
    r"\bimpersonateUser\b",
    r"\bexportPrivateKeys\b",
    r"\bserverMasterKey\b",
    r"\bbypassE2EE\b",
    r"MASTER_KEY",
    r"GOD_MODE",
    r"godMode",
]

SKIP_DIRS = {
    ".git",
    "node_modules",
    "build",
    "dist",
    ".cache",
    ".gocache",
    "__pycache__",
    "GaiaCOM Defense",
    "GaiaCOM Enterprise",
}

SCAN_SUFFIXES = {".go", ".js", ".jsx", ".ts", ".tsx", ".py", ".md", ".json", ".yml", ".yaml"}


def repo_root():
    return Path(__file__).resolve().parents[4]


def should_scan(path):
    if path.name == "poc_run.py" and "edition-boundary" in str(path):
        return False
    if any(part in SKIP_DIRS for part in path.parts):
        return False
    return path.suffix in SCAN_SUFFIXES


def run_poc():
    print("[EDITION-BOUNDARY] Verifying Core zero-trust and edition isolation guardrails...")
    root = repo_root()
    invariant_path = root / "SECURITY_INVARIANTS.md"
    failures = []

    if not invariant_path.exists():
        failures.append("SECURITY_INVARIANTS.md is missing")
    else:
        invariants = invariant_path.read_text(encoding="utf-8", errors="ignore")
        for required in [
            "The server must never receive plaintext",
            "Forbidden Core Capabilities",
            "Hook Sandbox",
            "Runtime Isolation",
            "Enterprise and Defense must consume Core through explicit capability-checked APIs",
        ]:
            if required not in invariants:
                failures.append(f"security invariant missing: {required}")

    hits = []
    for path in root.rglob("*"):
        if not path.is_file() or not should_scan(path):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        rel = path.relative_to(root)
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, text):
                if rel.as_posix() == "SECURITY_INVARIANTS.md":
                    continue
                hits.append(f"{rel}: forbidden capability pattern {pattern}")

    if hits:
        failures.extend(hits)

    if failures:
        print("[EDITION-BOUNDARY] FAIL: edition/core isolation guardrail violation")
        for failure in failures:
            print(f" - {failure}")
        return False

    print("[EDITION-BOUNDARY] PASS: no god-mode capabilities or E2EE bypass hooks exist in Core/Edition sources")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
