# GaiaCom - Federated E2EE Communication Core

GaiaCom is a beta-stage federated communication platform with client-side
encryption, hybrid post-quantum-oriented cryptography, GaiaShield security
events, GaiaDrive/GaiaDrop storage flows, GSN social feeds, governance review,
and reproducible release gates.

GaiaCom is not a promise of absolute security, guaranteed anonymity, or a final
Enterprise product. This repository is the Community Core beta intended for
review, testing, and operated beta nodes.

## What GaiaCom Is

- A federated communication Core with native client-side encryption.
- A browser/client-first cryptographic architecture where private plaintext and
  private keys stay on user-controlled devices for native GaiaCom content.
- A Go backend for auth, routing, federation, storage ACLs, governance,
  GaiaShield, and persistence.
- A React frontend for chat, GSN, GaiaDrive, Gaia Passport, Trust Passport, and
  local unlock/session UX.
- A security-gated codebase with adversarial crypto checks, active API PoCs,
  storage ACL tests, federation SSRF tests, and final release reports.

## What GaiaCom Is Not

- Not a guarantee of anonymity.
- Not a claim of perfect or absolute security.
- Not a finished Enterprise/Defense edition.
- Not a server-side plaintext archive for native private messages.
- Not an SMTP security wrapper. SMTP remains a legacy/downgrade channel.

## Core Features

- Native client-side encrypted messaging.
- Top Secret mode with Ed25519 plus ML-DSA-87 capability enforcement.
- Hybrid X25519 plus ML-KEM-1024 encryption harness.
- Gaia Passport and Trust Passport public identity views.
- Human Proof with signed local proof and server-side verification.
- GaiaDrive and GaiaDrop encrypted storage workflows.
- GSN social feed with backend reactions/comments and abuse controls.
- Governance/Meldecenter review and transparency flows.
- GaiaShield structured, redacted, append-only audit events.
- Federation with signed PDUs, replay protection, and SSRF defenses.
- SMTP bridge clearly marked as legacy/downgrade.

## Documentation

- [Architecture](docs/architecture.md)
- [Threat Model](docs/threat-model.md)
- [Protocol Overview](docs/protocol.md)
- [Protocol v0.1](docs/protocol-v0.1.md)
- [Federation](docs/federation.md)
- [Governance](docs/governance.md)
- [GaiaShield](docs/gaiashield.md)
- [Storage](docs/storage.md)
- [Security Invariants](docs/security-invariants.md)
- [Beta Known Limitations](docs/beta-known-limitations.md)
- [Deployment Guide](docs/deployment-guide.md)
- [Responsible Disclosure](docs/responsible-disclosure.md)

## Local Build

Backend:

```bash
cd Backend
go mod verify
go test ./...
go build ./...
```

Frontend:

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
npm run test:hqc-browser
node src/adversarial_run.mjs
```

`test:hqc-browser` builds the locked HQC/WASM worker and executes HQC-256 key
generation, encapsulation/decapsulation, and both Sovereign cipher profiles in
headless Chrome. Set `CHROME_BIN` when Chrome is not installed in a standard
location.

Native Sovereign bridge:

```bash
cd DesktopClient/src-tauri
cargo test --locked
```

Security gates:

```bash
python security/total_system_poc_runner.py
python security/extreme/extreme_runner.py
python security/master_security_suite.py
```

Linux release builds:

```bash
cd Backend
GOOS=linux GOARCH=amd64 go build -o gaiacom-backend-linux-amd64 ./cmd/gaiacom
GOOS=linux GOARCH=arm64 go build -o gaiacom-backend-linux-arm64 ./cmd/gaiacom
```

## Required Runtime Secrets

Do not create production secrets by hand. The idempotent setup command generates
independent credentials, preserves existing keys during updates, and writes a
mode-`0600` systemd environment file without printing secret values:

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db
sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

Production startup validates all required values together before opening the
database. Do not commit the generated environment file.

- `GAIACOM_SHIELD_SECRET`
- `GAIACOM_JWT_SECRET` or `JWT_SECRET`
- `GAIACOM_METRICS_TOKEN`
- `GAIACOM_SERVER_NAME`
- `GAIACOM_SERVER_PRIVATE_KEY`
- `GAIACOM_TRUSTMESH_EPOCH_SECRET`
- `DB_PATH`
- `GAIACOM_STORAGE_ROOT`
- Optional SMTP and S3/MinIO variables documented in
  [Deployment Guide](docs/deployment-guide.md).

## Security Claims

Allowed project claims:

- Client-side encrypted for native GaiaCom content.
- Server-side non-decryptable for native private content by design.
- Hybrid post-quantum-oriented cryptographic design.
- No-Godmode Core architecture.
- Continuously tested security gates.

Forbidden claims:

- Unbreakable.
- 100% secure.
- Guaranteed anonymous.
- Guaranteed quantum-secure.
- Perfectly secure.

## License and Trademark

The code is licensed under the MIT License. GaiaCom, GaiaShield, Gaia Passport,
Trust Passport, and related logos/names are project trademarks of
VisionGaiaTechnology. The license grants code rights, not trademark rights or
permission to imply endorsement.
