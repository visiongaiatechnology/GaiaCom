# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def run_poc():
    print("[TOTAL-KEYHIST] Verifying key history warning states...")
    root = repo_root()
    detector = (root / "Frontend" / "frontend" / "src" / "hooks" / "useKeyChangeDetection.js").read_text(encoding="utf-8", errors="ignore")
    chat = (root / "Frontend" / "frontend" / "src" / "hooks" / "useChat.js").read_text(encoding="utf-8", errors="ignore")
    key_history = (root / "Frontend" / "frontend" / "src" / "utils" / "keyHistory.js").read_text(encoding="utf-8", errors="ignore")

    failures = []
    if "setKeyChangeWarning({" not in detector:
        failures.append("key change detector does not raise a blocking warning")
    if "setActiveChatContact(null)" not in detector:
        failures.append("key change cancellation does not close the active chat")
    if "appendKeyHistory(baseContact, fetchedKey, true)" not in detector:
        failures.append("new identity keys are not explicitly appended after confirmation")
    if "api.getPublicIdentity(recipientGaiaFormat)" not in chat or "verifyRecipientsAndRun" not in chat:
        failures.append("send flow does not re-resolve and verify recipient identity before encryption")
    if "existing = history.find" not in key_history or "confirmed" not in key_history:
        failures.append("key history utility does not track known keys and confirmation state")

    if failures:
        print("[TOTAL-KEYHIST] FAIL: silent key replacement protection incomplete")
        for failure in failures:
            print(f" - {failure}")
        return False

    print("[TOTAL-KEYHIST] PASS: silent key replacement triggers warning, closes untrusted chat, and requires explicit confirmation")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
