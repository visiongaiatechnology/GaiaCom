import os
import subprocess
import sys

base_dir = r"c:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM\security\poc\total-system"

pocs = [
    "crypto", "vault", "auth", "api-authorization", "frontend-rendering",
    "rooms", "messaging", "trustmesh", "gaiaproof", "trust-passport",
    "secure-disclosure", "gaiavault", "gaiadrop", "key-history",
    "federation", "smtp-bridge", "storage", "deployment", "supply-chain",
    "privacy", "denial-of-service", "logging-monitoring", "documentation-claims"
]

passed = 0
failed = 0

print("==================================================")
print("GaiaCOM Total System Security Gate PoC Runner")
print("==================================================")

for p in pocs:
    script_path = os.path.join(base_dir, p, "poc_run.py")
    if not os.path.exists(script_path):
        print(f"[-] Missing: {p}")
        failed += 1
        continue
        
    print(f"[*] Running: {p}")
    try:
        res = subprocess.run([sys.executable, script_path], capture_output=True, text=True, timeout=10)
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
