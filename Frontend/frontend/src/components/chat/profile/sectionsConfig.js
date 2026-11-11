/**
 * Section registry for the identity workspace.
 *
 * The keys are the pre-existing `activeProfileSection` values consumed by the
 * parent application. The settings navigation itself lives in the workspace
 * ListPane; this module keeps the governance role labels and the shared label
 * resolution used by the identity header.
 */
export const PROFILE_NAV = [
  {
    group: 'Profil',
    items: [
      { key: 'edit', labelKey: 'edit_profile', fallback: 'Profil bearbeiten', icon: 'user' },
      { key: 'password', labelKey: 'change_password_title', fallback: 'Passwort ändern', icon: 'lock' }
    ]
  },
  {
    group: 'Kommunikation',
    items: [
      { key: 'mailbox_settings', labelKey: 'mailbox_settings_title', fallback: 'Mailbox-Einstellungen', icon: 'mail' },
      { key: 'notifications', labelKey: null, fallback: 'Benachrichtigungen', icon: 'bell' },
      { key: 'accessibility', labelKey: null, fallback: 'Barrierefreiheit', icon: 'sliders' }
    ]
  },
  {
    group: 'Geräte',
    items: [
      { key: 'devices', labelKey: 'device_sessions_title', fallback: 'Angemeldete Geräte', icon: 'cpu' }
    ]
  },
  {
    group: 'Sicherheit',
    items: [
      { key: 'security', labelKey: 'crypto_lock_title', fallback: 'Kryptografische Sperre', icon: 'shield' },
      { key: 'keys', labelKey: 'kryptographische_schluessel', fallback: 'Schlüssel & Seed', icon: 'key' }
    ]
  },
  {
    group: 'Datenschutz',
    items: [
      { key: 'privacy', labelKey: null, fallback: 'Privatsphäre', icon: 'eyeOff' },
      { key: 'legal', labelKey: 'privacy_imprint_title', fallback: 'Impressum & DSGVO', icon: 'fileText' }
    ]
  },
  {
    group: 'Gefahrenzone',
    items: [
      { key: 'danger', labelKey: 'delete_account_title', fallback: 'Account löschen', icon: 'alertTriangle' }
    ]
  }
];

export const GOVERNANCE_ROLE_LABELS = Object.freeze({
  trusted_reviewer: 'Trusted Reviewer',
  senior_reviewer: 'Senior Reviewer',
  node_operator: 'Node Operator'
});

export function navLabel(t, item) {
  const translated = item.labelKey && typeof t === 'function' ? t(item.labelKey) : '';
  return translated || item.fallback;
}