# GaiaCom V1 Risk Register

Date: 2026-07-16  
Scope: GaiaCom Core single-node beta after implementation wave 1

## V1 release blockers

| ID | Severity | Area | Risk | Required closure evidence |
| --- | --- | --- | --- | --- |
| V1-001 | High | Cryptography/protocol | Internal regression suites do not constitute independent review of the protocol, key lifecycle, recovery, and client implementations. | Independent cryptographic audit, remediation, and retest. |
| V1-002 | High | Release supply chain | CI now gates source, but public artifacts, desktop updates, SBOM, provenance, and transparency publication are not yet signed end to end. | Offline-controlled signing key, verified updater, SBOM/provenance, clean-build artifact verification. |
| V1-003 | High | Upgrade/recovery | Versioned migrations and consistent pre-migration SQLite snapshots exist, but a coordinated encrypted DB/object-store restore and rollback from real prior releases is not yet demonstrated. | N-2/N-1 upgrade fixtures, encrypted coordinated backup, destructive restore drill, measured RPO/RTO. |
| V1-004 | High | Client trust | A compromised web origin can deliver modified JavaScript before E2EE executes. | Signed reproducible desktop/mobile client for the high-assurance profile plus explicit web-client trust documentation. |
| V1-005 | High | Operational assurance | Automated tests exist, but sustained staging soak, load/chaos tests, alerting drills, and incident-response exercises are incomplete. | Recorded soak/load/chaos results and completed compromise/restore tabletop. |

## Accepted Core beta risks

| ID | Severity | Area | Risk | Boundary |
| --- | --- | --- | --- | --- |
| R-001 | Medium | SQLite profile | One process/database is supported; active/active replicas and Postgres HA are not. | Core single-node only; Enterprise must implement and test a real HA dialect. |
| R-002 | Medium | Metadata privacy | E2EE protects native content, not all routing, timing, relationship, moderation, or abuse metadata. | Minimize retention and claims; document operator visibility. |
| R-003 | Medium | Federation governance | A coalition of malicious nodes may manipulate reputation or policy signals. | Local authorization remains authoritative; add Sybil/collusion analysis before wider federation. |
| R-004 | Medium | SMTP | SMTP is not native GaiaCom E2EE and exposes content to mail infrastructure. | Explicit downgrade UI, authenticated TLS, no silent fallback, no native trust badge. |
| R-005 | Medium | Accessibility/performance | Automated UI tests do not prove WCAG 2.2 AA or low-end device behavior. | Device-lab, keyboard, screen-reader, memory, CPU/GPU, and long-feed evidence before V1. |

## Closed in implementation wave 1

| ID | Area | Closure evidence |
| --- | --- | --- |
| C-001 | Rate-limit migration failure | `schema_migrations` ledger, checksum enforcement, serializable migrations, explicit legacy table reconstruction, and upgrade tests. |
| C-002 | Pre-migration safety | Consistent SQLite `VACUUM INTO` snapshot with non-symlink checks, generated destination, mode `0600`, and non-empty verification. |
| C-003 | Production bootstrap | `setup` generates independent secrets once; `doctor` validates syntax, strength, identity, storage directory, and permissions without printing secrets. |
| C-004 | Runtime configuration | Production startup reports all missing/invalid mandatory values before database initialization. |
| C-005 | Repository contamination | Release bundles, binaries, databases, caches, build outputs, dependency trees, and workstation inputs are excluded from the source baseline. |
| C-006 | Continuous verification | GitHub workflow gates Go vet/tests/race/vulnerability scan, frontend audit/tests/build, Rust tests, and the integrated adversarial suite. |
| C-007 | Static scanner scope | Extreme scanning is restricted to authoritative source roots and credential-shaped literals/real DOM assignment sinks; stale release bundles no longer create false security findings. |

## Current decision

Wave 1 is admissible for continued beta operation. GaiaCom Core V1 remains
blocked until V1-001 through V1-005 have objective closure evidence.
