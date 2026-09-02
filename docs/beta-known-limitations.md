# GaiaCom 2 — Release Boundaries

This document records the remaining architectural boundaries of the GaiaCom 2
single-node release profile. It is an operator contract, not a list of deferred
security defects.

## Supported production profile

- One backend process per SQLite database, with WAL, bounded connections,
  transactional leases, persistent replay protection, busy retry, and
  versioned/checksummed schema migrations.
- Local encrypted object storage or an S3/MinIO-compatible object store.
- Controlled federation with signed transport envelopes and signed PDUs.
- Web/PWA delivery through a hardened TLS reverse proxy.
- Tauri desktop builds distributed manually through an authenticated release
  channel until the signed updater is provisioned.

## Explicit boundaries

1. **No horizontal database scaling.** The current binary rejects non-SQLite
   drivers. Active/active application replicas against one SQLite file are not
   supported. Postgres support requires a real dialect, migrations, isolation
   tests, and distributed queue validation; changing `DB_DRIVER` is not enough.
2. **No unsigned desktop updates.** Automatic Tauri updates remain disabled
   until an operator-owned signing key and authenticated update endpoint exist.
   Release artifacts must be signed and verified outside the repository.
3. **Migration snapshots are not a complete backup system.** The backend creates
   a consistent mode-`0600` SQLite snapshot before schema upgrades. Database and
   object-store backups must still be coordinated, encrypted, restored in a
   staging environment, and covered by measured recovery objectives.
4. **SMTP is a downgrade boundary.** SMTP messages are not native GaiaCom E2EE
   and never receive native trust claims. Production relay use requires
   authenticated TLS plus verified SPF, DKIM, and enforcing DMARC.
5. **Cross-node governance is policy-scoped.** Local governance enforcement is
   complete for the single-node profile; global policy convergence still
   requires an explicit federation policy and conflict-resolution contract.
6. **Client recovery ceremonies need operational rehearsal.** Multi-device key
   recovery, device loss, revocation, and encrypted export/import must be tested
   with real release clients before public onboarding.
7. **Accessibility and low-end performance remain release gates.** WCAG 2.2 AA
   keyboard/screen-reader testing and representative mobile/desktop profiling
   require device-lab evidence, not only unit tests.
8. **Web delivery trusts the active origin.** A compromised node can replace the
   JavaScript client before encryption occurs. The high-assurance profile
   therefore requires independently signed and reproducibly built native clients.

These boundaries prohibit marketing the current profile as highly available,
anonymous, zero-downtime, or immune to endpoint/server compromise. They do not
weaken the security invariants enforced by the release test suite.
