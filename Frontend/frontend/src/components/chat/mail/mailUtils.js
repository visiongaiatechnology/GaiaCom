import { safeJsonParse } from '../../../utils/safeJson';

const FALLBACK_VALUE = '—';

/**
 * Mailbox labels arrive as a JSON string on some records and as an array on
 * others. This mirrors the parsing that ReaderPane already used.
 */
export function parseMailboxLabels(labels) {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === 'string') {
    const parsed = safeJsonParse(labels, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

/** A mail can be a single message or a thread with a `messages` array. */
export function getThreadMessages(mail) {
  if (!mail) return [];
  if (Array.isArray(mail.messages) && mail.messages.length > 0) return mail.messages;
  return [mail];
}

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleString() : '';
}

export function formatIsoDateTime(value) {
  const date = toDate(value);
  return date ? date.toISOString() : undefined;
}

export function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return FALLBACK_VALUE;
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Two-character initials for a quiet identity glyph. Never fabricates a name. */
export function getAddressInitials(address) {
  const value = String(address || '');
  const localPart = value.replace(/^@/, '').split(':')[0] || '';
  const letters = localPart.replace(/[^A-Za-z0-9]/g, '');
  if (!letters) return '';
  return letters.slice(0, 2).toUpperCase();
}

export function findContact(contacts, address) {
  if (!Array.isArray(contacts) || !address) return null;
  return contacts.find((entry) => entry && (entry.gaiaID === address || entry.ID === address)) || null;
}

export function hasKeyChange(contact) {
  return Array.isArray(contact?.keyHistory) && contact.keyHistory.length > 1;
}

/**
 * Security context derived strictly from message props.
 * - isSmtp: the message arrived through the legacy SMTP bridge.
 * - untrusted: the sender is flagged by the network quarantine state.
 * - keyHistory: the contact's identity key changed at least once.
 * No encryption claim is produced beyond what these props support.
 */
export function getThreadSecurity(messages, contacts) {
  const list = Array.isArray(messages) ? messages : [];
  return {
    hasLegacySmtp: list.some((message) => message?.isSmtp === true),
    hasUntrusted: list.some((message) => message?.untrusted === true),
    hasKeyChange: list.some((message) => hasKeyChange(findContact(contacts, message?.sender))),
    isGaiaOnly: list.length > 0 && list.every((message) => message && message.isSmtp !== true)
  };
}

/** Unique recipient addresses, in thread order, without inventing entries. */
export function getThreadRecipients(messages) {
  const seen = new Set();
  const recipients = [];
  for (const message of Array.isArray(messages) ? messages : []) {
    const address = message?.recipientGaia || message?.recipient;
    if (!address || seen.has(address)) continue;
    seen.add(address);
    recipients.push(address);
  }
  return recipients;
}

/** Display name of a contact, falling back to the raw address. */
export function getDisplayName(contact, address) {
  const name = contact?.displayName;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return address || '';
}
