# GaiaCom Governance and Meldecenter

The Governance/Meldecenter system handles abuse reports, reviewer workflows,
node-operator actions, and transparency artifacts without creating a global
God-mode.

## Roles

- User: may create reports and view own user-visible security events.
- Reviewer: may review minimized cases according to active credential scope.
- Senior reviewer: participates in higher threshold decisions.
- Node operator: may act on node-local policy and node-local queues.

Roles are server-verified through credentials. Client-provided role flags are
not trusted.

## Case Handling

Reports carry minimized metadata, cryptographic proof references, category,
severity, and public review comments where needed. Private native content is
not exposed to reviewers unless a user explicitly creates a disclosure export.

## Thresholds

Hard actions such as suspension or timeout require threshold logic. Small nodes
use smaller reviewer counts; larger nodes scale required participation. The
beta gate tests role escalation and governance queue separation.

## Transparency

Transparency views must be aggregate-first. Public dashboards must not expose
exact IP addresses, raw user-agent strings, JWTs, secrets, private messages, or
private reports.

## Audit

Admin and security-relevant actions are written as redacted Security Events and
linked into an append-only audit chain. The database blocks mutation/deletion
of audit chain rows.
