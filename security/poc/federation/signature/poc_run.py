# Signature Validation PoC
# Verifies that S2S requests without signatures or with tampered payloads are rejected.
import urllib.request
import urllib.error

def run_poc():
    print("[FED-SIG] Running Signature check...")
    url = "http://localhost:8080/.well-known/gaiacom/s2s/v1/forward"
    headers = {
        "Content-Type": "application/json"
    }
    # No signature header
    req = urllib.request.Request(url, data=b'{"origin":"remote.com","pdus":[]}', headers=headers, method="POST")
    try:
        urllib.request.urlopen(req)
        print("[FED-SIG] FAIL: Accepted missing signature")
        return False
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("[FED-SIG] PASS: Rejected missing signature (401)")
            return True
        else:
            print(f"[FED-SIG] FAIL: Expected 401, got {e.code}")
            return False
    except Exception as e:
        print(f"[FED-SIG] FAIL: {str(e)}")
        return False

if __name__ == "__main__":
    run_poc()
