# GaiaCom Governance and Meldecenter

The Governance/Meldecenter system handles abuse reports, reviewer workflows,
node-operator actions, and transparency artifacts without creating a global
God-mode.

## Roles

- User: may create reports and view own user-visible security events.
- Reviewer: may review minimized cases according to active credential scope.
- Senior reviewer: participates in higher threshold decisions.
- Node operator: may act on node-local policy and node-local queues.

Roles are server-verified through credentials. Client-provided role flags are
not trusted.

## Bootstrap Configuration (fail-closed)

Node-operator bootstrap is **fail-closed**. The shipped `Frontend/frontend/public/governance.json` template is empty (`"operators": []`) and `Backend/governance.json` contains only a placeholder; neither grants any role. Configure a real file before first start via `GAIACOM_GOVERNANCE_CONFIG` (recommended) or a `governance.json` in the backend working directory, with at least one **fully qualified** operator GaiaID (`@name:domain`) matching an identity created on this node. If no valid entry exists, the node starts but no operator role is auto-assigned â€” there is no default admin fallback. Exact full-ID matching for bootstrap entries is being hardened in the security fix wave (audit-v3 PATCH_PLANS P-01); do not rely on domain-less handles.

## Case Handling

Reports carry minimized metadata, cryptographic proof references, category,
severity, and public review comments where needed. Private native content is
not exposed to reviewers unless a user explicitly creates a disclosure export.

## Thresholds

Hard actions such as suspension or timeout require threshold logic. Small nodes
use smaller reviewer counts; larger nodes scale required participation. The
beta gate tests role escalation and governance queue separation.

## Transparency

Transparency views must be aggregate-first. Public dashboards must not expose
exact IP addresses, raw user-agent strings, JWTs, secrets, private messages, or
private reports.

## Verification status (2026-11-06)

This document is a design description. The static-audit evidence is maintained internally; runtime governance/abuse tests are **NOT_TESTED** in this snapshot (no build/install), so no PASS status is claimed here.

## Audit

Admin and security-relevant actions are written as redacted Security Events and
linked into an append-only audit chain. The database blocks mutation/deletion
of audit chain rows.

## Verifizierungs-Attestierungen (Badges)

`node_operator`-Rollen dÃ¼rfen signierte Attestierungen ausstellen (Detail:
`docs/attestation-registry.md`). Regeln:

- **Rollen â‰  Abzeichen.** Rollen gewÃ¤hren Rechte; Abzeichen sind Aussagen eines
  Ausstellers Ã¼ber eine IdentitÃ¤t und gewÃ¤hren keinerlei Sonderrechte.
- **Aussteller-Kompetenz:** `human`/`organization` = Node-Operator nach
  dokumentierter PrÃ¼fung; `node_operator`/`moderator`/`official` = Governance-
  Beschluss. Kein Pay-to-play, kein zentraler "global verifiziert"-Anspruch.
- **Signatur, Ablauf, Widerruf sind Pflicht.** Clients prÃ¼fen die Ed25519-
  Signatur des Node-SchlÃ¼ssels gegen den kanonisch signierten Payload; nur
  gÃ¼ltige, nicht widerrufene Attestierungen werden als verifiziert angezeigt.
- **Anzeige immer mit Aussteller** (plus Ablaufdatum) â€” nie ein nackter Haken.
  Fremde Aussteller werden nach der Trust-Konfiguration des EmpfÃ¤ngers bewertet.
- **Evidenz-Referenzen, keine Dokumente:** gespeichert werden nur Hashes/IDs
  der PrÃ¼fung, keine Ausweis- oder Vertragsunterlagen.

## Node-Operator-Sichtbarkeit

- Standardansicht ist aggregat-only (Konten, IdentitÃ¤ten, RÃ¤ume, Nachrichten/24 h,
  Abuse-Cases, aktive Abzeichen, Verzeichniszugriffe/24 h).
- IdentitÃ¤tsdaten im Fallbezug kommen aus der bestehenden Abuse-/Case-Kette.
- Ein paginiertes IdentitÃ¤tsverzeichnis (Break-Glass) erfordert eine
  dokumentierte BegrÃ¼ndung (â‰¥ 20 Zeichen), ist rollen- und zeitgebunden und wird
  **pro Zugriff** in einem Ã¶ffentlichen Transparenz-Log protokolliert.
- Der Operator sieht Metadaten, keine Nachrichteninhalte; das wird in UI und
  Datenschutzhinweisen offen kommuniziert (kein "zero-knowledge"-Marketing).
