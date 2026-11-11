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
  governance, verified in the client and always shown together with issuer and expiry.
  Revoked, expired or invalid claims are marked as such and never grant privileges.
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

