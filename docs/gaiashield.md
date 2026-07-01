# GaiaShield

GaiaShield is the Core security and abuse-observability layer.

## Responsibilities

- Record authentication attacks, malformed requests, BOLA/BFLA attempts,
  storage ACL violations, federation anomalies, SMTP abuse, governance abuse,
  GSN spam, and upload abuse.
- Keep user-visible events scoped to the affected user.
- Keep node-visible events scoped to node operators.
- Publish only aggregate summaries publicly.

## Event Hygiene

Security events are redacted before persistence. JWTs, private keys, mnemonics,
seed phrases, and secret-looking values are replaced with redaction markers.
Request private context stores hashed IP and hashed user-agent evidence, not
cleartext IP/user-agent strings.

## Audit Chain

Security events are linked to an audit chain. The hash covers immutable event
fields and the previous event hash. The event hash is signed using the
GaiaShield secret. SQLite triggers block updates/deletes to event identity,
summary, action, source, category, severity, created time, and audit-chain rows.

## Limits

GaiaShield is an enforcement and observability layer, not a promise of perfect
abuse prevention. Operators still need backups, monitoring, rate-limit tuning,
and security disclosure processes.
