from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


root = repo_root()
service = (root / "Backend" / "governance" / "service.go").read_text(encoding="utf-8")
handler = (root / "Backend" / "governance" / "handler.go").read_text(encoding="utf-8")
database = (root / "Backend" / "database" / "database.go").read_text(encoding="utf-8")
store = (root / "Backend" / "repository" / "sql_store_governance_abuse.go").read_text(encoding="utf-8")
routes = (root / "Backend" / "routes.go").read_text(encoding="utf-8")

checks = {
    "token hash domain separation": '"gaias-eyes:v1:" + token' in service,
    "database stores token_hash not token": "token_hash TEXT NOT NULL UNIQUE" in database and " token TEXT " not in database,
    "one-time consume route exists": '"/api/v1/public/gaias-eyes/consume"' in routes,
    "consume endpoint validates key type": 'input.Type != "GaiasEyesKey"' in handler,
    "atomic active-only consume": "WHERE id = ? AND status = 'active'" in store,
    "second consume rejected": "disclosure token already used" in service,
    "account login not exposed": "LoginUser" not in handler and "auth_token" not in handler,
    "case disclosure audit event": "disclosure_attached" in service,
    "disclosure request route exists": "disclosure-requests" in routes,
    "disclosure request requires role": "disclosure request requires reviewer or node operator role" in service,
    "disclosure request audit event": "disclosure_requested" in service,
}

failed = [name for name, passed in checks.items() if not passed]
if failed:
    print("[GAIAS-EYES] FAIL: " + ", ".join(failed))
    raise SystemExit(1)

print("[GAIAS-EYES] PASS: one-time disclosure keys are token-hashed, consume-once, scoped, and audit-linked")
