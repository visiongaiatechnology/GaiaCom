# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import os
import subprocess
import sys
from pathlib import Path


def run_go_regression(test_pattern):
    repo_root = Path(__file__).resolve().parents[4]
    backend_dir = repo_root / "Backend"
    env = os.environ.copy()
    env["GAIACOM_DEV_MODE"] = "true"
    env["GAIACOM_SHIELD_SECRET"] = "native_mail_attachment_security_test_secret"
    env["GOCACHE"] = str(backend_dir / ".gocache")

    result = subprocess.run(
        ["go", "test", "./storage", "./internal/security", "-run", test_pattern, "-count=1"],
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.returncode != 0:
        if result.stderr.strip():
            print(result.stderr.strip())
        return False
    return True


def run_poc():
    print("[NATIVE-MAIL-ATTACHMENTS] Running bundled attack regression checks...")
    tests = [
        "TestStorageServiceRejectsBundledUploadAttacks",
        "TestAttachmentGuardRejectsBundledNativeAttachmentAttacks",
    ]
    pattern = "^(" + "|".join(tests) + ")$"

    if not run_go_regression(pattern):
        print("[NATIVE-MAIL-ATTACHMENTS] FAIL: bundled storage/attachment attack regression failed")
        return False

    print("[NATIVE-MAIL-ATTACHMENTS] PASS: 10GiB envelope boundary, 1MiB chunk ceiling, and dangerous MIME/extension bundles are enforced")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
