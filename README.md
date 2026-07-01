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
[![Status](https://img.shields.io/badge/Status-Technical_Beta_v2-yellow?style=for-the-badge)](#)
[![Go](https://img.shields.io/badge/Go-1.26.4-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Node](https://img.shields.io/badge/Node-v24.13-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Crypto](https://img.shields.io/badge/Crypto-ML--KEM--1024_%2B_X25519-orange?style=for-the-badge)](#)
[![TopSecret](https://img.shields.io/badge/Top_Secret-Ed25519_%2B_ML--DSA--87-red?style=for-the-badge)](#)
[![E2EE](https://img.shields.io/badge/Security-Post--Quantum_E2EE-red?style=for-the-badge)](#)
[![Federation](https://img.shields.io/badge/Federation-Signed_PDU_S2S-blue?style=for-the-badge)](#)
[![VGT](https://img.shields.io/badge/VGT-VisionGaiaTechnology-gold?style=for-the-badge)](https://visiongaiatechnology.de)

**HYBRID POST-QUANTUM E2EE · FEDERATED · ZERO SERVER TRUST · CLIENT-SIDE ENCRYPTION**

</div>

---

## ⚠️ Technical Beta v2

GaiaCom is currently in **active Technical Beta v2**. The system is under ongoing development by VisionGaia Technology. Beta boundaries are intentional — they exist to keep the attack surface controlled during the security validation phase.

**GaiaCom is being actively expanded.** New capabilities, federation modes and deployment tiers are added continuously. Breaking changes may occur between beta releases.

Found a vulnerability? See [docs/responsible-disclosure.md](docs/responsible-disclosure.md) or open an issue.

> GaiaCom is a trademark of VisionGaia Technology.

---

<img width="1909" height="985" alt="image" src="https://github.com/user-attachments/assets/a69674a0-5a50-4bb0-9c66-78bbe28b0dc9" />


## 🔍 What is GaiaCom?

Today's communication systems are either centralized, server-trusting, not fully end-to-end encrypted — or not prepared for post-quantum threats. Most messengers are one database breach away from total plaintext exposure. Email was never designed for confidentiality.

**GaiaCom redefines secure digital communication as sovereign infrastructure.**

A federated communication platform with native end-to-end encryption and future-proof hybrid post-quantum cryptography. The system protects conversations, group chats and file drops against external attackers, compromised server nodes and future quantum computers — by design, not by policy.

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
  Hybrid KEM (X25519 + ML-KEM-1024) → attacker must break both layers
  Top Secret Mode           → Ed25519 + ML-DSA-87 dual signature gate
  Federation                → signed PDUs, SSRF protection, replay guards
```

GaiaCom is not a messenger. It is a **new communication infrastructure** for sovereign digital communication — connecting native messaging, rooms, digital identities, trust metadata and controlled legacy compatibility via SMTP.

---

## 📋 Documentation Index

Full protocol design and threat model documentation in [`docs/`](docs/):

| Document | Content |
|---|---|
| [Protocol Specification v0.1](docs/protocol-v0.1.md) | Hybrid X25519/ML-KEM combiners, AAD binding, signature serialization |
| [Threat Model](docs/threat-model.md) | System boundaries, STRIDE categories, mitigations |
| [Security Invariants](docs/security-invariants.md) | Invariants verified by the test suite |
| [Beta Known Limitations](docs/beta-known-limitations.md) | Beta constraints and sandbox boundaries |
| [Abuse Consensus](docs/abuse-consensus.md) | TrustMesh score decay and friction policies |
| [Responsible Disclosure](docs/responsible-disclosure.md) | Guidelines for submitting security reports |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          GAIACOM PLATFORM                             │
├──────────────┬──────────────┬─────────────────┬──────────────────────┤
│   FRONTEND   │   BACKEND    │  CRYPTO ENGINE  │  TRUST & GOVERNANCE  │
│   (React)    │    (Go)      │                 │                      │
│              │              │ X25519          │ TrustMesh            │
│ Dark Cyber   │ API Server   │ ML-KEM-1024     │ TrustPassport        │
│ UI / E2EE    │ Auth Layer   │ Ed25519         │ GaiaProof            │
│ GaiaVault    │ Room/Msg     │ ML-DSA-87 ★     │ Key Change Guard     │
│ GaiaDrop     │ Federation   │ AES-256-GCM     │ Secure Disclosure    │
│ GaiaProof    │ SMTP Bridge  │ HKDF-SHA256     │ Identity Cap         │
│ TrustMesh UI │ SQLite Store │ BIP-39          │ Node Registry MVP ★  │
│ Security Ctr │ GaiaDrive ★  │                 │ Governance Layer ★   │
│ Node Mgmt ★  │ GSN ★        │                 │ Senior/Trust Rev. ★  │
└──────────────┴──────────────┴─────────────────┴──────────────────────┘
★ New in Beta v2
```

<img width="1914" height="983" alt="image" src="https://github.com/user-attachments/assets/60fa6898-a439-46c8-a5e1-687facfcbc10" />


<img width="1912" height="980" alt="image" src="https://github.com/user-attachments/assets/ad311b5e-7b33-4abc-bd79-c4af640d28d7" />


### Components

| Component | Description |
|---|---|
| **Frontend** | React web client with client-side cryptography, Vault, Chat, Mail, Trust and Proof functions. Cyberpunk dark UI with split panels and responsive layout. |
| **Backend** | Go API and transport server for authentication, persistence, rooms, messages, federation, governance, security, GSN, GaiaDrive, GaiaDrop, SMTP bridge and Node Registry. |
| **Crypto Engine** | Browser-side encryption with X25519, ML-KEM-1024, Ed25519, AES-256-GCM, HKDF-SHA256 and SHA-256. All cryptographic operations execute in the user's browser. |
| **GaiaVault** | Client-side encrypted vault for recovery phrases and private keys. PBKDF2-derived keys, no server-side decryption possible. |
| **GaiaDrop** | Secure text-based drop channel for controlled external submissions. Rate-limited, XSS-safe, payload-size controlled. |
| **GaiaDrive** | File storage layer with optional S3-compatible object store backend. |
| **GaiaProof** | Cryptographic proof structure for message integrity and authenticity verification without plaintext exposure. |
| **TrustMesh** | Local proof-based abuse and reputation layer. No content inspection — abuse handled via cryptographically verifiable patterns and receiver reports. |
| **Federation Layer** | Server-to-server communication via signed PDUs, SSRF protection and replay controls. |
| **Node Registry MVP** | Controlled node onboarding mechanism. Nodes ping the main registry and are accepted, quarantined or blocked by operators. |
| **Governance Layer** | Role-based system with Node Operator, Senior Reviewer and Trusted Reviewer roles. Bootstrapped via `governance.json`. |
| **SMTP Bridge** | Legacy compatibility mode for classical email with explicit downgrade warning. Not an equal security tier. |
| **Top Secret Chat Mode** | Ed25519 + ML-DSA-87 dual-signature capability gate for highest-security communications. |

---

## 🔐 Cryptographic Specification

### Suite Identifiers

```
Standard:    GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM
Top Secret:  GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87
```

### Primitives

| Domain | Algorithm |
|---|---|
| Classical Key Exchange | X25519 |
| Post-Quantum Encapsulation | ML-KEM-1024 |
| Signatures (Standard) | Ed25519 |
| Signatures (Top Secret) | Ed25519 + ML-DSA-87 |
| Symmetric Encryption | AES-256-GCM |
| Key Derivation / Combiner | HKDF-SHA256 |
| Hashing | SHA-256 |
| Mnemonic | BIP-39, 12 words |

### Hybrid KEM Principle

For native messages, a shared symmetric key is derived from two independent sources:

1. Classical X25519 shared secret
2. Post-quantum ML-KEM-1024 shared secret

Both secrets are combined with explicit length-prefixing and passed through HKDF-SHA256 to produce a 256-bit key. An attacker must break **both** layers independently to reconstruct the combined key.

```
X25519 Shared Secret
        +
ML-KEM-1024 Shared Secret
        ↓
length-prefixed concatenation
        ↓
HKDF-SHA256
        ↓
256-bit Symmetric Key
        ↓
AES-256-GCM Encrypt(payload, key, iv, AAD)
```

### Top Secret Chat Mode

Top Secret Mode requires a remote capability gate. The remote node must advertise the `GaiaCom/v0.2/top-secret` suite via `/.well-known/gaiacom/nodeinfo`. Connections are rejected if:

- ML-DSA-87 capability is missing
- Downgrade from Top Secret to Standard is attempted
- ML-DSA-87 signature bundle is absent
- Remote node is unknown or incompatible

### Transcript Binding

Every message cryptographically binds security-relevant fields to the ciphertext via AAD:

- Protocol version, algorithm suite
- Sender identity key, recipient identity key, recipient device key
- Ephemeral X25519 public key, hash of ML-KEM ciphertext
- Message ID, timestamp, IV, ciphertext hash

Manipulation of any field causes verification or decryption to fail.

### Message Envelope

```json
{
  "kem_ciphertext":     "<hex-encoded — 1568 bytes>",
  "ephemeral_pub":      "<hex-encoded — 32 bytes>",
  "payload_ciphertext": "<hex-encoded — variable>",
  "iv":                 "<hex-encoded — 12 bytes>",
  "signature":          "<hex-encoded — 64 bytes>",
  "client_message_id":  "<uuid>",
  "timestamp":          1781881729381
}
```

---

<img width="1917" height="984" alt="image" src="https://github.com/user-attachments/assets/99fe0d25-23cd-4379-8900-e0360a94b7b9" />


## 🏗️ Architecture Principles

**Zero-Trust Design** — the server handles transport, storage, routing and federation but has no access to plaintext messages, mnemonics, private identity or device keys, symmetric message keys or decrypted vault contents.

**Client-Side Encryption** — encryption and decryption happen in the client. Native GaiaCom messages leave the device as encrypted envelopes only.

**Federation over Centralization** — multi-node operation by design. Different nodes communicate as long as their S2S interactions satisfy the defined security rules.

**Controlled Legacy Compatibility** — SMTP is an explicit legacy/downgrade mode, clearly separated from native GaiaCom messages in the UI. Not an equal security tier.

**No-Backdoor Architecture** — GaiaCom Public has no central decryption capability, no admin-decrypt and no global content control. Abuse is handled via proof-based mechanisms, receiver reports, friction, quarantine and local policy.

---

<img width="1908" height="985" alt="image" src="https://github.com/user-attachments/assets/d94ef97a-3e81-4f03-921c-a83ac73aac75" />



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
$env:CI='false'
.\node_modules\.bin\react-app-rewired.cmd build
```

**Backend (Linux AMD64):**
```powershell
cd Backend
$env:GOOS='linux'
$env:GOARCH='amd64'
$env:CGO_ENABLED='0'
go build -trimpath -ldflags='-s -w' -o gaiacom-backend-linux-amd64 .
```

### Deploy

```
1.  Prepare domain + HTTPS
2.  Copy gaiacom-backend-linux-amd64 to server
3.  Deploy Frontend/frontend/build to web root
4.  Create governance.json with operator GaiaID
5.  Set production environment variables
6.  Start backend
7.  Create account + GaiaID matching governance.json
8.  Open Security Center → Nodesystem → Generate Secrets
9.  Set generated secrets as env vars, restart backend
10. Security Center → Nodesystem → Ping Main Node
11. Get accepted by main node operator
12. Test federation
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
WorkingDirectory=/opt/gaiacom/backend
ExecStart=/opt/gaiacom/backend/gaiacom-backend-linux-amd64
Restart=always
RestartSec=5
Environment=SERVER_PORT=8080
Environment=DB_PATH=/opt/gaiacom/data/gaiacom.db
Environment=SQLITE_MAX_OPEN_CONNS=4
Environment=GAIACOM_DEV_MODE=false
Environment=GAIACOM_COOKIE_SECURE=true
Environment=GAIACOM_SERVER_NAME=node.example.org
Environment=GAIACOM_REGISTRY_MAIN_NODE=https://beta.gaiacom.de
Environment=GAIACOM_REGISTRY_AUTHORITY_DOMAIN=gaiacom.de
EnvironmentFile=/opt/gaiacom/config/gaiacom.secrets.env
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaiacom/data /opt/gaiacom/storage /opt/gaiacom/config

[Install]
WantedBy=multi-user.target
```

`gaiacom.secrets.env` (permissions: `0600`):

```bash
GAIACOM_JWT_SECRET=<min-32-byte-random>
GAIACOM_SHIELD_SECRET=<min-32-byte-random>
GAIACOM_SERVER_PRIVATE_KEY=<ed25519-private-key-hex>
GAIACOM_TRUSTMESH_EPOCH_SECRET=<32-byte-hex>
GAIACOM_GOVERNANCE_CONFIG=/opt/gaiacom/config/governance.json
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

### Auth & Security

| Variable | Required | Description |
|---|---|---|
| `GAIACOM_JWT_SECRET` | **Yes** | JWT signing secret — minimum 32 bytes random |
| `GAIACOM_SHIELD_SECRET` | **Yes** | GaiaShield internal security HMACs — minimum 32 bytes |
| `GAIACOM_COOKIE_SECURE` | **Yes** | Must be `true` for HTTPS production deployments |

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
SERVER_PORT=8080
DB_PATH=/opt/gaiacom/data/gaiacom.db
SQLITE_MAX_OPEN_CONNS=4
GAIACOM_DEV_MODE=false
GAIACOM_COOKIE_SECURE=true
GAIACOM_SERVER_NAME=node.example.org
GAIACOM_SERVER_PRIVATE_KEY=<hex>
GAIACOM_TRUSTMESH_EPOCH_SECRET=<hex>
GAIACOM_JWT_SECRET=<strong-secret>
GAIACOM_SHIELD_SECRET=<strong-secret>
GAIACOM_GOVERNANCE_CONFIG=/opt/gaiacom/config/governance.json
GAIACOM_REGISTRY_MAIN_NODE=https://beta.gaiacom.de
GAIACOM_REGISTRY_AUTHORITY_DOMAIN=gaiacom.de
GAIACOM_STORAGE_ROOT=/opt/gaiacom/storage
```

---

## ✅ Pre-Launch Security Checklist

- [ ] `GAIACOM_DEV_MODE=false`
- [ ] HTTPS active on all endpoints
- [ ] `GAIACOM_COOKIE_SECURE=true`
- [ ] `GAIACOM_JWT_SECRET` — strong and secret
- [ ] `GAIACOM_SHIELD_SECRET` — strong and secret
- [ ] `GAIACOM_SERVER_PRIVATE_KEY` set
- [ ] `GAIACOM_TRUSTMESH_EPOCH_SECRET` set
- [ ] `GAIACOM_SERVER_NAME` is the public domain
- [ ] `governance.json` contains real operator GaiaID
- [ ] `governance.json` permissions: `0600`
- [ ] DB path outside source directory
- [ ] Storage path outside source directory
- [ ] Backups configured for DB and storage
- [ ] Nginx/proxy routes `/.well-known/gaiacom/*` to backend
- [ ] Security Center accessible as Node Operator
- [ ] Nodesystem shows server name, core hash and public key
- [ ] Main Node ping tested successfully

---

## 🔄 Update Checklist

```bash
# 1. Stop service
systemctl stop gaiacom

# 2. Backup DB
cp /opt/gaiacom/data/gaiacom.db /opt/gaiacom/backups/gaiacom-$(date +%F-%H%M).db

# 3. Deploy new binary and frontend build

# 4. Start service
systemctl start gaiacom

# 5. Verify
curl https://node.example.org/.well-known/gaiacom/nodeinfo
curl https://node.example.org/.well-known/gaiacom/nodes

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
- No external avatar URLs, no SVG avatars in beta
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

### Available in Beta v2

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
| Top Secret Chat Mode (Ed25519 + ML-DSA-87) | ✅ Active |
| SMTP Bridge (explicit downgrade) | ✅ Active |
| Secure Disclosure | ✅ Active |
| Human Proof | ✅ Active |
| S3-compatible Object Store | ✅ Optional |
| Security Harness (44 crypto checks) | ✅ Active |

### Intentionally Disabled in Beta

| Feature | Reason |
|---|---|
| File attachments / media / images in chat | Pending separate attachment and parser audit |
| Open public federation | Controlled rollout only |
| Open node registrations | Controlled beta access |
| Global synchronized Abuse Consensus | Local-only in beta |
| Multi-device group sync per identity | Pending |
| Attachment-based GaiaDrop | Pending audit |
| Automatic update pipeline | Prepared, not yet implemented |

---

## 🚀 Local Development & Build Verification

### Clean Copy Build

```powershell
# 1. Clean copy (excludes binaries, node_modules, local DBs)
robocopy . ..\GaiaCOM_CLEAN_VERIFY /E /XD node_modules build dist .git .idea .vscode tmp temp logs data __pycache__ /XF *.exe *.dll *.so *.db *.sqlite *.sqlite3 *.log .env .env.local .env.production gaiacom-backend gaiacom-backend-linux-amd64

# 2. Clear build cache
go clean -cache

# 3. Backend
cd Backend
go test ./...
go build -o gaiacom-backend.exe .

# 4. Frontend
cd Frontend/frontend
npm ci
npm run build
node src/adversarial_run.mjs    # 44 cryptographic frontend checks
```

### Verification Matrix

| Check | Expected |
|---|---|
| Frontend Adversarial Harness (44 checks) | PASS |
| Total System PoC Runner | PASS |
| Backend Unit Tests | PASS |
| Frontend Production Build | PASS |
| Static Secret Scans | PASS |
| Rendering Scans | PASS |
| `actorId` Payload Scans | PASS |
| Localhost Production Build Checks | PASS |
| Clean Local Verification | PASS |

---

## ⚠️ SMTP Bridge

SMTP is not a GaiaCom native security tier. The moment a message is delivered via SMTP, it leaves the native GaiaCom security space.

The UI always displays:

> *"Diese Nachricht verlässt den GaiaCom-Sicherheitsraum. SMTP-Zustellung bietet keine GaiaCom-native Ende-zu-Ende-Garantie, keine TrustMesh-Garantie und keine No-Godmode-Garantie ab dem Gateway."*

No silent native-to-SMTP forwarding. Authentication required. Open relay protection active. CRLF and header injection protection active.

---

## 🚧 Known Security Boundaries

- A fully compromised endpoint can capture plaintext at runtime
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
- `github.com/cloudflare/circl` — post-quantum cryptography (ML-KEM-1024, ML-DSA-87)
- `golang.org/x/crypto` — cryptographic extensions
- `modernc.org/sqlite` — pure-Go SQLite, no CGO required

**Frontend:** Selected cryptographic libraries only. No heavy UI frameworks. Small, auditable, controlled attack surface.

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

## 📄 License

**AGPLv3 License · © 2026 VisionGaia Technology · Cologne, Germany**

GaiaCom is developed and owned by VisionGaia Technology. GaiaCom is a trademark of VisionGaia Technology. Anyone using and modifying GaiaCom must publish changes under AGPLv3.

---

<div align="center">

**VISIONGAIATECHNOLOGY – WE ARCHITECT THE FUTURE OF SECURITY.**

[![VGT](https://img.shields.io/badge/VisionGaia-Technology-gold?style=for-the-badge)](https://visiongaiatechnology.de)

*GaiaCom Beta v2 — Post-Quantum E2EE // Hybrid ML-KEM-1024 + X25519 // Ed25519 + ML-DSA-87 Top Secret Mode // AES-256-GCM // HKDF-SHA256 // Federated S2S // Node Registry MVP // Governance Layer // Zero Server Trust // GaiaVault // GaiaDrop // GaiaDrive // GaiaProof // TrustMesh // SMTP Bridge // AGPLv3 // VisionGaia Technology*

</div>
