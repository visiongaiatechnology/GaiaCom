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
[![Status](https://img.shields.io/badge/Status-Technical_Beta-yellow?style=for-the-badge)](#)
[![Go](https://img.shields.io/badge/Go-1.26.4-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Node](https://img.shields.io/badge/Node-v24.13-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Crypto](https://img.shields.io/badge/Crypto-ML--KEM--1024_%2B_X25519-orange?style=for-the-badge)](#)
[![E2EE](https://img.shields.io/badge/Security-Post--Quantum_E2EE-red?style=for-the-badge)](#)
[![VGT](https://img.shields.io/badge/VGT-VisionGaiaTechnology-gold?style=for-the-badge)](https://visiongaiatechnology.de)

**HYBRID POST-QUANTUM E2EE · FEDERATED · ZERO SERVER TRUST · CLIENT-SIDE ENCRYPTION**

</div>

---

## ⚠️ Technical Beta

GaiaCom is currently in **active Technical Beta**. The system is under ongoing development by VisionGaia Technology. Beta boundaries are intentional — they exist to keep the attack surface controlled during the security validation phase.

**GaiaCom is being actively expanded.** New capabilities, federation modes and deployment tiers are added continuously. Breaking changes may occur between beta releases.

Found a vulnerability? See [docs/responsible-disclosure.md](docs/responsible-disclosure.md) or open an issue.

---

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
┌─────────────────────────────────────────────────────────────────┐
│                        GAIACOM PLATFORM                          │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│   FRONTEND   │   BACKEND    │  CRYPTO      │  TRUST & IDENTITY  │
│   (React)    │    (Go)      │  ENGINE      │  LAYER             │
│              │              │              │                    │
│ Dark Cyber   │ API Server   │ X25519       │ TrustMesh          │
│ UI / E2EE    │ Auth Layer   │ ML-KEM-1024  │ TrustPassport      │
│ GaiaVault    │ Room/Msg     │ Ed25519      │ GaiaProof          │
│ GaiaDrop     │ Federation   │ AES-256-GCM  │ Key Change Guard   │
│ GaiaProof    │ SMTP Bridge  │ HKDF-SHA256  │ Secure Disclosure  │
│ TrustMesh UI │ SQLite Store │ BIP-39       │ Identity Cap       │
└──────────────┴──────────────┴──────────────┴────────────────────┘
```

### Components

| Component | Description |
|---|---|
| **Frontend** | React web client with client-side cryptography, Vault, Chat, Mail, Trust and Proof functions. Cyberpunk dark UI with split panels and responsive layout. |
| **Backend** | Go API and transport server for authentication, persistence, rooms, messages, federation and SMTP bridge. Pure-Go SQLite via `modernc.org/sqlite` — no CGO dependency. |
| **Crypto Engine** | Browser-side encryption with X25519, ML-KEM-1024, Ed25519, AES-256-GCM, HKDF-SHA256 and SHA-256. All cryptographic operations execute in the user's browser. |
| **GaiaVault** | Client-side encrypted vault for recovery phrases and private keys. PBKDF2-derived keys, no server-side decryption possible. |
| **GaiaDrop** | Secure text-based drop channel for controlled external submissions. Rate-limited, XSS-safe, payload-size controlled. |
| **GaiaProof** | Cryptographic proof structure for message integrity and authenticity verification without plaintext exposure. |
| **TrustMesh** | Local proof-based abuse and reputation layer. No content inspection — abuse handled via cryptographically verifiable patterns and receiver reports. |
| **Federation Layer** | Server-to-server communication via signed PDUs, SSRF protection and replay controls. |
| **SMTP Bridge** | Legacy compatibility mode for classical email with explicit downgrade warning. Not an equal security tier. |

---

## 🔐 Cryptographic Specification

### Suite Identifier

```
GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM
```

### Primitives

| Domain | Algorithm |
|---|---|
| Classical Key Exchange | X25519 |
| Post-Quantum Encapsulation | ML-KEM-1024 |
| Signatures | Ed25519 |
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

### Transcript Binding

Every message cryptographically binds security-relevant fields to the ciphertext via AAD:

- Protocol version
- Algorithm suite
- Sender identity key
- Recipient identity key
- Recipient device key
- Ephemeral X25519 public key
- Hash of ML-KEM ciphertext
- Message ID
- Timestamp
- IV
- Ciphertext hash

Manipulation of any of these fields causes verification or decryption to fail.

### Signature Binding

The sender signs the canonical signature payload with Ed25519. The signature is transmitted separately in the envelope — not included in the signed payload itself.

### Message Envelope

Native GaiaCom messages are transmitted as JSON envelopes. The server stores and transports the envelope without being able to decrypt the payload:

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

## 🏗️ Architecture Principles

### Zero-Trust Design

The server is not treated as a trusted entity for message content. It handles transport, storage, routing and federation — but has no access to:

- Plaintext messages
- Mnemonic / recovery phrase
- Private identity keys
- Private device keys
- Symmetric message keys
- Decrypted vault contents

### Client-Side Encryption

Encryption and decryption happen in the client. Native GaiaCom messages leave the device as encrypted envelopes only.

### Federation over Centralization

Multi-node operation by design. Different nodes communicate as long as their S2S interactions satisfy the defined security rules.

### Controlled Legacy Compatibility

SMTP is not treated as an equivalent security tier. It is an explicit legacy/downgrade mode, clearly separated from native GaiaCom messages in the UI.

### No-Backdoor Architecture

GaiaCom Public is designed without central decryption capability, without admin-decrypt and without global content control. Abuse is handled via proof-based mechanisms, receiver reports, friction, quarantine and local policy — not backdoors.

---

## 🛡️ Federation (S2S)

```
Node A (Sender)                    Node B (Receiver)
       │                                   │
       │  Encrypt & sign message           │
       │                                   │
       │──── HTTP POST /api/v1/federation/pdu (Signed PDU) ────►│
       │                                   │
       │                          SSRF & IP firewall check
       │                          Timestamp window check
       │                          Signature verification
       │                          Replay protection (PDU-ID cache)
       │                                   │
       │◄──────────────── 200 OK / PDU Accepted ───────────────│
```

### S2S Security Layers

- **Signed PDUs** — every federated interaction is serialized as a PDU cryptographically signed by the sending node's private key
- **SSRF & DNS Rebinding Firewall** — requests to `localhost`, RFC 1918 private IP ranges and DNS redirects to local subnets are blocked at connection time
- **Replay Protection** — received PDU IDs are held in cache; duplicate IDs within the validity window are immediately rejected
- **Timestamp Validation** — PDUs are rejected if their timestamp is too far in the past or future

> **Beta:** Open public federation with arbitrary domains is disabled. Federation is limited to controlled, known technical nodes.

---

## 🔒 Security Architecture

### API Security

- Authentication required before protected endpoints
- Authorization derived from server context — not from client payload
- `403` on unauthorized object access (BOLA/BFLA protection)
- `401` on missing or invalid authentication
- No stack traces in API responses
- No internal paths in error responses
- No `actorId` authorization from JSON body
- Server-side identity ownership verification
- BOLA/BFLA regression tests in test suite

### Frontend Security

- No `dangerouslySetInnerHTML` for user content
- No raw HTML injection
- Markdown rendered as safe React nodes or text
- XSS payloads rendered inert
- Controlled avatar values — no external avatar URLs
- No SVG avatars in beta
- SMTP downgrade warning always visible when relevant

### Deployment Security (Production)

```
NGINX (Edge Proxy)
  → Go Backend local on 127.0.0.1:8080 only
  → HTTPS only
  → TLS 1.2 / TLS 1.3
  → ssl_early_data off
  → HSTS
  → CSP
  → X-Content-Type-Options: nosniff
  → X-Frame-Options: DENY
  → Referrer-Policy
  → No PHP execution in GaiaCom VHost
  → No public source directories
  → No public .env / .git / Backend / Frontend / docs
  → Rate limits: API / Auth / CSP Reports / Federation / SMTP
```

---

## 📦 Feature Overview

### Available in Beta

| Feature | Status |
|---|---|
| Native E2EE Direct Messaging | ✅ Active |
| Group Rooms | ✅ Active |
| GaiaVault (client-side encrypted) | ✅ Active |
| GaiaDrop (text-only) | ✅ Active |
| GaiaProof | ✅ Active |
| TrustMesh (local enforcement) | ✅ Active |
| Trust Passport | ✅ Active |
| Key Change Warning | ✅ Active |
| Controlled Federation | ✅ Active (known nodes only) |
| SMTP Bridge (explicit downgrade) | ✅ Active |
| Secure Disclosure | ✅ Active |
| Security Harness (44 crypto checks) | ✅ Active |
| Clean Build Verification | ✅ Active |

### Intentionally Disabled in Beta

| Feature | Reason |
|---|---|
| File attachments / media / images | Pending separate attachment and parser audit |
| Open public federation | Controlled rollout only |
| Open node registrations | Controlled beta access |
| Global synchronized Abuse Consensus | Local-only in beta |
| Multi-device group sync per identity | Pending |
| Attachment-based GaiaDrop | Pending audit |

---

## ⚙️ Configuration

### Environment Variables — Core

| Variable | Default | Description |
|---|---|---|
| `GAIACOM_DEV_MODE` | `false` | Enables dev mode (extended logging, relaxed CSP for localhost) |
| `PORT` | `8080` | Port the Go backend listens on |
| `GAIACOM_DB_PATH` | `data/gaiacom.db` | Path to the SQLite database |
| `JWT_SECRET` | *(generated)* | Secret for session tokens — **must be set in production** |

### Environment Variables — SMTP Bridge

| Variable | Required | Description |
|---|---|---|
| `GAIACOM_SMTP_HOST` | **Yes** | Outgoing mail server (e.g. `smtp.gmail.com`) |
| `GAIACOM_SMTP_FROM` | **Yes** | Sender address of the bridge (e.g. `bridge@gaiacom.de`) |
| `GAIACOM_SMTP_PORT` | No | SMTP port (default: `587` with STARTTLS) |
| `GAIACOM_SMTP_USERNAME` | No | Auth username (leave empty if no auth required) |
| `GAIACOM_SMTP_PASSWORD` | No | Auth password |
| `GAIACOM_SMTP_INGEST_TOKEN` | No | Token for authenticating incoming mail into the SMTP inbox |

---

## 🚀 Local Development & Build

### Clean Copy Build (Local Verification)

Build and verify without stale caches, local databases or `.env` files:

**1. Clean copy (excludes binaries, node_modules, local DBs):**

```powershell
robocopy . ..\GaiaCOM_CLEAN_VERIFY /E /XD node_modules build dist .git .idea .vscode tmp temp logs data __pycache__ /XF *.exe *.dll *.so *.db *.sqlite *.sqlite3 *.log .env .env.local .env.production gaiacom-backend gaiacom-backend-linux-amd64
```

**2. Clear build cache:**

```bash
go clean -cache
```

**3. Backend tests & compile:**

```bash
cd Backend
go test ./...
go build -o gaiacom-backend.exe .
```

**4. Frontend tests & compile:**

```bash
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

## ⚠️ SMTP Bridge — Important

SMTP is not a GaiaCom native security tier. The moment a message is delivered via SMTP, it leaves the native GaiaCom security space.

The UI always displays:

> *"Diese Nachricht verlässt den GaiaCom-Sicherheitsraum. SMTP-Zustellung bietet keine GaiaCom-native Ende-zu-Ende-Garantie, keine TrustMesh-Garantie und keine No-Godmode-Garantie ab dem Gateway."*

No silent native-to-SMTP forwarding. No automatic mirroring of native messages. Authentication required. Open relay protection active.

---

## 🚧 Known Security Boundaries

GaiaCom does not protect against every conceivable threat:

- A fully compromised endpoint can capture plaintext at runtime
- SMTP delivery provides no native GaiaCom E2EE guarantee
- Manual key-replacement confirmation is required in beta
- Open public federation is disabled in beta
- Global synchronized Abuse Consensus is not yet active
- File and media attachments are disabled pending audit
- Metadata may remain partially visible depending on communication path
- No system can guarantee absolute anonymity, absolute invulnerability or full immunity against operational security errors

---

## 🎯 Target Deployments

**Public Network** — private users, communities, activists, journalists, developers and security-conscious communication.

**Enterprise** — organizations, teams, law firms, security departments, research groups and companies requiring sovereign communication infrastructure.

**Defense / Government** — isolated government deployments, agency communication and sovereign infrastructure under independent control.

> GaiaCom Defense is not a backdoor into GaiaCom Public. It is a separate deployment line with its own infrastructure, policies and key sovereignty.

---

## 📊 Dependency Philosophy

### Backend

Go standard library first. Minimal selected dependencies:

- `github.com/cloudflare/circl` — post-quantum cryptography (ML-KEM-1024)
- `golang.org/x/crypto` — cryptographic extensions
- `modernc.org/sqlite` — pure-Go SQLite, no CGO required

### Frontend

Selected cryptographic libraries only. No heavy UI frameworks. Small, auditable, controlled attack surface.

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

GaiaCom is developed and owned by VisionGaia Technology. Anyone using and modifying GaiaCom must publish changes under AGPLv3.

---

<div align="center">

**VISIONGAIATECHNOLOGY – WE ARCHITECT THE FUTURE OF SECURITY.**

[![VGT](https://img.shields.io/badge/VisionGaia-Technology-gold?style=for-the-badge)](https://visiongaiatechnology.de)

*GaiaCom — Post-Quantum E2EE // Hybrid ML-KEM-1024 + X25519 // Ed25519 Signatures // AES-256-GCM // HKDF-SHA256 // Federated S2S // Zero Server Trust // GaiaVault // GaiaDrop // GaiaProof // TrustMesh // SMTP Bridge // AGPLv3 // VisionGaia Technology*

</div>
