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
