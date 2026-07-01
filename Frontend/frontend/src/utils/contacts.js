// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { buildInitialKeyHistory, appendKeyHistory } from './keyHistory';

/**
 * Merges cached local contacts with contacts fetched from the backend.
 * Backend data wins for most fields; key history is accumulated across both sources.
 * Extracted from App.js – no logic changes.
 */
export function mergeContactRecords(cachedContacts = [], backendContacts = []) {
  const merged = new Map();
  const now = new Date().toISOString();
  cachedContacts.forEach(contact => {
    const key = String(contact?.gaiaID || contact?.ID || contact?.gaiaId || contact?.id || '').toLowerCase();
    if (key) {
      merged.set(key, {
        ...contact,
        ID: contact.ID || contact.id || '',
        id: contact.id || contact.ID || '',
        gaiaID: contact.gaiaID || contact.gaiaId || ''
      });
    }
  });
  backendContacts.forEach(contact => {
    const key = String(contact?.gaiaId || contact?.gaiaID || contact?.ID || contact?.id || '').toLowerCase();
    if (!key) return;
    const cached = merged.get(key) || {};

    const cachedKey = cached.publicKey || '';
    const serverKey = contact.publicKey || '';
    let nextHistory = cached.keyHistory || [];
    if (serverKey) {
      if (cachedKey === serverKey && nextHistory.length > 0) {
        nextHistory = nextHistory.map(entry =>
          entry.publicKey === serverKey ? { ...entry, lastSeenAt: now } : entry
        );
      } else if (nextHistory.length === 0) {
        nextHistory = buildInitialKeyHistory(serverKey, true);
      } else {
        nextHistory = appendKeyHistory(cached, serverKey, true);
      }
    }

    merged.set(key, {
      ...cached,
      ...contact,
      ID: contact.id || contact.ID || cached.ID || cached.id || '',
      id: contact.id || contact.ID || cached.id || cached.ID || '',
      gaiaID: contact.gaiaId || contact.gaiaID || cached.gaiaID || '',
      publicKey: serverKey || cachedKey,
      displayName: contact.displayName || cached.displayName || '',
      blocked: contact.blocked ?? cached.blocked ?? false,
      trustPassport: cached.trustPassport || null,
      abuseScore: cached.abuseScore || { score: 0, escalationLevel: 0 },
      keyHistory: nextHistory
    });
  });
  return Array.from(merged.values());
}
