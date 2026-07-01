# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import os
import subprocess
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def run_poc():
    root = repo_root()
    backend_dir = root / "Backend"
    env = os.environ.copy()
    env["GAIACOM_DEV_MODE"] = "true"
    env["GAIACOM_SHIELD_SECRET"] = "storage_download_acl_security_test_secret"
    env["GAIACOM_JWT_SECRET"] = "storage_download_acl_jwt_secret_32_bytes_minimum"
    env["GOCACHE"] = str(backend_dir / ".gocache")

    print("[STORAGE-DOWNLOAD-ACL] Verifying foreign fileId downloads are rejected...")
    result = subprocess.run(
        ["go", "test", "./storage", "-run", "^TestStorageHandler$", "-count=1"],
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True,
        timeout=90,
    )
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.returncode != 0:
        if result.stderr.strip():
            print(result.stderr.strip())
        print("[STORAGE-DOWNLOAD-ACL] FAIL: storage handler ACL regression failed")
        return False
    print("[STORAGE-DOWNLOAD-ACL] PASS: unauthorised users cannot download foreign fileIds")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
