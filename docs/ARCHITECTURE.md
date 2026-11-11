# GaiaCom Architecture

GaiaCom is a federated, client-encrypted communication platform. This document describes the
public architecture and its trust boundaries. It is not a security proof.

## Trust boundary

```text
The server may route, store, rate-limit, audit and enforce policy.
The server must never receive the capability to decrypt native private content.
```

The client owns plaintext, private keys, seeds and local session state. The node stores identity
records, routing envelopes, encrypted payloads, encrypted storage chunks, public profile fields,
governance metadata and audit events.

## Components

| Component | Responsibility |
|---|---|
| `Frontend/frontend` | React web client, PWA, client-side crypto harness, GSN, mail, chat, channels, GaiaDrive UX |
| `Backend` | Go API, authentication, authorization, federation, SQLite persistence, storage ACLs, governance, abuse workflows |
| `Backend/repository` | SQLite persistence with WAL mode, transactions, migrations and append-only audit events |
| `DesktopClient/src-tauri` | Tauri 2 desktop shell, frameless window, capability allowlist |
| `Core/rust/gaiacore` | Rust cryptographic core |
| `SovereignCryptoCore` | Rust crypto library used by native clients |
| `SovereignCryptoWasm` | WebAssembly crypto provider for browser HQC |
| `Android` | Android node/client architecture and platform bindings |

## Message flow

1. The client creates or unlocks local cryptographic material.
2. The client encrypts native content before transport.
3. The node validates authentication, authorization, quotas, replay state and policy.
4. The node stores an encrypted envelope/chunk plus minimal routing metadata.
5. Federation sends signed server-to-server PDUs with SSRF and replay protection.
6. The recipient decrypts locally; the node never receives a content decryption capability.

## Key and identity model

- A Gaia ID has the form `@name:node.example.org`.
- Private keys and the recovery seed are generated and kept on the client.
- The node's Ed25519 signing identity is stable and used for federation trust.
- Key changes are surfaced to users; there is no silent server-side key replacement.
- Governance bootstrap is fail-closed: a fresh node grants no operator role until a fully
  qualified operator Gaia ID is configured.

## Federation

- Nodes communicate over HTTPS using signed PDUs.
- Replay guards, request validation and SSRF restrictions apply to federation traffic.
- There is no mandatory central server and no global reading key.
- Cross-node governance convergence is policy-scoped in this beta.

## Storage

- GaiaDrive and attachments store encrypted chunks.
- Local object storage or an S3/MinIO-compatible object store can be used.
- Access is controlled by owner checks, grants, public flags, expiry cleanup and path
  validation. Object storage only ever receives encrypted data.
- SQLite is the beta database profile: one backend process per database, WAL mode, bounded
  connection pool and migrations.

## Governance and abuse

- Roles: Node Operator, Senior Reviewer, Trusted Reviewer.
- Privileged actions require explicit capabilities and produce audit events.
- Abuse reporting and moderation operate on minimized proofs and metadata.
- No administrator or operator capability can bypass E2EE or impersonate a user.

## Delivery profiles

- **Web/PWA:** static client behind a TLS reverse proxy with a strict CSP.
- **Desktop:** Tauri 2 client with a native crypto provider and explicit capability allowlist.
- **Node:** Go backend plus SQLite, optional object store, TLS reverse proxy and optional SMTP
  bridge.

## Verification status

The architecture is implemented in this source tree and exercised by automated backend,
frontend and UI work during development. **No independent cryptographic audit has been
completed.** Runtime and cryptographic behavior depends on the build, the deployment, the
browser/OS and the user's device. See [BETA_LIMITATIONS.md](BETA_LIMITATIONS.md) and
[../SECURITY.md](../SECURITY.md).
