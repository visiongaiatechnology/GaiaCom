# Identity Attestations & Node-Operator Transparency (ADR)

Status: **Beta implementation (V3)**, frontend + backend contract defined 2026-11-11.
Scope: `Backend/attestations/**`, `Backend/database/migration_attestations.go`,
`Frontend/frontend/src/components/common/VerificationBadges.jsx`,
`Frontend/frontend/src/components/chat/security/tabs/IdentityAdminTab.jsx`.

## 1. Problem

Two questions drove this design:

1. **Should a node operator see which users are registered on their node?**
   Technically an operator always can (they run the database and see envelope
   metadata). A UI ban would be security theatre. The product decision is what
   becomes a *surface*, and how it is bounded, justified and audited.
2. **Should node operators be able to hand out verification badges**
   (human, organization, roles) that are visible in chats and profiles?

Both are answered with the same principle: **visible, signed, attributable,
revocable claims instead of hidden privileges or local booleans.**

## 2. Operator visibility — three layers

| Layer | Content | Access |
|---|---|---|
| Operational (default) | Aggregate numbers only: accounts, identities, rooms, messages/24h, GaiaDrops/24h, open abuse cases, active attestations, directory reads/24h | operator role, no personal data |
| Case-bound | Identity data inside a concrete abuse/support case (existing governance cases with case IDs and audit chain) | case-scoped, justified |
| Break-glass directory | Paginated list: GaiaID, display name, registration date, status | operator role **plus** mandatory reason (≥ 20 chars); every read is logged and published in the transparency log; time-bound UI, no keys, no message content, no e-mail addresses |

Additional rules:

- **Honesty:** the Privacy/Beta text and the Security Center state that the node
  operator can see metadata, not message content.
- **Transparency for affected users:** break-glass reads are visible to every
  authenticated user of the node through the access log (`GET
  /api/v1/node/operator/access-log`).
- **DSGVO:** purpose limitation (operations vs. abuse handling), data
  minimisation (no keys/content), documented access log, operator named as
  processor/controller in the privacy notice.
- **Exit over illusion:** users can choose/leave a node; attestations are
  portable client-verifiable claims, not node-local flags.

## 3. Attestation model

An attestation is a **signed claim by an issuer about a subject**:

```json
{
  "version": "gaia-attestation-v1",
  "subject": "@name:domain",
  "type": "human | organization | node_operator | moderator | official",
  "issuer": "@operator:node-domain",
  "authority": "node | governance | domain_proof | organization",
  "evidence_ref": "opaque reference (proof hash, DNS record, resolution id)",
  "issued_at": "RFC3339",
  "expires_at": "RFC3339"
}
```

The server signs the canonical JSON with the node Ed25519 key and returns
`canonical`, `signature_hex`, `signing_public_key_hex`, `algorithm`. Clients
verify the signature **over the supplied canonical bytes** (no
re-canonicalisation) and additionally require `status = valid`.

### Issuer competence

| Type | Issuer | Evidence (minimum) |
|---|---|---|
| `human` | node operator | documented in-person/video check reference; no ID copies stored |
| `organization` | node operator / organization | DNS-TXT or `.well-known` proof + legal entity reference |
| `node_operator` | governance | governance resolution / bootstrap config |
| `moderator` | governance | governance resolution / role |
| `official` | governance | governance resolution |

Rules:

- Roles ≠ badges. A role grants permissions; a badge is a claim. A badge never
  grants moderation rights and never bypasses abuse/spam controls.
- Revocation and expiry are mandatory. Revocation is append-only; clients must
  re-check status and see `revoked`.
- No pay-to-play, no central “globally verified” claim.
- Only the evidence reference/hash is stored; no documents or ID data.

## 4. API (backend contract)

All endpoints are authenticated; operator endpoints require role
`node_operator`, enforced server-side.

- `GET /api/v1/identities/:gaiaID/attestations` — attestations for one identity
  (valid/expired/revoked, max 100).
- `POST /api/v1/node/attestations` — issue (`subject`, `type`, `authority`,
  `evidence_ref`, `expires_in_days` 1–3650); duplicate active claim → 409.
- `DELETE /api/v1/node/attestations/:id` — revoke with reason (≥ 4 chars).
- `GET /api/v1/node/attestations` — issued claims, operator view.
- `GET /api/v1/node/operator/stats` — aggregate operational metrics.
- `POST /api/v1/node/identities/directory` — break-glass directory; reason
  mandatory, every call logged.
- `GET /api/v1/node/operator/access-log` — transparency log (all users).

## 5. UI rules

- Badges are always shown with **issuer and expiry** in the accessible name /
  tooltip (`Verifiziert von <issuer>, gültig bis <date>`).
- Only valid + signature-verified claims get the normal badge look; expired,
  revoked or unverifiable claims are muted/danger (or hidden in compact views).
- No naked “blue check”. No badge without a verifiable signature.
- The operator console (Security Center → “Identitäten & Abzeichen”) shows
  aggregate metrics, issuance/revocation, break-glass directory with warning
  and the transparency log.

## 6. Federation & trust

Attestations travel with the profile and are verified by the receiving client
against the issuer's published node key. Trust in an issuer depends on the
user's federation/trust configuration (strict/TOFU). A badge from an unknown
issuer must be rendered as “issuer not in your trust list”, not as truth.

## 7. Privacy

- Human verification inherently reveals something to the issuer. Only the
  claim + evidence reference is stored.
- No ID documents, no raw evidence, no per-user access attribution in the
  public transparency log beyond the operator's GaiaID, reason and result count.
- Mid-term: zero-knowledge personhood proofs as a separate attestation type.

## 8. Open points / next phases

- Client-side issuer trust list UI (strict/TOFU marking per issuer).
- Zero-knowledge human proof type.
- Organization verification wizard with DNS-check automation.
- Notifications to the subject when a badge is issued/revoked, plus appeal flow.
- Docs/README wording for the badge feature and the operator-visibility model.
