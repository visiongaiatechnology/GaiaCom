<div align="center">

```
 ██████╗  █████╗ ██╗ █████╗  ██████╗ ██████╗ ███╗   ███╗
██╔════╝ ██╔══██╗██║██╔══██╗██╔════╝██╔═══██╗████╗ ████║
██║  ███╗███████║██║███████║██║     ██║   ██║██╔████╔██║
██║   ██║██╔══██║██║██╔══██║██║     ██║   ██║██║╚██╔╝██║
╚██████╔╝██║  ██║██║██║  ██║╚██████╗╚██████╔╝██║ ╚═╝ ██║
 ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝
```

# GaiaCom
### Post-Quantum Secure Federated Communication Infrastructure

[![License](https://img.shields.io/badge/License-AGPLv3-green?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Sovereign_Beta_v2-yellow?style=for-the-badge)](#)
[![Go](https://img.shields.io/badge/Go-1.26.5-00ADD8?style=for-the-badge&logo=go)](https://go.dev)
[![Node](https://img.shields.io/badge/Node-v24.13-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Tauri](https://img.shields.io/badge/Desktop-Tauri_2-24C8DB?style=for-the-badge&logo=tauri)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Crypto_Core-Rust-000000?style=for-the-badge&logo=rust)](https://www.rust-lang.org)
[![Crypto](https://img.shields.io/badge/Dual_PQC-ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](#cryptographic-specification)
[![TopSecret](https://img.shields.io/badge/Top_Secret-4x_Cipher_Cascade-red?style=for-the-badge)](#sovereign-top-secret)
[![BrowserHQC](https://img.shields.io/badge/Browser_HQC-WASM_%2B_Worker-654FF0?style=for-the-badge&logo=webassembly)](#browser-and-native-providers)
[![E2EE](https://img.shields.io/badge/Security-Post--Quantum_E2EE-red?style=for-the-badge)](#)
[![Federation](https://img.shields.io/badge/Federation-Signed_PDU_S2S-blue?style=for-the-badge)](#)
[![VGT](https://img.shields.io/badge/VGT-VisionGaiaTechnology-gold?style=for-the-badge)](https://visiongaiatechnology.de)

**DUAL-PQC HYBRID E2EE · FEDERATED · ZERO SERVER TRUST · NATIVE + BROWSER CRYPTO**

</div>

---

## ⚠️ Technical Beta v2

GaiaCom is currently in **active Sovereign Technical Beta v2**. The current source tree includes the Sovereign v1 dual-PQC message path, the native Tauri 2 client, the browser HQC/WASM provider, the Go federation backend, and the Android/mobile-node architecture.

**GaiaCom is being actively expanded and independently reviewable.** Breaking protocol changes may occur between beta releases. Sovereign v1 has automated interoperability and adversarial tests, but has not yet received an independent cryptographic audit. It is a hybrid per-message envelope, not a Triple Ratchet; the exact boundary is documented in [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

Found a vulnerability? See [docs/responsible-disclosure.md](docs/responsible-disclosure.md) or open an issue.

> GaiaCom is a trademark of VisionGaia Technology.

---

<img width="1918" height="986" alt="image" src="https://github.com/user-attachments/assets/66d92ade-271a-405f-8ba4-1b004d4f2226" />


## 🔍 What is GaiaCom?

Today's communication systems are either centralized, server-trusting, not fully end-to-end encrypted — or not prepared for post-quantum threats. Most messengers are one database breach away from total plaintext exposure. Email was never designed for confidentiality.

**GaiaCom redefines secure digital communication as sovereign infrastructure.**

A federated communication platform with native end-to-end encryption and a versioned hybrid post-quantum design. Sovereign v1 combines one classical exchange and two independent PQ KEMs, authenticates the recipient key set, and rejects silent downgrade when a Sovereign profile is selected.

```
Standard Communication Systems:
  Server receives message   → server can read it
  DB breach                 → all messages compromised
  Quantum computer arrives  → retroactive decryption of stored traffic
  Federation                → central chokepoints, metadata exposure

GaiaCom:
  Message composed          → encrypted client-side before leaving device
  Server receives envelope  → ciphertext only — server cannot decrypt
  DB breach                 → encrypted payloads, worthless to attacker
  Hybrid KEM (X25519 + ML-KEM-1024 + HQC-256) → three-secret combiner
  Accelerated Mode          → Twofish-256-EAX + AES-256-GCM
  Top Secret Mode           → four-cipher cascade + Ed25519/ML-DSA-87
  Browser provider          → isolated Worker + self-hosted HQC/WASM
  Native provider           → bounded Tauri commands backed by Rust
  Federation                → signed PDUs, SSRF protection, replay guards
```

GaiaCom is not a messenger. It is a **new communication infrastructure** for sovereign digital communication — connecting native messaging, rooms, digital identities, trust metadata and controlled legacy compatibility via SMTP.

---

## 📋 Documentation Index

Full protocol design and threat model documentation in [`docs/`](docs/):

| Document | Content |
|---|---|
| [Sovereign Crypto v1](SOVEREIGN_CRYPTO.md) | Dual-PQC suites, provider boundary, downgrade rules, and ratchet limitations |
| [Architecture](docs/architecture.md) | Backend, frontend, storage, federation, and trust architecture |
| [Android Node Architecture](docs/android-node-architecture.md) | Mobile embedded-node, vault, transport, and identity boundaries |
| [Protocol Specification v0.1](docs/protocol-v0.1.md) | Hybrid X25519/ML-KEM combiners, AAD binding, signature serialization |
| [Threat Model](docs/threat-model.md) | System boundaries, STRIDE categories, mitigations |
| [Security Invariants](docs/security-invariants.md) | Invariants verified by the test suite |
| [Deployment Guide](docs/deployment-guide.md) | Linux service, provisioning, reverse proxy, health checks, and updates |
| [Beta Known Limitations](docs/beta-known-limitations.md) | Beta constraints and sandbox boundaries |
| [Abuse Consensus](docs/abuse-consensus.md) | TrustMesh score decay and friction policies |
| [Responsible Disclosure](docs/responsible-disclosure.md) | Guidelines for submitting security reports |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          GAIACOM PLATFORM                             │
├──────────────┬──────────────┬─────────────────┬──────────────────────┤
│   CLIENTS    │   BACKEND    │  CRYPTO ENGINE  │  TRUST & GOVERNANCE  │
│ React/Tauri  │    (Go)      │  Rust + WASM    │                      │
│ Android      │              │ X25519          │ TrustMesh            │
│              │ API/Auth     │ ML-KEM-1024     │ Trust Passport       │
│ E2EE Chat    │ Room/Msg     │ HQC-256         │ GaiaProof            │
│ GaiaVault    │ Federation   │ Ed25519         │ Key Change Guard     │
│ GaiaDrive    │ Object Store │ ML-DSA-87       │ Secure Disclosure    │
│ GaiaDrop     │ SMTP Bridge  │ HKDF-SHA3-512   │ Node Registry        │
│ GSN          │ Mobile API   │ 2x / 4x AE      │ Governance Layer     │
│ Security Ctr │ SQLite       │ Self-tests      │ Reviewer Roles       │
└──────────────┴──────────────┴─────────────────┴──────────────────────┘
```

### Components

| Component | Description |
|---|---|
| **Web Frontend** | React/Vite client with E2EE messaging, Vault, Chat, GSN, Drive, Trust, Proof, responsive UI, and an isolated Sovereign Crypto Worker. |
| **Native Desktop** | Tauri 2 shell with a packaged React bundle, strict CSP, no local HTTP server, bounded crypto commands, and Rust-native HQC/cascade providers. |
| **Android** | Modular Kotlin client with secure vault, identity, embedded-node, transport queue, remote API, and biometric authorization layers. Sovereign v1 mobile messaging remains a release boundary. |
| **Backend** | Go API and transport server for authentication, persistence, rooms, messages, federation, governance, mobile-node transport, security, GSN, storage, SMTP bridge and Node Registry. |
| **Sovereign Crypto Core** | Shared memory-safe Rust implementation of Accelerated and Top Secret cascades, compiled natively and to WebAssembly. |
| **Dual-PQC KEM** | Ephemeral X25519, ML-KEM-1024, and HQC-256 secrets combined through HKDF-SHA3-512 with transcript-bound context. |
| **GaiaVault** | Client-side encrypted vault for recovery phrases and private keys. PBKDF2-derived keys, no server-side decryption possible. |
| **GaiaDrop** | Secure text-based drop channel for controlled external submissions. Rate-limited, XSS-safe, payload-size controlled. |
| **GaiaDrive** | File storage layer with optional S3-compatible object store backend. |
| **GaiaProof** | Cryptographic proof structure for message integrity and authenticity verification without plaintext exposure. |
| **TrustMesh** | Local proof-based abuse and reputation layer. No content inspection — abuse handled via cryptographically verifiable patterns and receiver reports. |
| **Federation Layer** | Server-to-server communication via signed PDUs, SSRF protection and replay controls. |
| **Node Registry MVP** | Controlled node onboarding mechanism. Nodes ping the main registry and are accepted, quarantined or blocked by operators. |
| **Governance Layer** | Role-based system with Node Operator, Senior Reviewer and Trusted Reviewer roles. Bootstrapped via `governance.json`. |
| **SMTP Bridge** | Legacy compatibility mode for classical email with explicit downgrade warning. Not an equal security tier. |
| **Top Secret Chat Mode** | Dual-PQC key establishment, Ed25519/ML-DSA-87 hybrid signatures, a four-cipher authenticated cascade, and fail-closed capability enforcement. |

---

<img width="1912" height="985" alt="image" src="https://github.com/user-attachments/assets/050dbb28-2c58-49d4-98dd-d071cfa81b80" />


## 🔐 Cryptographic Specification

### Suite Identifiers

```
Legacy Standard:       GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM
Legacy Top Secret:     GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87
Sovereign Accelerated: GaiaCom/v1.0/sovereign-accelerated/X25519+ML-KEM-1024+HQC-256/Twofish-256-EAX+AES-256-GCM/Ed25519
Sovereign Top Secret:  GaiaCom/v1.0/sovereign-top-secret/X25519+ML-KEM-1024+HQC-256/Serpent-256-CTR-HMAC-SHA3-512+Twofish-256-EAX+XChaCha20-Poly1305+AES-256-GCM-SIV/Ed25519+ML-DSA-87
```

Legacy v0.1/v0.2 envelopes remain readable during migration. New Sovereign
desktop sends do not silently downgrade when the selected recipient lacks a
valid HQC-capable, identity-signed key set.

### Primitives

| Domain | Algorithm |
|---|---|
| Classical ephemeral exchange | X25519 |
| Post-quantum KEM 1 | ML-KEM-1024 |
| Post-quantum KEM 2 | HQC-256 |
| Accelerated signatures | Ed25519 |
| Top Secret signatures | Ed25519 + ML-DSA-87 |
| Accelerated encryption | Twofish-256-EAX + AES-256-GCM |
| Top Secret encryption | Serpent-256-CTR/HMAC-SHA3-512 + Twofish-256-EAX + XChaCha20-Poly1305 + AES-256-GCM-SIV |
| Root-secret combiner | HKDF-SHA3-512 |
| Legacy combiner | HKDF-SHA256 |
| Mnemonic | BIP-39, 12 words |

### Dual-PQC Hybrid KEM Principle

Sovereign v1 derives its root secret from three independent sources:

1. Ephemeral classical X25519 shared secret
2. Post-quantum ML-KEM-1024 shared secret
3. Post-quantum HQC-256 shared secret

The ciphertext transcript and all three shared secrets are length-delimited and
combined through HKDF-SHA3-512. Temporary shared-secret buffers are explicitly
zeroed after derivation in the native and browser provider paths.

```
Ephemeral X25519 Secret ─┐
ML-KEM-1024 Secret ──────┼─→ length-delimited combiner ─→ HKDF-SHA3-512 ─→ root secret
HQC-256 Secret ──────────┘                                      │
                                                                ├─→ Accelerated cascade
                                                                └─→ Top Secret cascade
```

### Browser and Native Providers

| Runtime | Provider |
|---|---|
| **Browser** | HQC-256 runs in an isolated Web Worker through the locally vendored `@oqs/liboqs-js` HQC-only runtime. The shared Rust cascade is compiled to WebAssembly. No CDN is required. |
| **Tauri Desktop** | Five bounded commands expose HQC key generation, encapsulation, decapsulation, seal, and open operations backed by `pqcrypto-hqc` and the shared Rust core. |

Both providers fail closed until HQC and cascade round-trip self-tests pass.
The release gate `npm run test:hqc-browser` builds the locked production worker
and executes HQC key generation, encapsulation/decapsulation, and both cascade
profiles in headless Chrome.

### Sovereign Accelerated

- Dual-PQC hybrid establishment: X25519 + ML-KEM-1024 + HQC-256
- Twofish-256-EAX followed by AES-256-GCM
- Ed25519 message signatures
- Identity-signed recipient key-set proof
- Strict algorithm/profile binding

### Sovereign Top Secret

Top Secret uses the same three-secret establishment and adds the complete
four-stage authenticated cascade plus hybrid signatures. Connections are
rejected if:

- HQC-256 or ML-DSA-87 recipient capability is missing
- the identity-signed recipient key-set proof is invalid
- the suite identifier and Sovereign profile do not match
- the Ed25519/ML-DSA-87 signature bundle is incomplete or invalid
- the message attempts to downgrade from the selected Sovereign profile

### Transcript Binding

Every message cryptographically binds security-relevant fields to the ciphertext via AAD:

- Protocol version, algorithm suite
- Sender identity key, recipient identity key, recipient device key
- Ephemeral X25519 public key, ML-KEM ciphertext and HQC ciphertext
- Sovereign profile, message ID, timestamp and recipient key material
- Payload ciphertext and hybrid signature bundle

Manipulation of any field causes verification or decryption to fail.

### Message Envelope

```json
{
  "algorithm_suite": "GaiaCom/v1.0/sovereign-top-secret/...",
  "sovereign_profile": "top-secret",
  "ephemeral_x25519_public_key": "<hex>",
  "kem_ciphertext": "<ML-KEM-1024 hex>",
  "hqc_ciphertext": "<HQC-256 hex>",
  "payload_ciphertext": "<cascade ciphertext hex>",
  "signature_bundle": {
    "ed25519": "<hex>",
    "ml_dsa_87": "<hex>",
    "ml_dsa_87_public": "<hex>"
  },
  "client_message_id": "<uuid>",
  "timestamp": 1788327803000
}
```

> Sovereign v1 is a hybrid per-message envelope, **not a Triple Ratchet**. It
> does not claim ratchet-derived forward secrecy or post-compromise security.
> Signed per-device prekeys and transactional ratchet state are required before
> such a claim can be made.

---

## 🏗️ Architecture Principles

**Zero-Trust Design** — the server handles transport, storage, routing and federation but has no access to plaintext messages, mnemonics, private identity or device keys, symmetric message keys or decrypted vault contents.

**Client-Side Encryption** — encryption and decryption happen in the client. Native GaiaCom messages leave the device as encrypted envelopes only.

**Federation over Centralization** — multi-node operation by design. Different nodes communicate as long as their S2S interactions satisfy the defined security rules.

**Controlled Legacy Compatibility** — SMTP is an explicit legacy/downgrade mode, clearly separated from native GaiaCom messages in the UI. Not an equal security tier.

**No-Backdoor Architecture** — GaiaCom Public has no central decryption capability, no admin-decrypt and no global content control. Abuse is handled via proof-based mechanisms, receiver reports, friction, quarantine and local policy.

---

<img width="1917" height="984" alt="image" src="https://github.com/user-attachments/assets/945ecb4d-bf6c-451f-a234-815bf91ca72c" />


## 🛡️ Federation (S2S)

```
Node A (Sender)                         Node B (Receiver)
       │                                        │
       │  Encrypt & sign message                │
       │                                        │
       │──── HTTP POST /api/v1/federation/pdu ─►│
       │         (Signed PDU)                   │
       │                               SSRF & IP firewall check
       │                               Timestamp window check
       │                               Signature verification (Ed25519)
       │                               Replay protection (PDU-ID cache)
       │                                        │
       │◄──────────── 200 OK / PDU Accepted ───│
```

**S2S Authorization Header:**
```
Authorization: X-Gaia-S2S-V1 Signature="...",KeyId="node.example.org",Timestamp="..."
```

**Signature basis:** `timestamp.sha256(body)`

### S2S Security Layers

- **Signed PDUs** — every federated interaction cryptographically signed by the sending node's private key
- **SSRF & DNS Rebinding Firewall** — `localhost`, RFC 1918 ranges and DNS redirects to local subnets blocked at connection time
- **Replay Protection** — PDU-ID cache; duplicates within validity window immediately rejected
- **Timestamp Validation** — PDUs outside the time window are rejected

### Well-Known Routes

```
GET  /.well-known/gaiacom/server
GET  /.well-known/gaiacom/nodeinfo
GET  /.well-known/gaiacom/nodes
POST /.well-known/gaiacom/s2s/v1/forward
```

> **Beta:** Open public federation is disabled. Federation is limited to controlled, known technical nodes.

---

## 🗂️ Node Registry

The Node Registry is a controlled mechanism for new nodes to become visible and be accepted by the main node or authorized operators.

### Node Status Flow

```
Node pings main registry
         ↓
    [ pending ]
         ↓
  Operator decision
    ↙        ↘        ↘
[accepted] [quarantined] [blocked]
```

| Status | Meaning |
|---|---|
| `pending` | Node pinged but not yet accepted |
| `accepted` | Node added to the federation server list |
| `quarantined` | Node visible but not actively trusted (e.g. core hash mismatch) |
| `blocked` | Node blocked from federation |

### Public Endpoints

```http
POST /api/v1/public/node-registry/ping
GET  /api/v1/public/node-registry/nodes
GET  /.well-known/gaiacom/nodes
```

### Operator Endpoints

```http
GET  /api/v1/node/registry/summary
POST /api/v1/node/registry/secrets
POST /api/v1/node/registry/ping-main
POST /api/v1/node/registry/:domain/status
```

### Core Hash

The core hash is used for release compatibility detection, update signaling, and fork/mismatch identification. A hash mismatch triggers quarantine — not an immediate network ban. GaiaCom is AGPL and forks must remain technically possible.

```
Hash mismatch → quarantined/update_required → Operator decision
```

---

<img width="1909" height="983" alt="image" src="https://github.com/user-attachments/assets/5fb31291-c282-4d95-b342-a24b16ba3b6f" />


## 🏛️ Governance

GaiaCom uses a role-based governance system bootstrapped via `governance.json`.

### Roles

| Role | Capabilities |
|---|---|
| **Node Operator** | Node security summary, security events, abuse/governance actions, transparency snapshots, node registry management, secret generation |
| **Senior Reviewer** | Extended review and moderation capabilities |
| **Trusted Reviewer** | Peer review and trust validation |

### governance.json

The governance config is the local bootstrap anchor for Node Operator rights. No operator is assigned without a configured GaiaID.

**Minimal:**
```json
{
  "bootstrap_gaia_id": "@operator:node.example.org"
}
```

**Multiple operators:**
```json
{
  "bootstrap_gaia_id": "@operator:node.example.org",
  "operators": [
    { "gaiaID": "@backup-operator:node.example.org" },
    { "gaiaID": "@security-admin:node.example.org" }
  ]
}
```

**Important:**
- Replace placeholder `EnterYourGaiaComAddressHere` before starting
- GaiaIDs must exactly match the identity created on the node
- Set file permissions: `chmod 600 /opt/gaiacom/config/governance.json`

Node Operator rights require: governance.json bootstrap + active `role_credentials` in DB + no active revocation + valid `valid_from`/`valid_until` window.

---

## 🖥️ Node Operator Guide

### Prerequisites

- Domain (e.g. `node.example.org`) pointing to your server
- HTTPS via reverse proxy
- Linux server (AMD64)

### Build

**Frontend (production build):**
```powershell
cd Frontend\frontend
npm ci --include=optional --ignore-scripts --no-audit --no-fund
$env:VITE_API_URL='https://node.example.org'
npm test
npm run build
npm run test:hqc-browser
# Output: Frontend/frontend/dist/
```

**Backend (Linux AMD64):**
```powershell
cd Backend
$env:GOOS='linux'
$env:GOARCH='amd64'
$env:CGO_ENABLED='0'
go mod verify
go test ./...
$version='2.0.0'
$commit=(git rev-parse HEAD)
$builtAt=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$ldflags="-s -w -X gaiacom/backend/buildinfo.Version=$version -X gaiacom/backend/buildinfo.Commit=$commit -X gaiacom/backend/buildinfo.BuiltAt=$builtAt"
go build -trimpath -buildvcs=false -ldflags=$ldflags -o gaiacom-backend-linux-amd64 ./cmd/gaiacom
```

### Deploy

```
1.  Prepare domain + HTTPS
2.  Copy gaiacom-backend-linux-amd64 to server
3.  Deploy Frontend/frontend/dist to web root
4.  Run `gaiacom-backend setup` to generate the production environment atomically
5.  Create governance.json with the real operator GaiaID and mode 0600
6.  Install the hardened unit from deploy/systemd/gaiacom.service
7.  Run `gaiacom-backend doctor` before enabling the service
8.  Start backend and verify /livez plus /readyz
9.  Create a GaiaID matching governance.json
10. Security Center → Nodesystem → Ping Main Node
11. Get accepted by the main node operator
12. Test federation and encrypted message delivery
```

### Reverse Proxy Requirements

```
/                         → Frontend build (static)
/api/v1/...               → Backend :8080
/.well-known/gaiacom/...  → Backend :8080
```

- HTTPS termination required
- Request body for federation: minimum 2 MB
- File/upload endpoints sized to GaiaDrive usage

### Systemd Service

```ini
[Unit]
Description=GaiaCom Backend
After=network-online.target
Wants=network-online.target

[Service]
User=gaiacom
Group=gaiacom
WorkingDirectory=/var/lib/gaiacom
EnvironmentFile=/etc/gaiacom/gaiacom.env
ExecStart=/opt/gaiacom/gaiacom-backend
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=
AmbientCapabilities=
StateDirectory=gaiacom
StateDirectoryMode=0700
ConfigurationDirectory=gaiacom
ConfigurationDirectoryMode=0700
ReadWritePaths=/var/lib/gaiacom /opt/gaiacom/storage
UMask=0077

[Install]
WantedBy=multi-user.target
```

Generate the production environment with the idempotent provisioning command;
do not hand-author or commit secret values:

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080
sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

---

## ⚙️ Configuration Reference

### Core

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | HTTP port for the backend |
| `DB_PATH` | `data/gaiacom.db` | SQLite database path — use absolute path outside source dir in production |
| `SQLITE_MAX_OPEN_CONNS` | `4` | Max SQLite connections (max `32` under heavy load) |
| `GAIACOM_DEV_MODE` | `false` | Dev mode — **must be `false` in production** |
| `SERVER_BIND_ADDRESS` | `127.0.0.1` | Backend bind address behind the reverse proxy |
| `GAIACOM_ALLOW_PUBLIC_BIND` | `false` | Explicit override required before binding an unspecified address |

### Auth & Security

| Variable | Required | Description |
|---|---|---|
| `GAIACOM_JWT_SECRET` | **Yes** | JWT signing secret — minimum 32 bytes random |
| `GAIACOM_SHIELD_SECRET` | **Yes** | GaiaShield internal security HMACs — minimum 32 bytes |
| `GAIACOM_METRICS_TOKEN` | **Yes** | Independent token protecting the metrics endpoint — minimum 32 bytes |
| `GAIACOM_COOKIE_SECURE` | **Yes** | Must be `true` for HTTPS production deployments |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Deployment-specific | Explicit proxy CIDR allowlist used before accepting forwarded headers |

### Federation & Node Registry

| Variable | Default | Description |
|---|---|---|
| `GAIACOM_SERVER_NAME` | — | Public domain of this node (e.g. `node.example.org`) |
| `GAIACOM_SERVER_PRIVATE_KEY` | — | Ed25519 private key (hex) for S2S signatures |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | — | 32-byte hex secret for TrustMesh |
| `GAIACOM_REGISTRY_MAIN_NODE` | `https://beta.gaiacom.de` | Main registry node URL |
| `GAIACOM_REGISTRY_AUTHORITY_DOMAIN` | `gaiacom.de` | Registry authority domain |
| `GAIACOM_CORE_HASH` | *(auto)* | Optional release hash for reproducible verification |
| `GAIACOM_GOVERNANCE_CONFIG` | *(auto-search)* | Path to `governance.json` |

### Storage & GaiaDrive

| Variable | Default | Description |
|---|---|---|
| `GAIACOM_STORAGE_ROOT` | `uploads` | Local storage root — use absolute path in production |
| `GAIACOM_STORAGE_USER_QUOTA_BYTES` | — | Per-user quota (e.g. `10737418240` = 10 GB) |
| `GAIACOM_STORAGE_PENDING_TTL_HOURS` | — | TTL for pending uploads |

**Optional S3-compatible object store:**

| Variable | Description |
|---|---|
| `GAIACOM_OBJECT_STORE` | Set to `s3` to enable |
| `GAIACOM_S3_ENDPOINT` | S3 endpoint URL |
| `GAIACOM_S3_BUCKET` | Bucket name |
| `GAIACOM_S3_REGION` | Region |
| `GAIACOM_S3_ACCESS_KEY` | Access key |
| `GAIACOM_S3_SECRET_KEY` | Secret key |
| `GAIACOM_S3_PREFIX` | Key prefix (e.g. `node-example-org`) |
| `GAIACOM_S3_PATH_STYLE` | `true` for path-style addressing |

### SMTP Bridge

| Variable | Required | Description |
|---|---|---|
| `GAIACOM_SMTP_HOST` | If using SMTP | Outgoing mail server |
| `GAIACOM_SMTP_FROM` | If using SMTP | Bridge sender address |
| `GAIACOM_SMTP_PORT` | No | Default: `587` (STARTTLS) |
| `GAIACOM_SMTP_USERNAME` | No | Auth username |
| `GAIACOM_SMTP_PASSWORD` | No | Auth password |
| `GAIACOM_SMTP_INGEST_TOKEN` | No | Token for incoming mail authentication |

### Minimal Production Env Set

```bash
# Generated by `gaiacom-backend setup`; values intentionally omitted here.
# Use Backend/.env.example only for local development.
```

---

## ✅ Pre-Launch Security Checklist

- [ ] `gaiacom-backend doctor` succeeds with the production environment
- [ ] `GAIACOM_DEV_MODE=false`
- [ ] HTTPS active on all endpoints
- [ ] `GAIACOM_COOKIE_SECURE=true`
- [ ] independent JWT, Shield, Metrics, S2S and TrustMesh secrets generated
- [ ] backend bound to loopback unless public binding is explicitly intended
- [ ] trusted proxy CIDRs match the actual reverse proxy
- [ ] `governance.json` contains the real operator GaiaID and mode `0600`
- [ ] DB and storage paths are outside the source directory
- [ ] encrypted backups and restore drills are configured
- [ ] Nginx routes `/api`, health routes and `/.well-known/gaiacom/*` correctly
- [ ] Security Center shows server name, release/core hash and public key
- [ ] Main Node ping and encrypted delivery tested successfully

---

## 🔄 Update Checklist

```bash
# 1. Stop service
systemctl stop gaiacom

# 2. Backup DB
sqlite3 /var/lib/gaiacom/gaiacom.db ".timeout 10000" ".backup '/var/lib/gaiacom/backups/gaiacom-$(date +%F-%H%M).db'"

# 3. Deploy new binary and frontend build

# 4. Start service
systemctl start gaiacom

# 5. Verify
curl https://node.example.org/.well-known/gaiacom/nodeinfo
curl https://node.example.org/.well-known/gaiacom/nodes
curl --fail https://node.example.org/livez
curl --fail https://node.example.org/readyz

# 6. Open Security Center → Nodesystem → Ping Main Node
```

---

## 🔒 Security Architecture

### API Security

- Authentication required before all protected endpoints
- Authorization from server context — not from client payload
- `403` on unauthorized object access (BOLA/BFLA)
- `401` on missing or invalid authentication
- No stack traces in API responses
- No internal paths in error responses
- No `actorId` authorization from JSON body
- Server-side identity ownership verification
- BOLA/BFLA regression tests in test suite

### Frontend Security

- No `dangerouslySetInnerHTML` for user content
- No raw HTML injection — Markdown as safe React nodes
- XSS payloads rendered inert
- Sovereign browser cryptography runs in an isolated Worker
- HQC/WASM and the Rust cascade are self-hosted; no crypto CDN dependency
- Provider readiness is fail-closed and guarded by round-trip self-tests
- Tauri exposes only five bounded Sovereign crypto commands
- CSP forbids `unsafe-eval` and untrusted connection origins
- SMTP downgrade warning always visible when relevant

### Production Deployment

```
NGINX (Edge Proxy)
  → Go Backend local on 127.0.0.1:8080 only
  → HTTPS only / TLS 1.2 + TLS 1.3
  → ssl_early_data off / HSTS / CSP
  → X-Content-Type-Options: nosniff
  → X-Frame-Options: DENY
  → Referrer-Policy
  → No PHP execution in GaiaCom VHost
  → No public .env / .git / Backend / Frontend / docs
  → Rate limits: API / Auth / CSP Reports / Federation / SMTP
```

---

## 📦 Feature Overview

### Available in Sovereign Beta v2

| Feature | Status |
|---|---|
| Native E2EE Direct Messaging | ✅ Active |
| Group Rooms + Channels | ✅ Active |
| GaiaVault (client-side encrypted) | ✅ Active |
| GaiaDrop (text-only) | ✅ Active |
| GaiaDrive (file storage) | ✅ Active |
| GaiaProof | ✅ Active |
| TrustMesh (local enforcement) | ✅ Active |
| Trust Passport + Gaia Passport | ✅ Active |
| Key Change Warning | ✅ Active |
| Controlled Federation | ✅ Active (known nodes only) |
| Node Registry MVP | ✅ Active |
| Governance Layer (Operator/Reviewer roles) | ✅ Active |
| Security Center (User + Node Operator view) | ✅ Active |
| Sovereign Accelerated (X25519 + ML-KEM-1024 + HQC-256) | ✅ Active |
| Sovereign Top Secret (dual PQC + four-cipher cascade + dual signatures) | ✅ Active |
| Browser HQC provider (isolated Worker + local WASM) | ✅ Active |
| Native desktop crypto bridge (Tauri 2 + Rust) | ✅ Active |
| Identity-signed recipient key sets + downgrade rejection | ✅ Active |
| SMTP Bridge (explicit downgrade) | ✅ Active |
| Secure Disclosure | ✅ Active |
| Human Proof | ✅ Active |
| S3-compatible Object Store | ✅ Optional |
| Frontend, browser HQC, Rust, Tauri and Go verification gates | ✅ Active |
| Modular Android client and mobile-node foundation | 🧪 Technical beta |

### Intentionally Disabled in Beta

| Feature | Reason |
|---|---|
| File attachments / media / images in chat | Pending separate attachment and parser audit |
| Open public federation | Controlled rollout only |
| Open node registrations | Controlled beta access |
| Global synchronized Abuse Consensus | Local-only in beta |
| Mobile Sovereign v1 message path | Desktop/browser path is complete; mobile integration remains |
| Triple Ratchet / ratchet-derived FS and PCS | Requires a separately specified and audited protocol |
| Identity-signed per-device Sovereign prekeys | Pending protocol integration |
| Attachment-based GaiaDrop | Pending audit |
| Automatic update pipeline | Prepared, not yet implemented |

---

## 🐧 Linux Installation & Server Setup

This is the primary server deployment path. The Go backend runs as a static AMD64 binary and the Vite frontend is served as static files; Go, Rust and Node.js are build-time dependencies only.

### Requirements

| Dependency | Version | Notes |
|---|---|---|
| **OS** | Ubuntu 22.04+ / Debian 12+ / current AMD64 Linux | AMD64 release target |
| **Go** | 1.26.5 toolchain | Backend build only |
| **Node.js** | 20.19+ (verified with 24.13) | Frontend build and tests only |
| **npm** | Bundled with Node | Frontend build |
| **Rust + Cargo** | Current stable | Shared crypto, WASM and Tauri verification |
| **wasm-pack** | Current stable | Rebuild browser cascade WASM |
| **NGINX** | Any current | Reverse proxy + TLS termination |
| **Certbot** | Any | Let's Encrypt TLS (or bring your own cert) |

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install NGINX + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create service user (no login shell)
sudo useradd -r -s /bin/false -d /opt/gaiacom gaiacom

# Create the canonical runtime layout
sudo install -d -o root -g root -m 0755 /opt/gaiacom /var/www/gaiacom
sudo install -d -o root -g root -m 0700 /etc/gaiacom
sudo install -d -o gaiacom -g gaiacom -m 0700 /var/lib/gaiacom /opt/gaiacom/storage
```

### 2. Build on Your Dev Machine

> GaiaCom ships no prebuilt binaries. Build locally and transfer to server.

**Backend (cross-compile for Linux AMD64):**

```bash
cd Backend
go mod verify
go test ./...
VERSION=2.0.0
COMMIT="$(git rev-parse HEAD)"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -trimpath -buildvcs=false \
  -ldflags="-s -w -X gaiacom/backend/buildinfo.Version=${VERSION} -X gaiacom/backend/buildinfo.Commit=${COMMIT} -X gaiacom/backend/buildinfo.BuiltAt=${BUILT_AT}" \
  -o gaiacom-backend-linux-amd64 ./cmd/gaiacom
```

**Frontend (production build):**

```bash
cd Frontend/frontend
npm ci --include=optional --ignore-scripts --no-audit --no-fund
npm test
npm run test:hqc-browser
VITE_API_URL=https://node.example.org npm run build
# Output: Frontend/frontend/dist/
```

The production bundle contains the locally built Sovereign cascade WASM and the isolated HQC worker. No cryptographic runtime is fetched from a CDN.

### 3. Transfer to Server

```bash
# Transfer backend binary
scp Backend/gaiacom-backend-linux-amd64 user@your-server:/tmp/gaiacom-backend

# Transfer frontend build
scp -r Frontend/frontend/dist/. user@your-server:/tmp/gaiacom-frontend/

# Transfer reviewed deployment profiles
scp deploy/systemd/gaiacom.service user@your-server:/tmp/gaiacom.service
scp deploy/nginx/gaiacom.conf user@your-server:/tmp/gaiacom.nginx.conf

# Set binary permissions
ssh user@your-server "
  sudo install -o root -g root -m 0755 /tmp/gaiacom-backend /opt/gaiacom/gaiacom-backend
  sudo cp -a /tmp/gaiacom-frontend/. /var/www/gaiacom/
  sudo chown -R root:root /var/www/gaiacom
"
```

### 4. Create governance.json

```bash
sudo nano /etc/gaiacom/governance.json
```

```json
{
  "bootstrap_gaia_id": "@operator:node.example.org"
}
```

```bash
sudo chmod 600 /etc/gaiacom/governance.json
sudo chown root:root /etc/gaiacom/governance.json
```

### 5. Initialize and Validate Node Configuration

Do not hand-author cryptographic secrets and never paste them into issues or logs. Use the backend's setup flow, store the generated environment file with mode `0600`, then run the diagnostic gate before starting the service:

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --config /etc/gaiacom/gaiacom.env \
  --server-name node.example.org
sudo chmod 600 /etc/gaiacom/gaiacom.env
sudo chown root:root /etc/gaiacom/gaiacom.env
sudo grep -qxF 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' /etc/gaiacom/gaiacom.env || \
  echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' | sudo tee -a /etc/gaiacom/gaiacom.env >/dev/null
sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

The canonical variable set and rotation procedure are documented in [`docs/deployment-guide.md`](docs/deployment-guide.md). Generated secret material must remain outside Git.

### 6. Install systemd Service

```bash
sudo install -o root -g root -m 0644 /tmp/gaiacom.service /etc/systemd/system/gaiacom.service
sudo systemctl daemon-reload
sudo systemctl enable --now gaiacom
sudo systemctl status gaiacom
```

The shipped unit applies a strict filesystem jail, an empty capability set, syscall-architecture restriction, `UMask=0077`, protected kernel controls and a root-owned environment file. Review [`deploy/systemd/gaiacom.service`](deploy/systemd/gaiacom.service) whenever the runtime paths change.

### 7. Configure NGINX

```bash
sudo install -o root -g root -m 0644 /tmp/gaiacom.nginx.conf /etc/nginx/sites-available/gaiacom
# Replace app.gaiacom.net with the production hostname and review TLS paths/CSP connect-src.
sudo ln -s /etc/nginx/sites-available/gaiacom /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d node.example.org
sudo systemctl reload nginx
```

The shipped profile denies framing and MIME sniffing, constrains browser capabilities, isolates the worker/WASM bundle with a restrictive CSP, hides `/metrics` at the public proxy and routes only the API, discovery and health endpoints to the backend. Review [`deploy/nginx/gaiacom.conf`](deploy/nginx/gaiacom.conf) before installation.

### 8. First-Run Node Setup

After `setup` and `doctor` succeed, start the service, open the public node, create the bootstrap GaiaID declared by governance policy, submit the node to the controlled registry and wait for operator acceptance before enabling federation traffic. Secrets are generated only by the CLI and are never copied from the browser UI.

### 9. Verify Deployment

```bash
# Service running
sudo systemctl status gaiacom

# Backend responding
curl --fail --silent https://node.example.org/livez
curl --fail --silent https://node.example.org/readyz
curl --fail --silent https://node.example.org/.well-known/gaiacom/nodeinfo | jq .

# Nodes visible
curl -s https://node.example.org/.well-known/gaiacom/nodes | jq .

# Logs (journald)
sudo journalctl -u gaiacom -f
```

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirect)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
# Backend port 8080 stays local — never expose directly
```

---

## 🚀 Local Development & Build Verification

### Complete Verification Gate

```powershell
# Backend and persisted storage source
cd Backend
go mod verify
go test ./...

# Frontend unit suite, production bundle and real browser HQC round trip
cd Frontend/frontend
npm ci --include=optional --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm run test:hqc-browser

# Shared Sovereign cascade
cd ../../SovereignCryptoCore
cargo test --locked

# Browser WASM provider
cd ../SovereignCryptoWasm
cargo test --locked
wasm-pack build --target web --release

# Native Tauri bridge and its security contracts
cd ../DesktopClient/src-tauri
cargo test --locked

# Repository artifact and secret hygiene
cd ../..
python scripts/repository_hygiene.py
```

### Verification Matrix

| Check | Expected |
|---|---|
| Frontend Vitest suite | 28 tests pass |
| Headless Chromium HQC keygen / encapsulate / decapsulate | PASS |
| Accelerated and Top Secret browser cascades | PASS |
| Frontend Vite production build + bundle budget | PASS |
| Backend packages, including storage | `go test ./...` passes |
| Sovereign Rust core | `cargo test --locked` passes |
| Sovereign WASM release rebuild | PASS |
| Tauri HQC round trip + security contracts | PASS |
| Repository artifact and secret hygiene | 653 source files pass |

---

## ⚠️ SMTP Bridge

SMTP is not a GaiaCom native security tier. The moment a message is delivered via SMTP, it leaves the native GaiaCom security space.

The UI always displays:

> *"Diese Nachricht verlässt den GaiaCom-Sicherheitsraum. SMTP-Zustellung bietet keine GaiaCom-native Ende-zu-Ende-Garantie, keine TrustMesh-Garantie und keine No-Godmode-Garantie ab dem Gateway."*

No silent native-to-SMTP forwarding. Authentication required. Open relay protection active. CRLF and header injection protection active.

---

## 🚧 Known Security Boundaries

- A fully compromised endpoint can capture plaintext at runtime
- Sovereign v1 is not a Triple Ratchet and does not claim ratchet-derived forward secrecy or post-compromise security
- The desktop/browser Sovereign path is integrated; mobile Sovereign messaging remains a defined integration boundary
- SMTP delivery provides no native GaiaCom E2EE guarantee
- Open public federation is disabled in beta
- Global synchronized Abuse Consensus is not yet active
- File and media attachments are disabled pending audit
- Node Registry trust is operator-controlled, not fully decentralized consensus
- External audits are pending
- SQLite is production-stable; Postgres dialect may be added for very large multi-node loads
- Metadata may remain partially visible depending on communication path
- No system guarantees absolute anonymity or immunity against operational security errors

---

## 🎯 Target Deployments

**Public Network** — private users, communities, activists, journalists, developers and security-conscious communication.

**Enterprise** — organizations, teams, law firms, security departments, research groups and companies requiring sovereign communication infrastructure.

**Defense / Government** — isolated deployments, agency communication and sovereign infrastructure under independent control.

> GaiaCom Defense is not a backdoor into GaiaCom Public. It is a separate deployment line with its own infrastructure, policies and key sovereignty.

---

## 📊 Dependency Philosophy

**Backend:** Go standard library first.
- `github.com/cloudflare/circl` — ML-KEM-1024 and ML-DSA-87
- `golang.org/x/crypto` — cryptographic extensions
- `modernc.org/sqlite` — pure-Go SQLite, no CGO required

**Web frontend:** React 18 + Vite with pinned Noble/Scure primitives. HQC runs in an isolated Worker through a locally vendored, HQC-only liboqs runtime; the shared cascade core is compiled to local WASM. No cryptographic CDN dependency.

**Native desktop:** Tauri 2 invokes the same Rust cascade core and a native `pqcrypto-hqc` provider through a narrow five-command bridge: keypair, encapsulate, decapsulate, seal and open.

**Supply-chain rule:** lockfiles are committed, release builds use locked dependencies, and crypto/provider startup fails closed when the required implementation is unavailable.

---

## 🔗 VGT Ecosystem

| Tool | Type | Purpose |
|---|---|---|
| 🌐 **GaiaCom** | **Communication Infrastructure** | Post-quantum federated E2EE platform — you are here |
| 🖥️ **[VGT WP-Desk](https://github.com/visiongaiatechnology/vgtdesk)** | **OS-Layer / UX** | Hardened WordPress operator workspace |
| ⚔️ **[VGT Sentinel](https://github.com/visiongaiatechnology/sentinelcom)** | **WAF / IDS** | Zero-Trust WordPress WAF |
| ⚡ **[VGT Auto-Punisher](https://github.com/visiongaiatechnology/vgt-auto-punisher)** | **IDS** | L4+L7 Hybrid IDS |
| 🛡️ **[VGT Myrmidon](https://github.com/visiongaiatechnology/vgtmyrmidon)** | **ZTNA** | Zero Trust device registry |
| 🔐 **[VGT Omega Vault](https://github.com/visiongaiatechnology/vgt-omega-vault)** | **Encrypted Forms** | AES-256-GCM WordPress form vault |
| 📊 **[VGT Dattrack](https://github.com/visiongaiatechnology/dattrack)** | **Analytics** | Sovereign local analytics |

---

## 💰 Support the Project

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal)](https://www.paypal.com/paypalme/dergoldenelotus)

| Method | Address |
|---|---|
| **PayPal** | [paypal.me/dergoldenelotus](https://www.paypal.com/paypalme/dergoldenelotus) |
| **Bitcoin** | `bc1q3ue5gq822tddmkdrek79adlkm36fatat3lz0dm` |
| **ETH / USDT (ERC-20)** | `0xD37DEfb09e07bD775EaaE9ccDaFE3a5b2348Fe85` |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss the direction.

GaiaCom is security-critical infrastructure. All contributions undergo cryptographic and security review before merge.

---

## 🧾 Changelog

### Sovereign Beta v2.1 — 2026-09-04 (Argon2id Cryptographic Hardening)

#### Authentication & Password Security
- **Bcrypt Deprecation & Argon2id Migration**: Completely upgraded all backend password hashing from Bcrypt to **Argon2id** (RFC 9106 / PHC string format).
- **OWASP & RFC 9106 Parameters**: Enforced memory-hard parameters ($m=65536\text{ KiB}$ / 64 MiB, $t=3$ iterations, $p=4$ parallelism, 128-bit CSPRNG salt, 256-bit derived key) resistant to GPU/ASIC brute-force attacks.
- **Timing-Attack & Enumeration Defense**: Introduced constant-time dummy verification with an RFC 9106-compliant precomputed Argon2id dummy hash (`dummyPasswordHash`) for non-existent users, defeating timing-based username enumeration.
- **Transparent Auto-Rehash**: Legacy accounts using Bcrypt (`$2a$`, `$2b$`, `$2y$`) are seamlessly verified and automatically upgraded to Argon2id in SQLite on their next successful authentication without user disruption.
- **Dedicated Module**: Added `Backend/auth/password.go` with strict boundary validation (12 to 512 characters) and timing-resistant comparison (`subtle.ConstantTimeCompare`).
- **Comprehensive Test Suite**: Added `Backend/auth/password_test.go` covering password boundaries, PHC parsing, legacy Bcrypt migration, corrupted input handling, and timing defense.

### Sovereign Beta v2 — 2026-09-02

#### Cryptography

- Introduced Sovereign v1 dual-PQC recipient key establishment: ephemeral X25519 + ML-KEM-1024 + HQC-256, combined through HKDF-SHA3-512.
- Added **Sovereign Accelerated** with Twofish-256-EAX + AES-256-GCM and Ed25519 authentication.
- Added **Sovereign Top Secret** with Serpent-256-CTR-HMAC-SHA3-512 + Twofish-256-EAX + XChaCha20-Poly1305 + AES-256-GCM-SIV and Ed25519 + ML-DSA-87 authentication.
- Added identity-signed recipient key sets, transcript binding, downgrade rejection and legacy v0.1/v0.2 read compatibility for controlled migration.

#### Clients and crypto providers

- Added the shared `SovereignCryptoCore` Rust implementation and `SovereignCryptoWasm` browser package.
- Added a locally vendored HQC-only WASM runtime inside an isolated browser Worker; no CDN fallback exists.
- Added the Tauri 2 native bridge with five explicit crypto commands and native HQC operations.
- Added the modular Android client/mobile-node foundation; the mobile Sovereign v1 message path remains an explicit beta boundary.

#### Backend, storage and release engineering

- Restored the complete backend storage source package to version control by correcting the repository ignore boundary.
- Added deterministic production metadata, idempotent `setup`, fail-closed `doctor`, hardened systemd/NGINX profiles and repository hygiene checks.
- Verified 28 frontend tests, a real headless-Chromium HQC/cascade smoke test, locked Rust/Tauri tests, a fresh WASM release build and the complete Go suite including storage.

### Technical Beta v2 baseline

- Added controlled federation, Node Registry MVP, governance roles, TrustMesh enforcement, GaiaVault, GaiaDrop, GaiaDrive, GaiaProof, SMTP downgrade boundaries and the operator Security Center.

---

## 📄 License

**AGPLv3 License · © 2026 VisionGaia Technology · Cologne, Germany**

GaiaCom is developed and owned by VisionGaia Technology. GaiaCom is a trademark of VisionGaia Technology. Anyone using and modifying GaiaCom must publish changes under AGPLv3.

---

<div align="center">

**VISIONGAIATECHNOLOGY – WE ARCHITECT THE FUTURE OF SECURITY.**

[![VGT](https://img.shields.io/badge/VisionGaia-Technology-gold?style=for-the-badge)](https://visiongaiatechnology.de)

*GaiaCom Sovereign Beta v2 — Dual-PQC E2EE // X25519 + ML-KEM-1024 + HQC-256 // Sovereign Accelerated + Top Secret // Ed25519 + ML-DSA-87 // Rust + WASM + Tauri 2 // Federated S2S // Node Registry MVP // Governance Layer // Zero Server Trust // GaiaVault // GaiaDrop // GaiaDrive // GaiaProof // TrustMesh // SMTP Bridge // AGPLv3 // VisionGaia Technology*

</div>
