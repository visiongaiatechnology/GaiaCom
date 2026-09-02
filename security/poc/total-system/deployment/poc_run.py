"""STATUS: DIAMANT VGT SUPREME — executable deployment policy audit."""

from pathlib import Path
import sys


def run_poc():
    print("[TOTAL-DEPLOY] Checking production deployment configuration...")
    root = Path(__file__).resolve().parents[4]
    nginx = (root / "deploy" / "nginx" / "gaiacom.conf").read_text(encoding="utf-8")
    systemd = (root / "deploy" / "systemd" / "gaiacom.service").read_text(encoding="utf-8")
    main = (root / "Backend" / "main.go").read_text(encoding="utf-8")

    required_nginx = (
        "ssl_protocols TLSv1.2 TLSv1.3;",
        "Strict-Transport-Security",
        'X-Content-Type-Options "nosniff"',
        'X-Frame-Options "DENY"',
        "server_tokens off;",
        "location = /metrics { return 404; }",
        "proxy_connect_timeout 5s;",
        "client_max_body_size 3m;",
    )
    required_systemd = (
        "EnvironmentFile=/etc/gaiacom/gaiacom.env",
        "NoNewPrivileges=true",
        "ProtectSystem=strict",
        "ProtectHome=true",
        "CapabilityBoundingSet=",
        "UMask=0077",
        "StateDirectory=gaiacom",
        "ProtectProc=invisible",
        "MemoryDenyWriteExecute=true",
        "ReadWritePaths=/var/lib/gaiacom /opt/gaiacom/storage",
    )
    failures = [f"missing nginx directive: {item}" for item in required_nginx if item not in nginx]
    failures.extend(f"missing systemd directive: {item}" for item in required_systemd if item not in systemd)
    if "TLSv1 " in nginx or "ssl_protocols TLSv1.1" in nginx:
        failures.append("legacy TLS protocol enabled")
    if "buildinfo.IsRelease()" not in main or "ReadHeaderTimeout" not in main or "MaxHeaderBytes" not in main:
        failures.append("backend release identity or HTTP timeout gate missing")

    if failures:
        print("[TOTAL-DEPLOY] FAIL: " + "; ".join(failures))
        return False
    print("[TOTAL-DEPLOY] PASS: TLS, reverse proxy, metrics isolation, process sandbox, and release identity are enforced")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
