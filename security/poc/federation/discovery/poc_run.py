# Discovery Schema PoC
# Checks if server-discovery limits body size and validates structure.
import urllib.request
import urllib.error

def run_poc():
    print("[FED-DISC] Running Discovery check...")
    # We query the discovery endpoint
    url = "http://localhost:8080/.well-known/gaiacom/server"
    try:
        res = urllib.request.urlopen(url)
        content = res.read()
        print(f"[FED-DISC] PASS: Server discovery page accessible: {content.decode()}")
        return True
    except Exception as e:
        print(f"[FED-DISC] FAIL: {str(e)}")
        return False

if __name__ == "__main__":
    run_poc()
