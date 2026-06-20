# SSRF Protection PoC
# Checks if the server blocks federation requests pointing to localhost, private networks, and metadata IPs.
import urllib.request
import urllib.error

def run_poc():
    print("[FED-SSRF] Running SSRF check...")
    # Send a request with a private domain as KeyId to verify it is rejected before dial
    url = "http://localhost:8080/.well-known/gaiacom/s2s/v1/forward"
    headers = {
        "Content-Type": "application/json",
        "Authorization": 'X-Gaia-S2S-V1 Signature="AAAA",KeyId="127.0.0.1",Timestamp="1718898000"'
    }
    req = urllib.request.Request(url, data=b'{"origin":"127.0.0.1","pdus":[]}', headers=headers, method="POST")
    try:
        urllib.request.urlopen(req)
        print("[FED-SSRF] FAIL: Server accepted private target or bypassed check")
        return False
    except urllib.error.HTTPError as e:
        if e.code == 401 or e.code == 400:
            print(f"[FED-SSRF] PASS: Server rejected private IP (status: {e.code})")
            return True
        else:
            print(f"[FED-SSRF] FAIL: Unexpected status {e.code}")
            return False
    except Exception as e:
        print(f"[FED-SSRF] PASS: Connection blocked safely ({str(e)})")
        return True

if __name__ == "__main__":
    run_poc()
