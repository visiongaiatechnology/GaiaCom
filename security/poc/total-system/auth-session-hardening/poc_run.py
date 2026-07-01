# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import re
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def read_text(path):
    return path.read_text(encoding="utf-8", errors="ignore")


def require(label, condition):
    if not condition:
        print(f"[AUTH-SESSION-HARDENING] FAIL: {label}")
        return False
    print(f"[AUTH-SESSION-HARDENING] PASS: {label}")
    return True


def run_poc():
    root = repo_root()
    auth_hook = read_text(root / "Frontend" / "frontend" / "src" / "hooks" / "useGaiaAuth.js")
    profile_actions = read_text(root / "Frontend" / "frontend" / "src" / "utils" / "useProfileActions.js")
    profile_pane = read_text(root / "Frontend" / "frontend" / "src" / "components" / "chat" / "ProfilePane.js")
    unlock_screen = read_text(root / "Frontend" / "frontend" / "src" / "components" / "auth" / "UnlockScreen.js")

    iteration_match = re.search(r"const\s+PIN_KDF_ITERATIONS\s*=\s*(\d+)", profile_actions)
    iterations = int(iteration_match.group(1)) if iteration_match else 0

    checks = [
        (
            "crypto session mnemonic is memory-only, not persisted to sessionStorage",
            "sessionStorage.setItem('gaia_crypto_session'" not in auth_hook
            and 'sessionStorage.setItem("gaia_crypto_session"' not in auth_hook,
        ),
        (
            "PIN/device-code unlock has client-side retry lockout",
            "recordPinUnlockFailure" in auth_hook
            and "lockedUntil" in auth_hook
            and "failures >= 10 ? 60" in auth_hook,
        ),
        (
            "new device-code KDF profile uses at least 2.5M PBKDF2 iterations",
            iterations >= 2500000,
        ),
        (
            "new local unlock code has a 16-64 character entropy floor",
            "DEVICE_CODE_MIN_LENGTH = 16" in profile_actions
            and "DEVICE_CODE_MAX_LENGTH = 64" in profile_actions
            and "device-code-v2" in profile_actions,
        ),
        (
            "weak numeric, repeated, sequential, low-diversity, and common unlock-code patterns are rejected",
            "hasWeakDeviceCodePattern" in profile_actions
            and "/^\\d+$/.test(normalized)" in profile_actions
            and "if (ascending || descending) return true" in profile_actions
            and "uniqueChars < 8" in profile_actions
            and "classCount < 3 && !strongPassphrase" in profile_actions
            and "password|passwort|gaiacom" in profile_actions,
        ),
        (
            "profile UI no longer strips unlock code to numeric-only 12 digit PINs",
            "replace(/\\D/g" not in profile_pane
            and 'inputMode="text"' in profile_pane
            and "Geraete-Code 16-64 Zeichen" in profile_pane,
        ),
        (
            "unlock UI supports alphanumeric device-code entry while keeping legacy PIN mode route",
            "Geraete-Code / alte PIN" in unlock_screen
            and "unlockMode === 'pin' ? 'pin' : 'password'" in unlock_screen,
        ),
    ]

    ok = True
    for label, condition in checks:
      ok = require(label, condition) and ok

    if ok:
        print("[AUTH-SESSION-HARDENING] PASS: mnemonic persistence, local unlock code, and retry lockout protections hold")
    return ok


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
