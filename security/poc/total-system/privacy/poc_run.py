import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def run_poc():
    print("[TOTAL-PRIVACY] Checking metadata exposure on public endpoints...")
    root = repo_root()
    handler = (root / "Backend" / "identity" / "identity_handler.go").read_text(encoding="utf-8", errors="ignore")
    test = (root / "Backend" / "identity" / "identity_test.go").read_text(encoding="utf-8", errors="ignore")
    auth = (root / "Backend" / "auth" / "auth_service.go").read_text(encoding="utf-8", errors="ignore")

    failures = []
    if "neutralPublicIdentity" not in handler or "neutralTrustPassport" not in handler:
        failures.append("public identity/trust passport neutral responses are missing")
    if 'http.StatusNotFound, "Identity not found"' in handler or 'http.StatusNotFound, "Trust passport not found"' in handler:
        failures.append("public identity/trust passport still exposes not-found status oracle")
    if "GetPublicIdentity - Not found returns neutral response" not in test:
        failures.append("missing backend regression test for GaiaID enumeration neutrality")
    if "expected 200 neutral response" not in test:
        failures.append("neutral unresolved identity status is not asserted")
    if "dummyPasswordHash" not in auth or "bcrypt.CompareHashAndPassword(dummyPasswordHash" not in auth:
        failures.append("unknown-user login path lacks equivalent password-hash work")

    if failures:
        print("[TOTAL-PRIVACY] FAIL: GaiaID enumeration neutrality incomplete")
        for failure in failures:
            print(f" - {failure}")
        return False

    print("[TOTAL-PRIVACY] PASS: public identity endpoints are neutral and unknown-user login performs equivalent password-hash work")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
