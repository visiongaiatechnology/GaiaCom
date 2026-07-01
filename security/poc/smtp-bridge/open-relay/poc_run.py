# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
# SMTP Open Relay PoC
# Verifies that unauthenticated users cannot send SMTP mail through the gateway.
import urllib.request
import urllib.error
import os
import sys

def base_url():
    return os.environ.get("GAIACOM_TEST_BASE_URL", "http://127.0.0.1:8080").rstrip("/")

def run_poc():
    print("[SMTP-OR] Running Open Relay check...")
    url = f"{base_url()}/api/v1/smtp/send"
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=b'{"to":"victim@external.com","subject":"spam","body":"spam"}', headers=headers, method="POST")
    try:
        urllib.request.urlopen(req)
        print("[SMTP-OR] FAIL: Open Relay send allowed without authentication")
        return False
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("[SMTP-OR] PASS: Blocked unauthenticated SMTP relay (401)")
            return True
        else:
            print(f"[SMTP-OR] FAIL: Expected 401, got {e.code}")
            return False
    except Exception as e:
        print(f"[SMTP-OR] FAIL: {str(e)}")
        return False

if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
