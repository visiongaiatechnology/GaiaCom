import subprocess
import sys
from pathlib import Path


def run_poc():
    root = Path(__file__).resolve().parents[4]
    backend = root / "Backend"
    test = subprocess.run(
        ["go", "test", "-count=1", "./smtpbridge", "-run", "TestSMTPTransportRequiresAuthenticatedTLS"],
        cwd=backend,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    if test.returncode != 0 or "ok" not in test.stdout:
        print(f"[SMTP-AUTH] FAIL: authenticated TLS transport tests failed: {(test.stderr or test.stdout).strip()}")
        return False

    service = (backend / "smtpbridge" / "smtpbridge_service.go").read_text(encoding="utf-8")
    deployment = (root / "docs" / "deployment-guide.md").read_text(encoding="utf-8", errors="ignore")
    requirements = [
        ("smtp.SendMail(" not in service, "legacy opportunistic smtp.SendMail remains"),
        ("MinVersion: tls.VersionTLS12" in service, "TLS 1.2 minimum is missing"),
        ('client.Extension("STARTTLS")' in service, "mandatory STARTTLS capability check is missing"),
        ("_domainkey" in deployment and "_dmarc" in deployment and "v=spf1" in deployment, "SPF/DKIM/DMARC verification runbook is missing"),
    ]
    failures = [message for condition, message in requirements if not condition]
    if failures:
        print(f"[SMTP-AUTH] FAIL: {'; '.join(failures)}")
        return False

    print("[SMTP-AUTH] PASS: authenticated TLS relay enforced; SPF/DKIM/DMARC operator verification is explicitly gated")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
