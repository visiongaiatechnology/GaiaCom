// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useState } from 'react';
import * as api from '../api';
import { parseToGaiaID } from './gaiaAddress';
import { buildInitialKeyHistory, appendKeyHistory } from './keyHistory';
import { safeJsonParse } from './safeJson';

/**
 * Contact discovery, adding contacts, opening contact profiles, toggling
 * block status, and reporting abuse.
 * Extracted from App.js (was lines 1444-1608). Zero logic changes.
 */
export function useContactActions({
  user,
  contacts,
  setContacts,
  activeChatContact,
  activeIdentity,
  setActiveChatContact,
  contactProfile,
  setContactProfile,
  triggerAlert,
  showConfirm,
  t
}) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [discoverGaiaId, setDiscoverGaiaId] = useState('');
  const [discoveredContact, setDiscoveredContact] = useState(null);
  const [discoverError, setDiscoverError] = useState('');

  async function handleDiscoverSubmit(e) {
    e.preventDefault();
    setDiscoverError('');
    setDiscoveredContact(null);
    if (!discoverGaiaId.trim()) return;

    try {
      const formatted = parseToGaiaID(discoverGaiaId);
      const res = await api.getPublicIdentity(formatted);
      if (res && res.publicRecord) {
        const pubRecord = safeJsonParse(res.publicRecord, null);
        if (!pubRecord?.public_keys?.identity) {
          throw new Error('Ungueltiger Public Record.');
        }
        setDiscoveredContact({
          ID: res.id,
          gaiaID: res.gaiaID,
          displayName: pubRecord.profile?.displayName || res.displayName,
          realName: pubRecord.profile?.realName || '',
          avatar: pubRecord.profile?.avatar || '',
          website: pubRecord.profile?.website || '',
          bio: pubRecord.profile?.bio || '',
          publicKey: pubRecord.public_keys.identity,
          abuseScore: res.trustPassport?.abuseScore || res.abuseScore || { score: 0, escalationLevel: 0 },
          trustPassport: res.trustPassport,
          keyHistory: res.trustPassport?.keyHistory || buildInitialKeyHistory(pubRecord.public_keys.identity, true)
        });
      } else {
        setDiscoverError('Kontakt im födertierten Netz nicht gefunden.');
      }
    } catch (err) {
      setDiscoverError(err.message);
    }
  }

  function addDiscoveredContact() {
    if (!discoveredContact || !user) return;
    const existing = contacts.find(c => c.ID === discoveredContact.ID || c.gaiaID === discoveredContact.gaiaID);
    
    const saveContact = async () => {
      const normalizedContact = {
        ...discoveredContact,
        keyHistory: existing && existing.publicKey !== discoveredContact.publicKey
          ? appendKeyHistory(existing, discoveredContact.publicKey, true)
          : (discoveredContact.keyHistory || buildInitialKeyHistory(discoveredContact.publicKey, true)),
        keyConfirmedAt: new Date().toISOString()
      };
      const persisted = await api.saveMailContact({
        id: normalizedContact.id || normalizedContact.ID,
        gaiaId: normalizedContact.gaiaID,
        displayName: normalizedContact.displayName,
        publicKey: normalizedContact.publicKey || '',
        blocked: !!normalizedContact.blocked
      });
      const mergedContact = {
        ...normalizedContact,
        ...persisted,
        gaiaID: persisted?.gaiaId || persisted?.gaiaID || normalizedContact.gaiaID
      };
      const updated = [...contacts.filter(c => c.ID !== discoveredContact.ID && c.gaiaID !== discoveredContact.gaiaID), mergedContact];
      setContacts(updated);
      localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
      setShowAddContact(false);
      triggerAlert('Kontakt hinzugefügt', `${discoveredContact.displayName} wurde in Ihr Adressbuch eingetragen.`);
    };

    if (existing && existing.publicKey !== discoveredContact.publicKey) {
      showConfirm(
        t('key_change_warn_title') || 'Kryptographische Warnung',
        `Der öffentliche Schlüssel für ${discoveredContact.displayName} hat sich geändert!\n\nAlt: ${existing.publicKey.slice(0, 20)}...\nNeu: ${discoveredContact.publicKey.slice(0, 20)}...\n\nMöchtest du den neuen Schlüssel wirklich akzeptieren? (Dies kann ein Hinweis auf einen Man-in-the-Middle-Angriff sein!)`,
        saveContact,
        null,
        'Schlüssel akzeptieren',
        'Abbrechen',
        true
      );
    } else {
      saveContact();
    }
  }

  async function openContactProfile(gaiaID) {
    const formatted = parseToGaiaID(gaiaID);
    const localContact = contacts.find(c => parseToGaiaID(c.gaiaID) === formatted);
    try {
      let trustPassport = null;
      try {
        trustPassport = await api.getTrustPassport(formatted);
      } catch (_) {}
      if (localContact) {
        let sharedProfile = {};
        try {
          const publicIdentity = await api.getPublicIdentity(formatted);
          const publicRecord = safeJsonParse(publicIdentity?.publicRecord, null);
          sharedProfile = publicRecord?.profile || {};
        } catch (_) {}
        setContactProfile({
          ...localContact,
          realName: sharedProfile.realName || localContact.realName || '',
          avatar: sharedProfile.avatar || localContact.avatar || '',
          website: sharedProfile.website || localContact.website || '',
          bio: sharedProfile.bio || localContact.bio || '',
          displayName: sharedProfile.displayName || localContact.displayName,
          trustPassport: trustPassport || localContact.trustPassport,
          keyHistory: localContact.keyHistory || buildInitialKeyHistory(localContact.publicKey, true)
        });
        return;
      }
      const res = await api.getPublicIdentity(formatted);
      if (res && res.publicRecord) {
        const pubRecord = safeJsonParse(res.publicRecord, null);
        if (!pubRecord?.public_keys?.identity) {
          throw new Error('Ungueltiger Public Record.');
        }
        setContactProfile({
          ID: res.id,
          gaiaID: res.gaiaID,
          displayName: pubRecord.profile?.displayName || res.displayName,
          realName: pubRecord.profile?.realName || '',
          avatar: pubRecord.profile?.avatar || '',
          website: pubRecord.profile?.website || '',
          bio: pubRecord.profile?.bio || '',
          publicKey: pubRecord.public_keys.identity,
          abuseScore: trustPassport?.abuseScore || res.abuseScore || { score: 0, escalationLevel: 0 },
          trustPassport: trustPassport || res.trustPassport,
          keyHistory: trustPassport?.keyHistory || buildInitialKeyHistory(pubRecord.public_keys.identity, true)
        });
      }
    } catch (err) {
      triggerAlert('Profil nicht gefunden', err.message, 'danger');
    }
  }

  async function handleToggleContactBlock(gaiaID) {
    if (!gaiaID) return;
    const formatted = parseToGaiaID(gaiaID);
    const targetContact = contacts.find(contact => parseToGaiaID(contact.gaiaID) === formatted)
      || (contactProfile && parseToGaiaID(contactProfile.gaiaID) === formatted ? contactProfile : null);
    if (!targetContact) return;

    const nextBlocked = !targetContact.blocked;
    const persisted = await api.saveMailContact({
      id: targetContact.id || targetContact.ID,
      gaiaId: targetContact.gaiaID,
      displayName: targetContact.displayName,
      publicKey: targetContact.publicKey || '',
      blocked: nextBlocked
    });

    const normalized = {
      ...targetContact,
      ...persisted,
      gaiaID: persisted?.gaiaId || persisted?.gaiaID || targetContact.gaiaID,
      blocked: nextBlocked
    };

    setContacts(prev => {
      const next = prev.map(contact =>
        parseToGaiaID(contact.gaiaID) === formatted ? { ...contact, blocked: nextBlocked } : contact
      );
      if (user?.id) {
        localStorage.setItem(`contacts_${user.id}`, JSON.stringify(next));
      }
      return next;
    });

    setActiveChatContact(prev => prev && parseToGaiaID(prev.gaiaID) === formatted ? { ...prev, blocked: nextBlocked } : prev);
    setContactProfile(prev => prev && parseToGaiaID(prev.gaiaID) === formatted ? { ...prev, ...normalized } : prev);
    triggerAlert(
      nextBlocked ? 'Kontakt blockiert' : 'Kontakt freigegeben',
      nextBlocked ? 'Der Kontakt wurde fuer diesen Account blockiert.' : 'Der Kontakt ist wieder freigegeben.',
      nextBlocked ? 'danger' : 'success'
    );
  }

  async function handleReportContactAbuse(gaiaID) {
    if (!gaiaID || !activeIdentity?.ID) return;
    showConfirm(
      'Kontakt melden',
      'Diese Meldung wird an das Governance-Meldecenter uebermittelt.',
      async () => {
        await api.submitAbuseReport(
          activeIdentity.ID,
          'user',
          gaiaID,
          'harassment',
          'medium',
          null,
          ''
        );

        triggerAlert('Meldung eingereicht', 'Die Meldung wurde erfolgreich an die Governance-Moderatoren uebermittelt.', 'success');
      },
      null,
      'Melden',
      'Abbrechen',
      true
    );
  }

  return {
    showAddContact, setShowAddContact,
    discoverGaiaId, setDiscoverGaiaId,
    discoveredContact, setDiscoveredContact,
    discoverError, setDiscoverError,
    handleDiscoverSubmit,
    addDiscoveredContact,
    openContactProfile,
    handleToggleContactBlock,
    handleReportContactAbuse
  };
}
