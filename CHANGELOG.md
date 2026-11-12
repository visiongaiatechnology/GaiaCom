# Changelog

All notable public changes to GaiaCom are documented here. GaiaCom 3 is a public technical
beta; the format and the feature set may change between beta releases.

## 3.0.2 — Beta V3

### Highlights

- New VGT Aurora interface across web, desktop, authentication, settings, GSN and Public
  Channels.
- Public Channels redesign: channel hero, discovery cards, document-style posts, encrypted
  image lightbox, comments and a compact composer.
- Heart-first reaction system with hover/long-press palette, shared by GSN and Channels.
- Authenticated workspace language switcher with 18 languages; expanded landing, auth,
  shell, dashboard and channels translations.
- Real dashboard metrics and activity derived from actual mail, chats, channels and GSN data;
  no decorative or invented values.
- Compact chat composer and visible emoji/attachment anchors.
- Nested-dialog handling: confirmations now open above settings dialogs and only the topmost
  dialog handles Escape/Tab.
- Desktop branding and metadata updated: GaiaCom logo in the native title bar, new icons,
  GaiaCom 3 / 3.0.2 release identity.

### Security

- Security reviews and adversarial checks continued; findings were fixed where identified.
- **No independent cryptographic audit has been completed.**
- Unknown vulnerabilities may still exist. Read [SECURITY.md](SECURITY.md).

### Breaking changes

- Public UI, metadata and desktop release identity use GaiaCom 3 / 3.0.2.
- Protocol and API changes may occur between beta releases. Keep backups of seeds and data.

## 3.0.2 — Beta V3 updates (2026-11-12)

### Highlights

- Identity attestations (verification badges): signed claims issued by the node or
  governance, verified in the client against the node's pinned discovery key and shown
  together with issuer and expiry. Revoked, expired or invalid claims are marked as such
  and never grant privileges; public badge responses no longer expose operator evidence
  references.
- Node-operator transparency: aggregate node metrics, case-bound access and a
  break-glass identity directory. Every directory read requires a written reason and is
  recorded in a public access-transparency log visible to all users in Security Center.
- Redesigned human-verification dialog (Gaia Passport) with a compact layout and clearer
  challenge progress.
- Mail reader uses one flat, full-width surface without nested card frames.

### Security

- Node-operator access is enforced server-side by the `node_operator` role; directory
  responses contain identity metadata only (no keys, e-mail content or message bodies).
- Registration automatically generates a BIP39 seed when switching to account creation,
  always offers seed regeneration, and rejects invalid mnemonic phrases with actionable
  guidance before key derivation.
- Session rotation on reload and visibility changes removes intermittent 401 noise;
  the local vault reopens from the session without re-entering the password.
- **No independent cryptographic audit has been completed.** The beta limitations still
  apply; see [docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md).

### Fixes

- Address-book pane and compose-from-contact navigation fixed; duplicate list pane removed.
- Service-worker fetch failures, `data:` audio URLs under CSP and expired-storage media
  404s now fail gracefully instead of surfacing console errors.

## 3.0.2 — Security Update (2026-11-12)

### Security audit

A defensive, source-first security audit (`MODE=AUDIT_ONLY`, profile `GENERIC`,
`VGT-AUDIT-20261112-0001`) mapped the SonarCloud findings onto the VGT-100 trust boundaries,
reviewed combined chains and remediated the confirmed findings.

Fixed in this update:

- **Go toolchain:** bumped from `go1.26.5` to `go1.26.11`. `govulncheck ./...` reported
  17 reachable Go standard-library vulnerabilities (net/http, net/url, crypto/tls,
  crypto/x509, encoding/asn1, encoding/xml, net/textproto) before the update and
  **0 reachable vulnerabilities** after it.
- **Attestation badges:** client verification now pins the Ed25519 key from the node's
  `/.well-known/gaiacom/server` discovery document instead of trusting the key delivered
  inside the attestation response. Only fields from the signed canonical claim are
  displayed; mismatches between signed claim and display fields mark a badge unverified.
  Badge labels describe the claim honestly (node-attributed, not a global "verified"
  status). The public attestation endpoint redacts `evidence_ref`.
- **Node-operator abuse limits:** break-glass directory reads, badge issuance/revocation
  and issued-list queries are rate-limited per operator identity; the public
  transparency log remains the detection trail.
- **CSP:** web shell now uses `style-src 'self'; style-src-attr 'unsafe-inline'` instead of
  allowing inline `<style>` blocks; `script-src 'self'` was already enforced.
- **Crypto session storage:** auto-unlock is off by default; enabling it shows an explicit
  warning that the seed is kept in the tab's `sessionStorage` for the selected duration.
- **SMTP bridge:** optional per-message HMAC-SHA256 authentication
  (`GAIACOM_SMTP_MESSAGE_SECRET`, `X-Gaia-SMTP-Timestamp`, `X-Gaia-SMTP-Signature`) binds
  ingest messages to the bridge and rejects replayed edited payloads; legacy bridges keep
  the static token + rate limits + untrusted markers.
- **Desktop releases:** added a release workflow and
  [docs/desktop-release.md](docs/desktop-release.md). Unsigned local installers are not
  official downloads; publishing requires code signing/notarization and signed checksums.
- **Security tests:** storage publication and SMTP untrusted-marker regression tests were
  updated to the current contracts.

Verification actually run for this update:

- `govulncheck ./...` → 0 reachable vulnerabilities (Go 1.26.11)
- `go build ./...`, `go vet`, targeted `go test` (attestations, auth, federation, storage,
  smtpbridge) → pass
- `npm audit --omit=dev` → 0 vulnerabilities; frontend build within bundle budget
- `python scripts/security_gate_static.py` → pass (26 pass / 0 fail / 5 not tested)

Residual risks (documented, not silently accepted): there is still no independent
cryptographic audit; desktop installers remain unsigned until release certificates are
provisioned; step-up authentication for operator actions is a follow-up; auto-unlock stores
the seed in sessionStorage when explicitly enabled (warning shown); Android/macOS runtime
behavior is outside this audit.


