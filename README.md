[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Sovereign Post-Quantum Communication" />

# GaiaCom

### Sovereign post-quantum communication infrastructure

[![Version](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Stack](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Cryptography](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audit](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Website](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**A federated, client-encrypted communication platform with a hybrid post-quantum design.**

</div>

> **VisionGaiaTechnology — Department of Unnecessary Security™**
>
> We build communication infrastructure that does not ask for trust it cannot prove.
> The department exists because "unnecessary" security is exactly what becomes necessary
> the moment someone else holds the keys.

---

## Menu

[Overview](#overview) · [VGT Licence](#vgt-licence) · [Beta V3](#beta-v3) · [Screenshots](#screenshots) · [Features](#features) · [Technical information](#technical-information) · [What makes GaiaCom different](#what-makes-gaiacom-different) · [Build from source](#build-from-source) · [Become a node operator](#become-a-node-operator) · [Security and audit status](#security-and-audit-status) · [Project structure](#project-structure) · [Contributing](#contributing) · [License](#license)

---

<a id="overview"></a>
## Overview

Today's communication stacks were not designed for a post-quantum world. Messengers centralize
trust in a single provider, classic email was never confidential by design, and most platforms
keep a readable copy of everything they transport.

**GaiaCom redefines secure communication as sovereign infrastructure.**

It combines a federated network, client-side end-to-end encryption, a versioned hybrid
post-quantum envelope, encrypted social channels, encrypted file storage and a governance layer
for node operators — in one identity, on web, desktop and mobile.

The core rule is deliberately small:

```text
The server may route, store, rate-limit, audit and enforce policy.
The server must never receive the capability to decrypt native private content.
```

GaiaCom is **not** a claim of absolute security. It is an attempt to make the trust boundaries
explicit, testable and — where possible — mathematically enforced.

---

<a id="vgt-licence"></a>
## VGT Licence

GaiaCom is available in 3 editions:

**One protocol. Three operating models.**

### Business — GaiaCom Enterprise

For corporations, law firms, medium enterprises, industry, and private banking. Closed communication circles with administrative control, compliance, and support.

- Internal sovereignty and user administration
- Self-hosted node or managed sovereign cluster
- SLA, support, and premium modules

### Public — GaiaCom Network

The open network for digital privacy. No platform for data commerce, but infrastructure for free and encrypted communication.

- Open source client
- Federated nodes
- No central decryption keys

### Government — GaiaCom Defend

Specialized high-security infrastructure for authorities, critical infrastructure, and isolated communication silos.

- Air-gapped and isolated deployments
- White labeling and source code audit
- National digital sovereignty

> **Current test edition & commercial licensing requirement (Dual-Licensing)**
>
> The edition currently being tested in this repository is the public **GaiaCom Network** build (Beta V3) under the **AGPL-3.0-or-later** open-source license (see [LICENSE](LICENSE)). Any network operation or modification of `GaiaCom Network` under the open-source license is strictly subject to AGPL copyleft and source-code disclosure obligations (and grants no trademark rights, SLA, or Enterprise/Defend modules).
>
> **For companies and government authorities, the system is not free of charge.** Organizations intending to use GaiaCom commercially (**GaiaCom Enterprise**) or in public authorities and critical infrastructure (**GaiaCom Defend**) — including closed or production deployments without AGPL source-disclosure obligations, Enterprise/Defend modules, managed sovereign clusters, white labeling, source code audits, or SLA/support — require a commercial **VGT Licence** and must contact VisionGaiaTechnology, ideally via the encrypted inquiry form:
> **[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink)**

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 is a public technical beta. Treat it accordingly.**

- **Status:** Beta V3, version `3.0.2`.
- **No independent cryptographic audit has been completed.** The post-quantum design,
  the protocol implementations and the cryptographic boundaries have **not** been reviewed
  by an independent third-party cryptography lab.
- We have performed **deep, AI-assisted security audits** across architecture, authentication,
  authorization, federation, storage, browser and desktop boundaries. Those audits found and
  fixed real issues. They are **not proof of security**.
- **Unknown vulnerabilities may still exist** — in the protocol design, the implementation,
  the dependencies, the operating environment or the user's own device.
- Cryptography is easy to get subtly wrong. Broken assumptions are not always visible in tests.
  Do not treat algorithm names as a security guarantee.
- **Do not use GaiaCom for life-critical, legally regulated, high-value or irreversible
  communication** in this beta. Keep independent backups of important seeds and data.
- Breaking protocol and API changes may occur between beta releases. Data loss is possible.
- A web client can be replaced by a compromised node before encryption happens. The
  high-assurance profile therefore requires trusted, independently built native clients.
- SMTP bridging is a deliberate downgrade boundary. Messages that leave the native GaiaCom
  security space are protected only as far as the legacy path allows.

If you find a security issue, please report it privately — see
[SECURITY.md](SECURITY.md). Please do not publish active exploit details.

---

<a id="screenshots"></a>
## Screenshots

All screenshots are from GaiaCom 3.0.2 at 2560 × 1440. The UI shown is the current VGT Aurora
design; the screenshots contain only public product surfaces and public federation content.

| Landing page | Identity and access |
|---|---|
| ![Landing page](docs/screenshots/landing.png) | ![Auth dialog](docs/screenshots/auth.png) |
| **Public Channels — discovery** | **Public Channels — channel view** |
| ![Channels discovery](docs/screenshots/channels-discovery.png) | ![Channel view](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Features

### Identity and access

- **Self-managed Gaia ID identity** — `@name:node.example.org`, derived from a locally generated
  seed. Private keys stay on the device.
- **Local key vault** with explicit unlock, session lock and configurable auto-lock.
- **Multi-device pairing** via QR/one-time pairing flows, plus device listing and revocation.
- **Key history and change warnings** when a contact's identity key changes.
- **Recovery flows** with an explicit, written-down recovery seed; no server-side recovery
  backdoor exists.
- **18 UI languages** with a live language switcher (landing, authentication, workspace).

### Messaging

- **Quantum Chat** — 1:1 conversations with client-side encryption, replies, reactions,
  pins, search, attachments, voice notes and encrypted image previews.
- **Group Chats** — rooms with channels, roles, moderation, member management, slow mode,
  read-only channels, join requests, invitations, audit events and encrypted export.
- **Reactions** — heart-first reaction control: hover on desktop or long-press on touch to open
  the full palette; exactly one reaction is shown as your own.
- **No fake states** — message, reaction, presence and activity values come from the real
  backend or are shown as unavailable. GaiaCom does not invent counters.

### GaiaMail

- Mail inside the same cryptographic identity as chat.
- Native GaiaMail between GaiaCom identities.
- **SMTP bridge** for legacy contacts — clearly separated from native E2EE and protected only
  to the extent the legacy path allows.
- Signatures, folders, filters and labels handled locally.

### GSN Social

GaiaCom's social layer is not a separate platform with a separate account. It reuses your
sovereign identity:

- **Home feed**, **Discover**, **My Network**, **Messages**, **Notifications**, **Groups**,
  **Channels** and **GSN Cloud** (GaiaDrive integration).
- Posts, encrypted images, comments, reactions, reposts and hashtag trends computed from real
  posts.
- Followers, follows and recommended contacts derived from actual federation interactions.
- **Public Channels** for broadcast-style communication with subscriptions, discovery,
  categories, media, comments and moderation.

### Files, vault and security center

- **GaiaDrive** — encrypted file storage and sharing tied to the same identity.
- **GaiaDrop** — receive encrypted files from external senders without an account.
- **GaiaVault** — local sealed storage for secrets and keys.
- **Security Center** — real device, session, key and security-event state, plus
  governance and abuse workflows.

### Governance and operations

- Node operator, senior reviewer and trusted reviewer roles.
- Fail-closed governance bootstrap: a fresh node grants **no** operator role by default.
- Abuse reporting, moderation, transparency surfaces and append-only audit events.
- Federation over signed server-to-server PDUs with replay protection and SSRF limits.

### Desktop and mobile

- **Web/PWA** client with a hardened CSP and no CDN-delivered code.
- **Tauri 2 desktop client** for Windows, Linux and macOS with native window controls and no
  native command permissions beyond an explicit allowlist.
- **Android** node/client architecture with a native crypto core and platform bindings.

---

<a id="technical-information"></a>
## Technical information

### Stack

| Layer | Technology |
|---|---|
| Web client | React 18, Vite 8, plain CSS design layers |
| Desktop | Tauri 2 (Rust + WebView2/WebKit), custom frameless window |
| Backend | Go 1.25 (`toolchain go1.26.5`), standard library + SQLite, federation and governance services |
| Database | SQLite in WAL mode (single-writer beta profile), versioned migrations |
| Crypto core | Rust (`gaiacore`), WebAssembly provider for browser HQC, native Tauri provider |
| Mobile | Android app + Go mobile bindings / node kernel architecture |
| Localization | 18 languages, shared translation tables |

### Cryptographic design (Sovereign v1)

```text
Key establishment:  X25519  +  ML-KEM-1024  +  HQC-256
Combiner:           length-prefixed secrets → HKDF-SHA3-512
Accelerated AEAD:   Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:    Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                    → XChaCha20-Poly1305 → AES-256-GCM-SIV
Signatures:         Ed25519 transcript signature
Top Secret sigs:    Ed25519 + ML-DSA-87
```

The signed transcript binds the protocol version, exact algorithm suite, sender and recipient
identities, recipient encryption key, ephemeral key, both KEM ciphertexts, message ID, timestamp,
nonce and encrypted payload. Unknown suites, missing keyset proofs, missing Top Secret
signatures and malformed HQC ciphertexts are rejected fail-closed.

**Important boundary:** Sovereign v1 is a hybrid per-message envelope, **not a Triple Ratchet**.
It does not advertise ratchet-derived post-compromise security. The exact boundary is documented
in [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

### Network model

- Federated nodes, no mandatory central server.
- Signed server-to-server PDUs for federation.
- Server stores routing envelopes, encrypted payloads/chunks, public profile fields and minimal
  metadata — never native plaintext.
- Local or S3/MinIO-compatible encrypted object storage.
- TLS is mandatory outside local development.

### Requirements

| Tool | Version |
|---|---|
| Node.js | 24.13 (minimum 20.19) |
| npm | lockfile-based install (`npm ci`) |
| Go | 1.26.5 toolchain (module targets 1.25) |
| Rust | stable (pinned by CI for the core) |
| Tauri CLI | 2.x for desktop packaging |
| Python | 3.10+ (optional repository/security scripts) |

---

<a id="what-makes-gaiacom-different"></a>
## What makes GaiaCom different

Most "secure" messengers improve one layer. GaiaCom tries to make the whole stack coherent:

- **Sovereign identity instead of platform accounts.** Your identity is a cryptographic
  identity, not a row in someone else's user table. Nodes federate; they do not own you.
- **Dual post-quantum key establishment per message.** One classical and two independent
  post-quantum KEMs are combined, with downgrade rejection when the Sovereign profile is
  selected.
- **Encryption before transport, by construction.** The client seals content before it reaches
  the network; the server routes ciphertext and cannot read it.
- **Social, mail, files and chat under one identity.** No second account, no second trust model,
  no separate platform to leak your graph.
- **Federated by design.** No mandatory central mailbox, no single point of trust, no global
  reading key.
- **Honest UI states.** Missing data is shown as missing, not replaced by decorative numbers or
  invented activity.
- **Explicit downgrade boundaries.** SMTP, legacy envelopes and browser delivery are documented
  as boundaries, not hidden behind marketing language.
- **Open source, AGPL-3.0-or-later.** The network software stays inspectable and contributions
  stay available to the community.
- **Built for operators.** Fail-closed governance, audit events, abuse workflows and a documented
  node-operator path.

---

<a id="build-from-source"></a>
## Build from source

### 1. Prerequisites

Install Node.js 24.13+, Go 1.26.5+, Rust stable and — for desktop builds — the
[Tauri 2 prerequisites](https://tauri.app/start/prerequisites/) for your operating system.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Web client

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

The production bundle is written to `Frontend/frontend/dist/`.

For local development:

```bash
npm start
# http://127.0.0.1:5173
```

Set `VITE_API_URL` only to the origin of a running GaiaCom backend, for example:

```bash
VITE_API_URL=http://127.0.0.1:8080 npm start
```

### 3. Backend

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom
```

Run a local development node:

```bash
cp .env.example .env
# generate independent secrets for development only
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

The API listens on `SERVER_PORT` (default `8080`). The SQLite database is created at `DB_PATH`.
Never use the template secrets in production.

### 4. Desktop client (Tauri 2)

Build the web client first, then:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

The installers/executables are written below `DesktopClient/src-tauri/target/release/bundle/`.
For a quick unsigned build without installers:

```bash
cargo tauri build --no-bundle
```

### 5. Rust cryptographic core

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (optional)

Android builds require JDK 17, the Android SDK/NDK and the pinned toolchain. See
`Android/` and `docs/` for the current build profile. The Android client is part of the beta
source tree, not a finished store release.

---

<a id="become-a-node-operator"></a>
## Become a node operator

A GaiaCom node is the federated backend that serves identities, messages, channels, social
surfaces and storage for its users. It can run on a normal Linux server.

### Recommended baseline

- Linux x86_64 or arm64, 64-bit
- 2+ vCPU, 4 GB RAM, 20+ GB SSD for an evaluation node (size for your real load)
- A dedicated DNS name, e.g. `node.example.org`
- A valid TLS certificate (Let's Encrypt works)
- An SMTP relay **only if** you intentionally enable the legacy bridge
- Backups you actually test

### 1. Build and install

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom

sudo install -d -o gaiacom -g gaiacom /opt/gaiacom /var/lib/gaiacom /etc/gaiacom
sudo install -o gaiacom -g gaiacom -m 0755 gaiacom-backend /opt/gaiacom/gaiacom-backend
```

Release binaries refuse to start without immutable build metadata; do not strip those `-X`
values.

### 2. Initialize the node

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` generates independent production secrets, the node signing identity and the
configuration file. Keep `/etc/gaiacom/gaiacom.env` at mode `0600`, owned by the service user.

Key settings:

| Variable | Purpose |
|---|---|
| `GAIACOM_SERVER_NAME` | Canonical FQDN of this node; used in Gaia IDs and federation |
| `GAIACOM_DEV_MODE=false` | Production mode, strict SSRF and CSP behavior |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Independent 32+ byte secrets |
| `GAIACOM_SERVER_PRIVATE_KEY` | Stable Ed25519 node signing key — never rotate implicitly |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Stable TrustMesh epoch derivation secret |
| `DB_PATH` | Persistent SQLite database path |
| `GAIACOM_STORAGE_ROOT` | Encrypted attachment storage outside the web root |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Only if a reverse proxy supplies client IPs |

### 3. Governance bootstrap (required, fail-closed)

A fresh node deliberately grants **no** operator role. Create the first identity through the
client, then authorize that exact, fully qualified Gaia ID as node operator:

```bash
sudo install -o root -g gaiacom -m 0600 /dev/null /etc/gaiacom/governance.json
```

```json
{
  "bootstrap_gaia_id": "@operator:node.example.org",
  "operators": [
    { "gaiaID": "@operator:node.example.org" },
    { "gaiaID": "@backup-operator:node.example.org" }
  ]
}
```

Point the backend at it and restart:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Use only fully qualified Gaia IDs (`@name:node.example.org`). There is no default administrator
and no god-mode fallback.

### 4. Systemd unit

```ini
[Unit]
Description=GaiaCom Node
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
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
ProtectControlGroups=true
ProtectClock=true
ProtectHostname=true
ProtectProc=invisible
ProcSubset=pid
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true
MemoryDenyWriteExecute=true
SystemCallArchitectures=native
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
StateDirectory=gaiacom
StateDirectoryMode=0700
ConfigurationDirectory=gaiacom
ConfigurationDirectoryMode=0700
ReadWritePaths=/var/lib/gaiacom /opt/gaiacom/storage
UMask=0077
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gaiacom
sudo systemctl status gaiacom
```

### 5. TLS reverse proxy and web client

Serve the built `Frontend/frontend/dist/` behind a TLS reverse proxy and forward the API to the
backend on `127.0.0.1:8080`. Minimum requirements:

- TLS 1.2+ (TLS 1.3 preferred), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- A strict Content-Security-Policy
- No directory listing, no source maps in production
- Only reverse proxies listed in `GAIACOM_TRUSTED_PROXY_CIDRS` may supply forwarded client IPs

An example configuration is intentionally **not** shipped with real hostnames or certificates;
use your own domain and certificate paths.

### 6. Federation and operation

- Announce/publish your canonical `GAIACOM_SERVER_NAME`; peers address you over HTTPS.
- Federation uses signed server-to-server PDUs with replay guards and SSRF protection.
- Monitor the service, disk usage, backup integrity and certificate expiry.
- Test restores of the SQLite database and object storage regularly.
- Keep the node signing key stable across updates; rotating it breaks federation trust.
- Do not run multiple backend processes against one SQLite file. Horizontal database scaling
  (Postgres, active/active replicas) is not part of this beta profile.

### Node operator warnings

- Beta software; no HA claim; maintenance windows and restarts are required.
- Governed content and abuse workflows are policy-scoped per node in this beta.
- Desktop automatic updates are disabled until a signed updater exists.
- SMTP relay requires authenticated TLS plus SPF, DKIM and an enforcing DMARC policy. Messages
  leaving native GaiaCom are not covered by native E2EE guarantees.
- You are responsible for backups, secrets, TLS, DNS, abuse handling and local law.

---

<a id="security-and-audit-status"></a>
## Security and audit status

### What has been done

- Deep, AI-assisted security reviews across backend, frontend, federation, storage,
  authentication, authorization, desktop and browser boundaries.
- Static security gates, adversarial test suites, dependency and secret hygiene checks.
- Explicit security invariants: no server-side plaintext, no private-key export, no
  impersonation endpoint, no E2EE bypass, no global reading key.
- Fail-closed defaults for governance, secret validation and protocol negotiation.
- Real live verification of the product surfaces and UI flows during development.

### What has **not** been done

- **No independent third-party cryptographic audit.**
- No formal verification of the protocol or the implementations.
- No guarantee that unknown vulnerabilities do not exist.
- No government-grade or high-assurance certification.
- Runtime behavior depends on the node, the browser, the operating system and the user's own
  device security.

### Reporting

Please report vulnerabilities privately:

- Email: **security@gaiacom.de**
- Do not open a public issue for an active vulnerability.
- Include affected component, version/commit, reproduction steps and expected/observed behavior.
- Please do not test against other people's nodes or data, and do not run destructive attacks.

See [SECURITY.md](SECURITY.md) for the full policy and [docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md)
for the current beta boundaries.

### High-assurance usage

If you need a system that protects life, liberty or regulated data, this beta is **not** that
system yet. Independent audits, reproducible builds, signed releases, verified update chains,
operational key management and incident response are still required.

---

<a id="project-structure"></a>
## Project structure

```text
GaiaCom/
├── Backend/                  Go API, federation, governance, storage, security
├── Frontend/frontend/        React web client and PWA
├── DesktopClient/src-tauri/  Tauri 2 desktop shell
├── Android/                  Android node/client architecture
├── Core/rust/gaiacore/       Rust cryptographic core
├── SovereignCryptoCore/      Rust crypto library
├── SovereignCryptoWasm/      Browser WASM crypto provider
├── docs/                     Architecture, node operation, beta boundaries, screenshots
├── assets/brand/             GaiaCom logo and brand assets
├── SECURITY.md               Security policy and disclosure
├── SOVEREIGN_CRYPTO.md       Cryptographic design and boundaries
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Contributing

Contributions are welcome if they preserve the security invariants and keep claims honest.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) first.
- Keep the zero-trust boundary: no server-side plaintext, no private-key export, no E2EE bypass.
- Add tests for security-relevant behavior.
- Never commit secrets, real user data, private keys, databases or build artifacts.
- Do not weaken security gates to make a build pass.
- Report vulnerabilities privately, not in pull requests.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

---

<a id="license"></a>
## License

GaiaCom follows a **dual-licensing model** (see [VGT Licence](#vgt-licence)): the public
`GaiaCom Network` open-source codebase is licensed under the **GNU Affero General Public
License v3.0 or later** (AGPL-3.0-or-later) — see [LICENSE](LICENSE). For commercial
company deployments (**GaiaCom Enterprise**), government authorities (**GaiaCom Defend**),
or closed-source deployments without AGPL source-disclosure obligations (including premium
modules, SLA/support, white labeling, and air-gapped environments), the system is **not free
of charge** and requires a commercial **VGT Licence** via
[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink).

Network operators who run modified GaiaCom open-source software under the AGPL must make the
corresponding source available as required by the AGPL. Third-party components and their
licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and in the
respective package manifests.

GaiaCom and the GaiaCom logo are trademarks of VisionGaiaTechnology. The AGPL license does
not grant trademark rights.

---

<div align="center">

**VisionGaiaTechnology — Department of Unnecessary Security™**

*Sovereign communication, built in the open.*

[Website](https://gaiacom.de) · [Security](SECURITY.md) · [Architecture](docs/ARCHITECTURE.md)

</div>
