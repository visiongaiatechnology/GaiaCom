# GaiaCom Threat Model v0.2

Date: 2026-07-16  
Scope: GaiaCom Core single-node beta and its federation boundary

This model defines what GaiaCom protects, which components must be trusted, and
which residual risks remain. Changes to cryptography, identity, federation,
storage, updates, recovery, or deployment require a threat-model review.

## Security objectives

- Native private content is encrypted and authenticated on the client.
- The backend must not receive native message plaintext or client private keys.
- Every protected operation is bound to the authenticated user and identity.
- A hostile federation node cannot cross local authorization or network boundaries.
- Compromise of one control must not silently defeat every other control.
- Updates, schema changes, and recovery must fail closed without losing identity keys.

## High-value assets

- BIP-39 mnemonic, derived Ed25519/X25519/ML-KEM keys, device keys, and vault keys.
- Decrypted messages, mail, attachments, recovery exports, and local unlock material.
- Server Ed25519 identity, TrustMesh epoch secret, JWT secret, GaiaShield key, and
  metrics credential.
- Account, device, relationship, routing, timing, moderation, and federation metadata.
- SQLite state, encrypted object chunks, audit-chain state, and backup copies.
- Release signing keys, source commits, build provenance, and update manifests.

## Adversaries

- Unauthenticated internet attacker and credential-stuffing botnet.
- Authenticated malicious user attempting BOLA, BFLA, spam, or resource exhaustion.
- Malicious or compromised federation node performing replay, spoofing, SSRF,
  equivocation, Sybil, or queue-exhaustion attacks.
- Compromised GaiaCom server, reverse proxy, object store, operator account, or CI runner.
- Malicious dependency or modified release artifact.
- Compromised user endpoint capable of reading screen, memory, or keystrokes.

## Trust boundaries

| Boundary | Trusted for | Not trusted for |
| --- | --- | --- |
| Browser/PWA | Executing the currently delivered client and holding plaintext in memory | Surviving a malicious origin server that delivers modified JavaScript |
| Signed native client | Local cryptography after signature/update verification | Surviving a compromised host OS or stolen unlocked device |
| Go backend | Authentication, authorization, routing, rate limits, ciphertext persistence | Native private plaintext or client private-key custody |
| SQLite/object store | Availability and ciphertext durability | Confidentiality without host/disk controls; metadata is still sensitive |
| Federation peer | Correctly signed statements from its own node identity | Authorization decisions, redirects, DNS answers, local network access, or global truth |
| SMTP bridge | Explicit legacy interoperability | Native E2EE, GaiaCom trust proofs, or silent fallback |
| CI/release pipeline | Producing the reviewed commit when all gates pass | Long-lived secrets beyond its narrowly scoped signing operation |

## Threats, controls, and residual risk

| Threat | Primary controls | Residual risk / required evidence |
| --- | --- | --- |
| Envelope spoofing or mutation | Canonical transcript signatures, AEAD AAD binding, suite binding, replay checks | Independent protocol audit and cross-client test vectors remain required. |
| Contact-key substitution | Key-history comparison, blocking warning, explicit fingerprint ceremony | A compromised endpoint can approve or conceal replacement. |
| Account/session takeover | Password hashing, opaque login behavior, persistent rate limits, rotating device sessions | Passkeys and hardware-backed administrator MFA are not yet the default. |
| BOLA/BFLA | Server-derived actor identity, ownership/role checks, adversarial API tests | Every new endpoint must enter the authorization matrix before merge. |
| Federation SSRF/rebinding | Resolution-aware dial control, private-range denial, redirect validation, signed origin binding | DNS, proxy, and resolver changes require repeated live tests. |
| Federation replay/equivocation | Persistent replay guard, timestamp bounds, signed PDUs, append-only evidence | Cross-node policy convergence and Sybil/collusion resistance remain limited. |
| Storage disclosure | Encrypted chunks, object ownership/grants, path jail, quotas, retention cleanup | Metadata and availability remain visible to the storage operator. |
| Database upgrade corruption | Version/checksum ledger, serializable migrations, pre-migration SQLite snapshot, schema verification | Coordinated encrypted backup/restore across DB and object store needs rehearsal. |
| Secret misconfiguration/rotation | Idempotent setup, strict validation, mode-0600 environment file, doctor command | Host root can read or replace server secrets. External secret-manager integration is optional. |
| Browser-origin compromise | CSP, no raw HTML sinks, dependency lockfile, automated source scans | A malicious server can still replace browser code before E2EE runs. High-assurance use requires a signed native client. |
| Supply-chain compromise | Lockfiles, module verification, CI gates, vulnerability audits, clean builds | Signed artifacts, SBOM, provenance, and transparency publication remain V1 gates. |
| Resource exhaustion | Body/chunk limits, bounded caches/queues, rate limits, timeouts, SQLite busy handling | Distributed traffic can still exhaust finite node capacity; load/soak evidence is required. |
| Audit tampering or secret leakage | Redaction, append-only triggers, signed hash chain, scoped views | Root-level compromise can suppress future events; remote log anchoring is not yet implemented. |
| Endpoint compromise | Local encrypted vault and short-lived plaintext handling | Keylogging, screen capture, memory scraping, and malicious accessibility services are outside Core protection. |

## Explicit non-goals and limitations

- GaiaCom does not provide anonymity; routing and timing metadata can identify relationships.
- E2EE does not protect plaintext on an unlocked or compromised endpoint.
- Web delivery is not equivalent to an independently verified signed native client.
- The Core profile is single-process SQLite, not active/active or zero-downtime HA.
- SMTP is always a visible downgrade boundary.
- No security test suite replaces independent cryptographic review, penetration testing,
  incident response, or restore exercises.

## Mandatory review triggers

- Cipher-suite, canonicalization, key-derivation, recovery, or device-pairing changes.
- New public, privileged, storage, federation, governance, or SMTP endpoint.
- New database migration or persistent queue.
- New dependency with install scripts, native code, network access, or cryptographic duties.
- Change to CI, artifact signing, updater, CSP, reverse proxy, systemd, or secret handling.
