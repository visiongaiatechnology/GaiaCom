# GaiaCom Beta V3 — Limitations and Boundaries

GaiaCom 3 is a public technical beta. This document lists the boundaries that matter for
operators and users. It is an honest status note, not a list of deferred features.

## Security status

- **No independent third-party cryptographic audit has been completed.**
- Deep security reviews were performed with AI assistance across backend, frontend,
  authentication, authorization, federation, storage, browser and desktop boundaries. These
  reviews found and fixed issues, but they are **not proof that no vulnerabilities remain**.
- No formal verification, no certification and no guarantee of security.
- Cryptographic implementations and protocol designs can fail subtly. Do not treat algorithm
  names as a guarantee.

## Supported beta profile

- One backend process per SQLite database, WAL mode, bounded connections and migrations.
- Local encrypted object storage or an S3/MinIO-compatible object store.
- Controlled federation with signed transport envelopes and signed PDUs.
- Web/PWA delivery through a hardened TLS reverse proxy.
- Tauri desktop builds distributed manually; no automatic desktop updates.

## Explicit boundaries

1. **No horizontal database scaling.** The current backend rejects non-SQLite drivers.
   Active/active replicas against one SQLite file are not supported.
2. **No high-availability or zero-downtime claim.** Restarts and maintenance windows are
   required. There is no failover cluster profile in this beta.
3. **No signed automatic desktop updates.** Update signing and an authenticated update endpoint
   are not provisioned. Verify release artifacts out-of-band.
4. **Migration snapshots are not a complete backup system.** Database and object-store backups
   must be coordinated, encrypted, restored in a staging environment and tested.
5. **SQLite is a single-writer profile.** Size the node for its workload and do not run multiple
   backend processes against the same database file.
6. **SMTP is a downgrade boundary.** Legacy mail leaves native GaiaCom E2EE. Production relay
   requires authenticated TLS plus SPF, DKIM and an enforcing DMARC policy.
7. **Cross-node governance is policy-scoped.** Global policy convergence and conflict resolution
   are not guaranteed in this beta.
8. **Client recovery needs operational rehearsal.** Multi-device recovery, device loss,
   revocation and encrypted export/import must be tested with real release clients.
9. **Accessibility and low-end performance remain release gates.** Full WCAG 2.2 AA
   keyboard/screen-reader evidence and representative device profiling are still required.
10. **Web delivery trusts the active origin.** A compromised node can serve modified JavaScript
    before encryption happens. High-assurance use requires trusted, independently built native
    clients.
11. **Localization is incomplete in deeper views.** The landing page, authentication, shell,
    dashboard and Public Channels are translated into 18 languages; some detailed views and
    individual strings may still appear in German or fall back to English.
12. **Data loss is possible.** Breaking changes, migrations and beta behavior can lead to data
    loss. Keep independent backups of important seeds and data.

## Not suitable for

- Life-critical or safety-critical communication
- Regulated, legally privileged or high-value data without an independent risk assessment
- High-availability or zero-downtime production services
- Anonymous communication claims: GaiaCom makes no anonymity guarantee

## Suitable for

- Evaluation, research, self-hosting experiments and controlled community nodes
- Teams that understand the beta boundaries and can operate and back up their node
- Security review, protocol discussion and open-source collaboration
