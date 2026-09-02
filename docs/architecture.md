# GaiaCom Core Architecture

GaiaCom Core is a federated, client-encrypted communication platform. The beta
release is scoped to the community Core: identity, messaging, storage,
federation, GaiaShield, governance, GSN, GaiaDrop, GaiaDrive integration, and
release/security gates.

## Trust Boundary

The browser/client owns native plaintext and private keys. The server stores
identity records, routing envelopes, encrypted payloads, encrypted storage
chunks, public profile fields, governance metadata, and audit events.

The Core invariant is simple:

```text
The server may route, store, rate-limit, audit, and enforce policy.
The server must not receive a capability to decrypt native private content.
```

## Components

- `Frontend/frontend`: React UI, client crypto harness, Gaia Passport, chat,
  GSN, GaiaDrive UX, and safe rendering rules.
- `Backend`: Go API, authentication, repository layer, federation, governance,
  storage ACLs, GaiaShield, SMTP bridge, and health/security endpoints.
- `Backend/repository`: SQLite-backed persistence with WAL mode, busy retry,
  transactions, and append-only audit triggers.
- `security`: active and static PoCs, extreme adversarial gate, final reports.
- `docs`: operator-facing and researcher-facing documentation.

## Data Flow

1. User creates or unlocks local cryptographic material on the client.
2. Client encrypts native content before transport.
3. Backend validates auth, authorization, quotas, replay state, and policy.
4. Backend stores encrypted envelopes/chunks and minimal routing metadata.
5. Federation sends signed PDUs between nodes with SSRF and replay controls.
6. GaiaShield records structured, redacted, append-only security events.

## Storage Model

GaiaDrive and attachments store encrypted chunks. Local object storage and
S3/MinIO adapters must only receive encrypted object data. Access is controlled
by owner checks, explicit grants, public flags, expiry cleanup, and object-store
path jail validation.

## Governance Model

Governance and abuse review operate on minimized proofs and metadata. Reviewer
credentials and node-operator roles are server-verified. Hard actions require
threshold logic; there is no global God-mode that bypasses E2EE.

## Beta Scaling Position

SQLite is the beta default. WAL mode, bounded connection pools, busy retry, and
parallel write regression tests are active. A Postgres/queue profile is
documented as a future scale path, not a beta release claim.
