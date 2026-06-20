# SMTP Open Relay PoC
# Verifies that unauthenticated users cannot send SMTP mail through the gateway.
import urllib.request
import urllib.error

def run_poc():
    print("[SMTP-OR] Running Open Relay check...")
    url = "http://localhost:8080/api/v1/smtp/send"
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
    run_poc()
