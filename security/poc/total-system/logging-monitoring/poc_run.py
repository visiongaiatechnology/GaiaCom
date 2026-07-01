# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def read(path):
    return (repo_root() / path).read_text(encoding="utf-8", errors="ignore")


def run_poc():
    print("[TOTAL-LOG] Verifying logging privacy controls and audit immutability...")
    failures = []

    events = read("Backend/internal/security/events.go")
    audit = read("Backend/internal/security/audit.go")
    redaction = read("Backend/internal/security/redaction.go")
    repo = read("Backend/repository/sql_store_security_events.go")
    migrations = read("Backend/database/database.go")
    security_tests = read("Backend/internal/security/audit_test.go")
    repo_tests = read("Backend/repository/sql_store_security_events_test.go")

    required = [
        ("events", events, "sanitizeSecurityText(summary)"),
        ("events", events, '"user_agent_hash": s.HashUserAgent(ua)'),
        ("events", events, "r.URL.Path"),
        ("redaction", redaction, "[redacted:jwt]"),
        ("redaction", redaction, "[redacted:private-key]"),
        ("redaction", redaction, "mnemonic"),
        ("audit", audit, "crypto/hmac"),
        ("audit", audit, "json.Marshal(payload)"),
        ("audit", audit, "Signature:    signature"),
        ("repository", repo, "withSQLiteBusyRetry"),
        ("repository", repo, "INSERT INTO security_audit_chain"),
        ("migrations", migrations, "trg_security_events_immutable_update"),
        ("migrations", migrations, "trg_security_events_no_delete"),
        ("migrations", migrations, "trg_security_audit_chain_no_update"),
        ("migrations", migrations, "trg_security_audit_chain_no_delete"),
        ("security_tests", security_tests, "TestSecurityEventRedactsSecretsBeforePersistence"),
        ("security_tests", security_tests, "TestAuditHashCoversImmutableEventFields"),
        ("repo_tests", repo_tests, "TestSecurityAuditPersistenceIsAppendOnly"),
    ]
    for label, text, needle in required:
        if needle not in text:
            failures.append(f"{label}: missing {needle}")

    forbidden = [
        ("events", events, '"user_agent": ua'),
        ("events", events, "r.URL.RawQuery"),
        ("events", events, "r.RequestURI"),
        ("audit", audit, 'Signature:    ""'),
    ]
    for label, text, needle in forbidden:
        if needle in text:
            failures.append(f"{label}: forbidden secret/audit weakening token {needle}")

    if failures:
        print("[TOTAL-LOG] FAIL: logging/audit monitoring guard failed")
        for failure in failures:
            print(f" - {failure}")
        return False

    print("[TOTAL-LOG] PASS: logs redact secrets, audit chain is signed, append-only, and retry-backed")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
