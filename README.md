# ⬡ GaiaCom Protocol

[![Status](https://img.shields.io/badge/Status-PRE--ALPHA-red?style=for-the-badge)](#)
[![Phase](https://img.shields.io/badge/Phase-Architectural-orange?style=for-the-badge)](#roadmap)
[![License Core](https://img.shields.io/badge/Core-AGPLv3-green?style=for-the-badge)](LICENSE)
[![License Client](https://img.shields.io/badge/Client-GPLv3-green?style=for-the-badge)](#licensing)
[![PQC](https://img.shields.io/badge/Crypto-ML--KEM--1024%20%2B%20X25519-blue?style=for-the-badge)](#architecture)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go)](https://go.dev)
[![VGT](https://img.shields.io/badge/VGT-VisionGaia_Technology-red?style=for-the-badge)](https://visiongaiatechnology.de)

> *"We do not patch the old internet. We replace it."*

**GaiaCom** is a decentralized, post-quantum secure communication protocol designed to replace SMTP and centralized messaging infrastructure. No central servers. No metadata leaks. No administrator with a god-mode button.

**Email has been broken for 40 years. GaiaCom is the sovereign alternative.**

---

## ⚠️ Classified — Active Development

This repository contains the core architectural logic for the GaiaCom Protocol. Cryptographic primitives (Kyber / X25519) are standard and audited — but the implementation is under active development.

**Do NOT use for mission-critical operations yet.**

---

## 🚨 The Problem: SMTP Is a 1980s Relic

Email was designed in an era before the internet was hostile. Today it is unencrypted by default, metadata-heavy, spam-ridden, and runs through central servers — Google, GMX, Microsoft — that can read, block, or hand over everything.

| SMTP / Centralized Messaging | GaiaCom Protocol |
|---|---|
| ❌ Unencrypted by default | ✅ Kyber-1024 + X25519 hybrid encryption |
| ❌ Central servers — single point of failure | ✅ Federated nodes — no honeypot |
| ❌ Metadata leaks (sender, receiver, timing) | ✅ Traffic shaping + onion-routing logic |
| ❌ God mode — admins can read & ban | ✅ No global administrator. Ever. |
| ❌ Vulnerable to "Store Now, Decrypt Later" | ✅ Post-quantum protection at NIST Level 5 |
| ❌ Compliance demands expose all data | ✅ Mathematical impossibility — server sees only encrypted blobs |

---

## 🛡️ Defense Architecture — The Hybrid Shield

GaiaCom uses a layered cryptographic scheme to ensure security against both current threats and future quantum decryption attacks.

```
┌────────────────────────────────────────────────┐
│              YOUR DEVICE                        │
│  Message → Kyber-1024 Encryption → Blob        │
│  Private Key NEVER leaves this layer           │
├────────────────────────────────────────────────┤
│              TRANSPORT LAYER                    │
│  Noise Protocol Framework                      │
│  Metadata obfuscation + forward secrecy        │
├────────────────────────────────────────────────┤
│              NETWORK LAYER                      │
│  Federated Nodes (AGPLv3)                      │
│  No central authority. No single point.        │
├────────────────────────────────────────────────┤
│              STORAGE LAYER                      │
│  IPFS / Distributed Hash Table                 │
│  Encrypted blobs. Redundant. Unreadable.       │
├────────────────────────────────────────────────┤
│              RECIPIENT DEVICE                   │
│  Only private key can decrypt the blob         │
│  Even under subpoena: server has nothing       │
└────────────────────────────────────────────────┘
```

### Key Exchange (Classic) — X25519
Elliptic Curve Diffie-Hellman. High-speed, proven security against all classical adversaries.

```go
curve := ecdh.X25519()
sharedSecret, _ := curve.ECDH(priv, pub)
```

### Key Exchange (Post-Quantum) — ML-KEM-1024 (Kyber)
NIST Level 5. Full protection against "Store Now, Decrypt Later" quantum attacks.

```go
// Quantum Resistant Encapsulation
ss, ct, _ := kyber1024.Encapsulate(pk)
```

**Status: `PARANOID-LEVEL ACTIVE`**

---

## 🌐 The Trinity Ecosystem

GaiaCom is not one product. It is an infrastructure layer with three distinct deployment modes.

### 🏢 GaiaCom Enterprise — Business
For organizations requiring absolute data sovereignty. Eliminates industrial espionage risk through decentralized fragmentation.
- **Internal Godmode:** Full administrative control over your corporate network. You hold the keys — not us.
- **Infrastructure Independence:** You control the network logic, not the physical hardware.
- **Target:** Law firms, mechanical engineering, private banking, DAX40, pharma, automotive.

### 🌍 GaiaCom Network — Public
The global infrastructure for humanity. Free, uncensorable, mathematically neutral.
- **No Godmode:** VisionGaia has zero access. No backdoors. No admin read access.
- **Targeted Intervention:** Access only reactively for verified, user-reported terrorist activity via network consensus.
- **Target:** Everyone.

### 🏛️ GaiaCom Defend — Government
High-security infrastructure for agencies, military, and state executive bodies.
- **Total State Sovereignty:** Full Godmode for the authorized state entity.
- **Isolated Silos:** Physically and logically separated from the public network.
- **Operable:** Even when civilian internet is compromised.
- **Target:** Ministries, Bundeswehr, BKA. White-label ready ("BundesMessenger").

---

## 💶 Commercial Tiers

| | **Hidden Champion** | **Corporate Fortress** | **National Defense** |
|---|---|---|---|
| **Target** | SME, Kanzleien, Mittelstand | DAX40, Pharma, Automotive | Ministerien, Bundeswehr, BKA |
| **License** | 24.000 €/yr | 150.000 €/yr + 5€/User/mo | RESTRICTED |
| **Setup** | 5.000 € | 50.000 € (AD/LDAP) | Classified |
| **Users** | Up to 500 | Unlimited | Site License |
| **SLA** | Silver (48h) | Gold (24/7 Hotline) | Classified |
| **Infrastructure** | 1x Self-Hosted Node | HA-Cluster (Multi-Node) | Air-Gapped |
| **Source Audit** | — | — | ✅ Full |
| **White Label** | — | — | ✅ ("BundesMessenger") |

> App for individuals: **3.69 € once** (Bot Protection Fee) — available on AppStore & PlayStore. Or compile it yourself for free.

---

## 🏛️ Governance — The Glass Fortress

### The Foundation — Non-Profit DAO
The GaiaCom Foundation is the neutral guardian of the protocol. It operates without profit motive.
- **Protocol Stewardship:** Maintains Open Source code. Organizes updates via community consensus.
- **Bootstrap Nodes:** Operates entry nodes for the public network.
- **Funding:** Purely through donations and grants. Zero commercial sales.

### VisionGaia Technology — Commercial Entity
The commercial architect. We monetize the application — not user data.
- **Revenue:** Enterprise licenses, hardware nodes, premium apps, SLA contracts.
- **Zero Liability:** No operational involvement in the public network. Pure technical supplier.

---

## 📜 License Matrix

| Component | License | Philosophy |
|---|---|---|
| **Core Node** (routing, storage, consensus) | AGPLv3 | "Toxic" to cloud giants — modifications must be shared |
| **Client App** (desktop & mobile) | GPLv3 | Verifiable security — encryption must be transparent |
| **Enterprise Modules** (LDAP, Godmode, HA) | Proprietary | Not in this repository. Binary plugins for licensed partners. |

> **AGPLv3 Clause:** If you run the GaiaCom node as a SaaS service, you MUST open-source your modifications. No extraction by cloud giants.

---

## 🚀 Build Instructions

### Requirements
- Go >= 1.22
- Rust (for Kyber FFI bindings)
- Docker

### Setup

```bash
# Clone the repository
git clone https://github.com/VisionGaiaTechnology/gaiacom-protocol.git

# Initialize submodules (Crypto libs)
git submodule update --init --recursive

# Build the node (Alpha)
go build -o gaia-node ./cmd/node
```

> Full build documentation coming with Phase 1 release.

---

## 🤝 Contribution Guidelines

The bar is high. This is infrastructure, not a side project.

- **GPG Signing:** All commits must be GPG signed. Unsigned commits are rejected by CI/CD immediately.
- **No External Analytics:** Do not submit code that calls home, tracks users, or loads external scripts.
- **Tests:** Every PR must include unit tests covering the new logic.
- **Security Vulnerabilities:** Do NOT open a GitHub Issue for critical exploits. Contact us via encrypted channel: `security@visiongaiatechnology.de` *(PGP key available on website)*

---

## 🗺️ Roadmap

| Phase | Milestone | Status |
|---|---|---|
| 🔄 Phase 0 | **Architectural Design** — Protocol spec, crypto selection, governance model | **Active** |
| 📋 Phase 1 | **Core Node** — Federated routing, encrypted storage, Noise transport | Planned |
| 📋 Phase 2 | **Client Alpha** — Desktop app, key management, basic messaging | Planned |
| 📋 Phase 3 | **Network Launch** — Public testnet, bootstrap nodes, community onboarding | Planned |
| 📋 Phase 4 | **Enterprise Modules** — LDAP, Godmode panel, HA clustering | Planned |
| 🔒 Phase 5 | **Mainnet + Government** — Full audit, white-label, national deployments | Locked |

---

## 📡 Operational Command

**Commercial Entity — Enterprise Licensing, Government Contracts, SLA:**

[![VisionGaia Technology](https://img.shields.io/badge/VGT-visiongaiatechnology.de-red?style=for-the-badge)](https://visiongaiatechnology.de)

**Non-Profit Governance — GaiaCom Foundation (DAO):**
Structure pending. Community-governed. Contribution-driven.

---

> *"Code is Law. Privacy is Power."*

---

## 🏢 Built by VisionGaia Technology

VisionGaia Technology builds enterprise-grade security and AI tooling — engineered to the DIAMANT VGT SUPREME standard.

> *"When SMTP dies — and it will — GaiaCom will already be running."*

---

*Pre-Alpha — GaiaCom Protocol // Post-Quantum Sovereign Communication Infrastructure*
