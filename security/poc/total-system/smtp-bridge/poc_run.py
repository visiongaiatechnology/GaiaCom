"""STATUS: DIAMANT VGT SUPREME — executable SMTP downgrade-boundary gate."""

import os
from pathlib import Path
import subprocess
import sys


def run_poc():
    print("[TOTAL-SMTP] Verifying SMTP bridge isolation...")
    root = Path(__file__).resolve().parents[4]
    backend = root / "Backend"
    env = os.environ.copy()
    env["GAIACOM_DEV_MODE"] = "true"
    env["GAIACOM_SHIELD_SECRET"] = "smtp_bridge_assurance_secret_at_least_32_bytes"
    result = subprocess.run(
        ["go", "test", "./smtpbridge", "./mailbox", "-count=1"],
        cwd=backend,
        env=env,
        capture_output=True,
        text=True,
        timeout=90,
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        return False

    composer = (root / "Frontend" / "frontend" / "src" / "components" / "chat" / "ComposerPane.jsx").read_text(encoding="utf-8")
    reader = (root / "Frontend" / "frontend" / "src" / "components" / "chat" / "ReaderPane.jsx").read_text(encoding="utf-8")
    if "smtp-security-banner" not in composer or "untrusted-mail-banner" not in reader:
        print("[TOTAL-SMTP] FAIL: SMTP downgrade warnings are missing")
        return False
    if "dangerouslySetInnerHTML" in composer or "dangerouslySetInnerHTML" in reader:
        print("[TOTAL-SMTP] FAIL: unsafe HTML rendering exists in the SMTP boundary")
        return False

    print("[TOTAL-SMTP] PASS: ownership, ingest authentication, dangerous attachments, TLS relay, and untrusted UI boundaries hold")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
