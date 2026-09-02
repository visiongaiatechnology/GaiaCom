import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


def base_url():
    return os.environ.get("GAIACOM_TEST_BASE_URL", "http://127.0.0.1:8080").rstrip("/")


def run_poc():
    backend = Path(__file__).resolve().parents[4] / "Backend"
    unit = subprocess.run(
        ["go", "test", "-count=1", "./utils", "./federation", "-run", "TestAdversarialSafeDialContextProduction|TestFederationSchemeNeverUsesSubstringDowngrade"],
        cwd=backend,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    if unit.returncode != 0 or "ok" not in unit.stdout:
        print(f"[FED-SSRF] FAIL: production dial-control tests failed: {(unit.stderr or unit.stdout).strip()}")
        return False

    url = f"{base_url()}/.well-known/gaiacom/s2s/v1/forward"
    headers = {
        "Content-Type": "application/json",
        "Authorization": 'X-Gaia-S2S-V1 Signature="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",KeyId="127.0.0.1",Timestamp="1718898000"',
    }
    request = urllib.request.Request(url, data=b'{"origin":"127.0.0.1","pdus":[]}', headers=headers, method="POST")
    try:
        urllib.request.urlopen(request, timeout=5)
        print("[FED-SSRF] FAIL: live endpoint accepted private federation origin")
        return False
    except urllib.error.HTTPError as exc:
        if exc.code != 401:
            print(f"[FED-SSRF] FAIL: unexpected live status {exc.code}")
            return False
    except Exception as exc:
        print(f"[FED-SSRF] FAIL: live assertion could not complete: {exc}")
        return False

    print("[FED-SSRF] PASS: production dial control, exact-host scheme policy, and live private-origin rejection verified")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
