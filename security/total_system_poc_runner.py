# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import subprocess
import sys
from pathlib import Path

base_dir = Path(__file__).resolve().parent / "poc" / "total-system"

pocs = [
    "crypto", "vault", "auth", "api-authorization", "frontend-rendering", "csp-inline-style-budget",
    "rooms", "messaging", "trustmesh", "gaiaproof", "trust-passport",
    "secure-disclosure", "gaiavault", "gaiadrop", "key-history",
    "native-mail-attachments", "composite-hardening",
    "federation", "smtp-bridge", "storage", "deployment", "supply-chain",
    "privacy", "denial-of-service", "logging-monitoring", "documentation-claims",
    "poc-runner-portability", "edition-boundary", "sqlite-concurrency"
]

passed = 0
failed = 0

print("==================================================")
print("GaiaCOM Total System Security Gate PoC Runner")
print("==================================================")

for p in pocs:
    script_path = base_dir / p / "poc_run.py"
    if not script_path.exists():
        print(f"[-] Missing: {p}")
        failed += 1
        continue
        
    print(f"[*] Running: {p}")
    try:
        res = subprocess.run([sys.executable, str(script_path)], capture_output=True, text=True, timeout=60)
        print(res.stdout.strip())
        if res.returncode == 0 and "FAIL" not in res.stdout:
            passed += 1
        else:
            if res.stderr:
                print(f"Error: {res.stderr.strip()}")
            failed += 1
    except Exception as e:
        print(f"[-] Execution failed: {str(e)}")
        failed += 1
    print("-" * 50)

print(f"\nSummary: {passed} passed, {failed} failed.")
if failed > 0:
    sys.exit(1)
else:
    sys.exit(0)
