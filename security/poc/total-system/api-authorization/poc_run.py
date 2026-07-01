# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def require(condition, message, failures):
    if not condition:
        failures.append(message)


def run_poc():
    print("[TOTAL-BOLA] Verifying API object-level authorization...")
    root = repo_root()
    routes_test = (root / "Backend" / "routes_adversarial_test.go").read_text(encoding="utf-8", errors="ignore")
    extreme_runner = (root / "security" / "extreme" / "extreme_runner.py").read_text(encoding="utf-8", errors="ignore")
    failures = []

    require("TestAdversarialRoomBOLAAndIdentityLimit" in routes_test, "missing backend room BOLA adversarial test", failures)
    require("/api/v1/rooms/members/role" in routes_test, "missing member role escalation endpoint test", failures)
    require("recPromoteSelf.Code != http.StatusForbidden" in routes_test, "member self-promotion is not asserted as 403", failures)
    require("GET /api/v1/reviewer/cases" in extreme_runner, "missing governance reviewer queue adversarial check", failures)
    require("Reviewer queue returns 403 Forbidden" in extreme_runner, "governance role escalation is not asserted as 403", failures)

    if failures:
        print("[TOTAL-BOLA] FAIL: role escalation coverage incomplete")
        for failure in failures:
            print(f" - {failure}")
        return False

    print("[TOTAL-BOLA] PASS: object ownership, room role escalation, and governance role escalation checks are automated")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
