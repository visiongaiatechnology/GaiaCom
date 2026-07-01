# GaiaCom Beta Known Limitations - Core Beta

This document lists release-scoped limitations for the GaiaCom Core beta. These
items must be visible to users, operators, and security reviewers before a
public GitHub release.

## 1. Scope

The beta release covers GaiaCom Core only. Enterprise/Defense editions, SSO,
multi-tenant administration, HA deployment, and external signed policy bundles
are not part of this release.

## 2. Security Boundaries

GaiaCom uses client-side encryption for native content, but does not claim
absolute security or guaranteed anonymity. Users remain responsible for device
security, local unlock material, and recovery hygiene.

## 3. Federation

Open federation with arbitrary unknown domains should be treated as scoped for
early beta operations. Operators should use controlled allowlists until abuse
controls, monitoring, and operational policies mature further.

## 4. Replay Cache

The S2S replay cache is local to a node process. Strict timestamp skew and PDU
deduplication are active, but a persistent clusterwide replay store is not part
of this beta profile.

## 5. GaiaDrive Sync and Recovery

GaiaDrive and encrypted storage flows are active, including ACL and object-store
tests. The final multi-device encrypted cloud-index, key-share, and recovery
ceremony is still a known beta limitation.

## 6. Storage Operations

Encrypted chunks, S3/MinIO adapter support, upload cleanup, quotas, and stale
pending cleanup are covered by tests. Operators still need to test backup,
restore, object-store lifecycle rules, and disk monitoring for their own node.

## 7. Governance and Abuse Consensus

Governance credentials, review queues, and threshold checks are active for Core
beta. Global cross-node abuse consensus is not final; enforcement is primarily
node-local unless an operator explicitly federates policy data.

## 8. SMTP Legacy Boundary

SMTP is a legacy/downgrade bridge. SMTP messages are not native GaiaCom E2EE,
must not receive native trust badges, and cannot provide the same confidentiality
properties as native GaiaCom messages.

## 9. Database and Scale

SQLite with WAL mode, connection pool limits, busy retry, and parallel write
tests is the Core beta database profile. Postgres, external job queues, and
large HA profiles remain future production-hardening work.

## 10. UI and Accessibility

The beta includes mobile and desktop layouts, custom GaiaCom modals, and
dark/light theme work. Operators should still treat broad accessibility testing,
large-feed performance tuning, and low-end mobile GPU tuning as active beta
quality work.
