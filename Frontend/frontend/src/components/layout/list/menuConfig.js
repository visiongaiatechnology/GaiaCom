/**
 * VGT GLASS 2100 — Inbox list configuration.
 *
 * Declarative menu metadata for the second (list) column: which menus are mail
 * folders, their folder segments, headings and the profile/settings navigation
 * groups. Copy falls back to the previous German strings, so existing
 * translations keep working unchanged.
 */

export const EMAIL_MENUS = Object.freeze([
  'inbox',
  'smtp_inbox',
  'sent',
  'smtp_sent',
  'archive',
  'smtp_archive',
  'spam',
  'smtp_spam',
  'trash',
  'smtp_trash',
  'starred',
  'smtp_starred',
  'important',
  'smtp_important',
  'snoozed',
  'smtp_snoozed',
  'drafts',
  'smtp_drafts'
]);

/** Menus that expose the compose action (identical to the previous predicate). */
export const COMPOSE_MENUS = Object.freeze([
  'inbox',
  'sent',
  'contacts',
  'smtp_inbox',
  'starred',
  'important',
  'archive',
  'trash',
  'spam',
  'snoozed'
]);

export function isEmailMenu(menu) {
  return EMAIL_MENUS.includes(menu);
}

/** Folder segments shown above the mail list. Icons come from the VGT icon set. */
export const FOLDER_TABS = Object.freeze([
  { key: 'inbox', label: 'Eingang', icon: 'inbox' },
  { key: 'smtp_inbox', label: 'SMTP', icon: 'mail' },
  { key: 'sent', label: 'Ausgang', icon: 'send' },
  { key: 'starred', label: 'Markiert', icon: 'star' },
  { key: 'important', label: 'Wichtig', icon: 'bookmark' },
  { key: 'snoozed', label: 'Später', icon: 'clock' },
  { key: 'archive', label: 'Archiv', icon: 'archive' },
  { key: 'spam', label: 'Spam', icon: 'alertOctagon' },
  { key: 'trash', label: 'Papierkorb', icon: 'trash' }
]);

function pick(t, key, fallback) {
  if (typeof t !== 'function') return fallback;
  return t(key) || fallback;
}

/** Page heading for the list rail. Same roots as before, with hard fallbacks. */
export function resolveListTitle(menu, t) {
  switch (menu) {
    case 'inbox':
      return pick(t, 'posteingang', 'Posteingang');
    case 'smtp_inbox':
      return pick(t, 'smtp_inbox_title', 'SMTP Empfang');
    case 'sent':
      return pick(t, 'gesendet', 'Gesendete Mails');
    case 'contacts':
      return pick(t, 'adressbuch', 'Adressbuch');
    case 'chat':
      return pick(t, 'quanten_chat', 'Quanten-Chats');
    case 'groups':
      return pick(t, 'gruppen_chats', 'Gruppen-Chats');
    case 'public_channels':
      return 'Channels';
    case 'network_health':
      return 'Network Health';
    case 'profile':
      return pick(t, 'mein_profil', 'Dein Profil');
    case 'vault':
      return 'Tresor';
    case 'gaiadrop':
      return pick(t, 'drop_title', 'GaiaDrop Inbox');
    default:
      /* Remaining SMTP variants keep a real heading instead of an empty one. */
      return isEmailMenu(menu) ? 'Postfach' : '';
  }
}

/** Short context line (eyebrow) that says where the user currently is. */
export function resolveListScope(menu, t) {
  const pick = (key, fallback) => (typeof t === 'function' && t(key)) || fallback;
  if (isEmailMenu(menu)) {
    return menu.startsWith('smtp_') ? 'SMTP · Postfach' : 'Postfach';
  }
  switch (menu) {
    case 'contacts':
      return 'Adressbuch';
    case 'chat':
      return 'Direktnachrichten';
    case 'groups':
      return 'Gruppen';
    case 'public_channels':
      return pick('ui_ch_public', 'Öffentlich');
    case 'profile':
      return pick('ui_settings', 'Einstellungen');
    case 'vault':
      return 'Tresor';
    case 'gaiadrop':
      return 'GaiaDrop';
    case 'network_health':
      return 'Netzwerk';
    default:
      return 'GaiaCom';
  }
}

/**
 * Profile / settings navigation. Every entry keeps the exact section key that
 * App.jsx writes into `activeProfileSection`; grouping is presentation only.
 */
export const PROFILE_GROUPS = Object.freeze([
  {
    id: 'identity',
    heading: 'Profil',
    items: [
      {
        key: 'edit',
        icon: 'user',
        labelKey: 'edit_profile',
        label: 'Profil bearbeiten',
        descKey: 'edit_profile_desc',
        desc: 'Anzeigename, Biografie und Avatar anpassen.'
      },
      {
        key: 'mailbox_settings',
        icon: 'mail',
        labelKey: 'mailbox_settings_title',
        label: 'Mailbox-Einstellungen',
        descKey: 'mailbox_settings_desc',
        desc: 'Signatur, Sprache und Mail-Filter regeln.'
      },
      {
        key: 'password',
        icon: 'lock',
        labelKey: 'change_password_title',
        label: 'Passwort ändern',
        descKey: 'change_password_menu_desc',
        desc: 'GaiaCom Login-Passwort aktualisieren.'
      }
    ]
  },
  {
    id: 'security',
    heading: 'Sicherheit',
    items: [
      {
        key: 'devices',
        icon: 'server',
        labelKey: 'device_sessions_title',
        label: 'Angemeldete Geräte',
        descKey: 'device_sessions_menu_desc',
        desc: 'Aktive Sitzungen verwalten und beenden.'
      },
      {
        key: 'keys',
        icon: 'key',
        labelKey: 'kryptographische_schluessel',
        label: 'Kryptographische Schlüssel',
        descKey: 'kryptographische_schluessel_desc',
        desc: 'Private Schlüssel und Backup-Seed-Phrase anzeigen.'
      },
      {
        key: 'security',
        icon: 'clock',
        labelKey: 'crypto_lock_title',
        label: 'Kryptografische Sperre',
        descKey: 'crypto_lock_menu_desc',
        desc: 'Reload- und Inaktivitäts-Timer steuern.'
      }
    ]
  },
  {
    id: 'privacy',
    heading: 'Datenschutz & Anzeige',
    items: [
      {
        key: 'privacy',
        icon: 'globe',
        labelKey: null,
        label: 'Privatsphäre',
        descKey: null,
        desc: 'Anonyme Statistik-Freigabe für Network Health.'
      },
      {
        key: 'accessibility',
        icon: 'sliders',
        labelKey: null,
        label: 'Barrierefreiheit',
        descKey: null,
        desc: 'Textgröße, Kontrast und Bewegungen auf diesem Gerät.'
      },
      {
        key: 'notifications',
        icon: 'bell',
        labelKey: null,
        label: 'Benachrichtigungen',
        descKey: null,
        desc: 'Vorschauen und Ruhezeiten für dieses Gerät.'
      },
      {
        key: 'legal',
        icon: 'fileText',
        labelKey: 'privacy_imprint_title',
        label: 'Datenschutz & Impressum',
        descKey: 'privacy_imprint_menu_desc',
        desc: 'DSGVO, Datenschutz und Impressum anzeigen.'
      }
    ]
  }
]);

/** Destructive settings live in their own visually separated group. */
export const PROFILE_DANGER_GROUP = Object.freeze({
  id: 'danger',
  heading: 'Gefahrenzone',
  items: [
    {
      key: 'danger',
      icon: 'alertOctagon',
      labelKey: 'delete_account_title',
      label: 'Account löschen',
      descKey: 'delete_account_menu_desc',
      desc: 'Konto und zuordenbare Daten endgültig vernichten.'
    }
  ]
});

/** Resolve translated settings copy without losing the historical fallbacks. */
export function resolveSettingsEntry(entry, t) {
  return {
    ...entry,
    labelText: entry.labelKey ? pick(t, entry.labelKey, entry.label) : entry.label,
    descText: entry.descKey ? pick(t, entry.descKey, entry.desc) : entry.desc
  };
}
