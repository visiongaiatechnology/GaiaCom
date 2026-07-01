# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
# Path Traversal Protection PoC
# Verifies that path traversal and double-slash anomalies are blocked by EdgeShieldMiddleware.
import urllib.request
import urllib.error
import os
import sys

def base_url():
    return os.environ.get("GAIACOM_TEST_BASE_URL", "http://127.0.0.1:8080").rstrip("/")

def run_poc():
    print("[PATH-TRAVERSAL] Running path traversal checks...")
    
    # 1. Test traversal attempt
    url_traversal = f"{base_url()}/api/v1/../../../etc/passwd"
    try:
        urllib.request.urlopen(url_traversal)
        print("[PATH-TRAVERSAL] FAIL: Traversal allowed without block")
        return False
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print("[PATH-TRAVERSAL] PASS: Traversal blocked with 400 Bad Request")
        else:
            print(f"[PATH-TRAVERSAL] FAIL: Expected 400 on traversal, got {e.code}")
            return False
    except Exception as e:
        print(f"[PATH-TRAVERSAL] FAIL: {str(e)}")
        return False

    # 2. Test double-slash attempt
    url_double_slash = f"{base_url()}/api/v1//double-slash"
    try:
        urllib.request.urlopen(url_double_slash)
        print("[PATH-TRAVERSAL] FAIL: Double-slash allowed without block")
        return False
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print("[PATH-TRAVERSAL] PASS: Double-slash anomaly blocked with 400 Bad Request")
        else:
            print(f"[PATH-TRAVERSAL] FAIL: Expected 400 on double-slash, got {e.code}")
            return False
    except Exception as e:
        print(f"[PATH-TRAVERSAL] FAIL: {str(e)}")
        return False
        
    return True

if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
