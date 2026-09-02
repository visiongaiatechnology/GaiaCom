import subprocess
import sys
from pathlib import Path


def run_poc():
    backend = Path(__file__).resolve().parents[4] / "Backend"
    result = subprocess.run(
        ["go", "test", "-count=1", ".", "./federation", "-run", "TestAdversarialReplayAndSkew|TestValidateAuthenticatedPayload"],
        cwd=backend,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    if result.returncode != 0:
        print(f"[FED-REPLAY] FAIL: {(result.stderr or result.stdout).strip()}")
        return False
    if "ok" not in result.stdout:
        print("[FED-REPLAY] FAIL: targeted replay tests did not execute")
        return False
    print("[FED-REPLAY] PASS: replay, timestamp, origin binding, and signed-PDU tests executed")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
