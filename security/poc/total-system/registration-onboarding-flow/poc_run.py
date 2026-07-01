# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def read_text(path):
    return path.read_text(encoding="utf-8", errors="ignore")


def require(label, condition):
    if not condition:
        print(f"[REGISTRATION-ONBOARDING-FLOW] FAIL: {label}")
        return False
    print(f"[REGISTRATION-ONBOARDING-FLOW] PASS: {label}")
    return True


def run_poc():
    root = repo_root()
    auth_hook = read_text(root / "Frontend" / "frontend" / "src" / "hooks" / "useGaiaAuth.js")
    setup_wizard = read_text(root / "Frontend" / "frontend" / "src" / "components" / "auth" / "SetupWizard.js")
    app = read_text(root / "Frontend" / "frontend" / "src" / "App.js")
    auth_css = read_text(root / "Frontend" / "frontend" / "src" / "styles" / "auth.css")

    checks = [
        (
            "registration immediately authenticates user and opens setup wizard",
            "setUser(nextUser)" in auth_hook
            and "setWizardStep(1)" in auth_hook
            and "setShowWizard(true)" in auth_hook
            and "setShowRegSuccessPopup(false)" in auth_hook,
        ),
        (
            "identity creation retries once after Unauthorized by refreshing login session",
            "api.login(usernameInput, passwordInput)" in auth_hook
            and "identityErr" in auth_hook
            and "toLowerCase().includes('unauthorized')" in auth_hook,
        ),
        (
            "setup wizard contains integrated onboarding steps after address creation",
            "wizardStep === 4" in setup_wizard
            and "wizardStep === 5" in setup_wizard
            and "onboarding_security_title" in setup_wizard
            and "onboarding_launch_title" in setup_wizard,
        ),
        (
            "integrated onboarding suppresses duplicate first-run overlay",
            "gaia_integrated_onboarding_done_" in auth_hook
            and "gaia_integrated_onboarding_done_" in app,
        ),
        (
            "setup wizard has local app UI styling for onboarding cards",
            ".wizard-onboarding-grid" in auth_css
            and ".wizard-launch-grid" in auth_css,
        ),
        (
            "setup wizard avoids native browser popup primitives",
            "alert(" not in setup_wizard
            and "prompt(" not in setup_wizard
            and "confirm(" not in setup_wizard,
        ),
    ]

    ok = True
    for label, condition in checks:
        ok = require(label, condition) and ok

    if ok:
        print("[REGISTRATION-ONBOARDING-FLOW] PASS: registration, setup wizard, and integrated onboarding regression guard holds")
    return ok


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
