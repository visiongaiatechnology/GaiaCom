// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useEffect } from 'react';
import * as api from '../api';
import { parseToGaiaID } from '../utils/gaiaAddress';
import { buildInitialKeyHistory, appendKeyHistory, fingerprintKey } from '../utils/keyHistory';
import { safeJsonParse } from '../utils/safeJson';

/**
 * Detects public-key changes for the currently active chat contact and
 * triggers a confirmation modal (keyChangeWarning) when a mismatch is found.
 * Extracted from App.js (was lines 897–1018). Zero logic changes.
 */
export function useKeyChangeDetection({
  currentMenu,
  activeChatContact,
  contacts,
  setContacts,
  keyChangeWarning,
  setKeyChangeWarning,
  setKeyChangeConfirmInput,
  setActiveChatContact,
  chatKeyCheckRef,
  user,
  triggerAlert,
  t
}) {
  useEffect(() => {
    if (currentMenu !== 'chat' || !activeChatContact?.gaiaID) {
      chatKeyCheckRef.current = '';
      return;
    }

    const formatted = parseToGaiaID(activeChatContact.gaiaID);
    const stored = contacts.find(c => parseToGaiaID(c.gaiaID) === formatted);
    const knownKey = stored?.publicKey || activeChatContact.publicKey || '';
    if (!knownKey) {
      return;
    }

    const snapshotKey = `${formatted}|${knownKey}`;
    if (chatKeyCheckRef.current === snapshotKey || keyChangeWarning?.gaiaID === formatted) {
      return;
    }

    let cancelled = false;
    const verifyActiveChatKey = async () => {
      try {
        const res = await api.getPublicIdentity(formatted);
        if (cancelled || !res?.publicRecord) {
          return;
        }

        const pubRecord = safeJsonParse(res.publicRecord, null);
        if (!pubRecord) {
          chatKeyCheckRef.current = snapshotKey;
          return;
        }
        const fetchedKey = pubRecord?.public_keys?.identity || '';
        if (!fetchedKey) {
          chatKeyCheckRef.current = snapshotKey;
          return;
        }

        if (fetchedKey === knownKey) {
          chatKeyCheckRef.current = snapshotKey;
          const baseContact = stored || activeChatContact;
          const keyHistory = Array.isArray(baseContact.keyHistory) ? baseContact.keyHistory : buildInitialKeyHistory(knownKey, true);
          const now = new Date().toISOString();
          const hasKeyInHistory = keyHistory.some(entry => entry.publicKey === knownKey);
          let nextHistory;
          if (hasKeyInHistory) {
            nextHistory = keyHistory.map(entry => entry.publicKey === knownKey ? { ...entry, lastSeenAt: now } : entry);
          } else {
            nextHistory = [
              {
                fingerprint: fingerprintKey(knownKey),
                publicKey: knownKey,
                firstSeenAt: now,
                lastSeenAt: now,
                confirmed: true,
                warning: ''
              },
              ...keyHistory
            ];
          }

          const updatedContact = {
            ...baseContact,
            keyHistory: nextHistory,
            keyConfirmedAt: now
          };

          const updatedContacts = contacts.map(contact =>
            parseToGaiaID(contact.gaiaID) === formatted ? updatedContact : contact
          );
          setContacts(updatedContacts);
          if (user?.id) {
            localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updatedContacts));
          }
          if (activeChatContact && parseToGaiaID(activeChatContact.gaiaID) === formatted) {
            setActiveChatContact(updatedContact);
          }
          return;
        }

        setKeyChangeWarning({
          gaiaID: formatted,
          displayName: stored?.displayName || activeChatContact.displayName || formatted,
          oldKey: knownKey,
          newKey: fetchedKey,
          resumeFn: () => {
            const baseContact = stored || activeChatContact;
            const updatedStored = {
              ...baseContact,
              publicKey: fetchedKey,
              trustPassport: res.trustPassport || baseContact.trustPassport,
              keyHistory: appendKeyHistory(baseContact, fetchedKey, true),
              keyConfirmedAt: new Date().toISOString()
            };
            const updatedContacts = contacts.map(contact =>
              parseToGaiaID(contact.gaiaID) === formatted ? updatedStored : contact
            );
            setContacts(updatedContacts);
            if (user?.id) {
              localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updatedContacts));
            }
            setActiveChatContact(updatedStored);
            chatKeyCheckRef.current = `${formatted}|${fetchedKey}`;
            setKeyChangeWarning(null);
            setKeyChangeConfirmInput('');
          },
          cancelFn: () => {
            setKeyChangeWarning(null);
            setKeyChangeConfirmInput('');
            setActiveChatContact(null);
            triggerAlert(
              t('key_change_warn_title') || 'Sicherheitswarnung',
              t('key_change_warn_desc') || 'Dieser Kontakt-Schlüssel hat sich geändert. Der Chat wurde geschlossen, bis der Fingerprint verifiziert ist.',
              'danger'
            );
          }
        });
      } catch (_) {
        chatKeyCheckRef.current = snapshotKey;
      }
    };

    verifyActiveChatKey();
    return () => {
      cancelled = true;
    };
  }, [activeChatContact, contacts, currentMenu, keyChangeWarning, setActiveChatContact, t, triggerAlert, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
