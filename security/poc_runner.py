# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import subprocess
import sys
from pathlib import Path

base_dir = Path(__file__).resolve().parent / "poc"

pocs = [
    r"federation\ssrf",
    r"federation\discovery",
    r"federation\signature",
    r"federation\replay",
    r"federation\trust-boundary",
    r"federation\metadata-leak",
    r"smtp-bridge\open-relay",
    r"smtp-bridge\downgrade",
    r"smtp-bridge\header-injection",
    r"smtp-bridge\address-validation",
    r"smtp-bridge\spam-abuse",
    r"smtp-bridge\secret-leak",
    r"smtp-bridge\dmarc-dkim-spf",
    r"smtp-bridge\bounce-handling"
]

passed = 0
failed = 0

print("==================================================")
print("GaiaCOM Federation + SMTP Bridge Security Gate PoC Runner")
print("==================================================")

for p in pocs:
    script_path = base_dir / Path(p) / "poc_run.py"
    if not script_path.exists():
        print(f"[-] Missing: {p}")
        failed += 1
        continue
        
    print(f"[*] Running: {p}")
    try:
        # run python script and capture output
        res = subprocess.run([sys.executable, str(script_path)], capture_output=True, text=True, timeout=10)
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
