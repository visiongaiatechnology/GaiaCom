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

    repo_root = Path(__file__).resolve().parents[4]
    crypto_source = (repo_root / "Frontend" / "frontend" / "src" / "crypto.js").read_text(encoding="utf-8")
    start = crypto_source.find("export async function stripImageMetadata")
    end = crypto_source.find("export async function encryptFileSymmetric", start)
    metadata_guard = crypto_source[start:end]
    required = (
        "createImageBitmap(file)",
        "40_000_000",
        "Unsupported image format.",
        "Image rejected by secure metadata processing.",
        "context.drawImage",
        "canvas.toBlob",
    )
    if start < 0 or end < 0 or any(item not in metadata_guard for item in required):
        print("[NATIVE-MAIL-ATTACHMENTS] FAIL: fail-closed image metadata re-encoding is incomplete")
        return False
    if "FileReader" in metadata_guard or "resolve(file)" in metadata_guard:
        print("[NATIVE-MAIL-ATTACHMENTS] FAIL: image sanitization retains a fail-open/base64 path")
        return False

    print("[NATIVE-MAIL-ATTACHMENTS] PASS: envelope/chunk limits, dangerous bundles, and fail-closed image metadata re-encoding are enforced")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
