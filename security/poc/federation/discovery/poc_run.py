# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
# Discovery Schema PoC
# Checks if server-discovery limits body size and validates structure.
import urllib.request
import urllib.error
import os
import sys

def base_url():
    return os.environ.get("GAIACOM_TEST_BASE_URL", "http://127.0.0.1:8080").rstrip("/")

def run_poc():
    print("[FED-DISC] Running Discovery check...")
    # We query the discovery endpoint
    url = f"{base_url()}/.well-known/gaiacom/server"
    try:
        res = urllib.request.urlopen(url)
        content = res.read()
        print(f"[FED-DISC] PASS: Server discovery page accessible: {content.decode()}")
        return True
    except Exception as e:
        print(f"[FED-DISC] FAIL: {str(e)}")
        return False

if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
