// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { decryptLocalRecord, deriveKeysFromMnemonic, encryptLocalRecord } from '../crypto';
import { safeJsonParse, safeStorageJson } from './safeJson';

const RECOVERY_FILE_TYPE = 'gaiacom.recovery.backup';
const RECOVERY_FILE_VERSION = 1;

function readStorageJson(key, fallback) {
  return safeStorageJson(localStorage, key, fallback);
}

function buildStorageSnapshot(userId, identityId) {
  if (!userId) return {};
  const snapshot = {
    profile: readStorageJson(`profile_${userId}`, null),
    contacts: readStorageJson(`contacts_${userId}`, []),
    messageMeta: readStorageJson(`gaia_message_meta_${userId}`, {}),
    activeIdentity: readStorageJson(`active_identity_${userId}`, null),
    settings: {
      cryptoSessionMinutes: localStorage.getItem('gaia_crypto_session_minutes') || '0',
      inactivityLockMinutes: localStorage.getItem('gaia_inactivity_lock_minutes') || '15',
      language: localStorage.getItem('gaiacom_language') || 'de'
    }
  };

  if (identityId) {
    snapshot.seenMailNotifications = readStorageJson(`gaia_seen_mail_notifications_${userId}_${identityId}`, []);
    snapshot.seenChatNotifications = readStorageJson(`gaia_seen_chat_notifications_${userId}_${identityId}`, []);
  }

  return snapshot;
}

export async function buildRecoveryBackup({
  user,
  activeIdentity,
  mnemonic,
  profileDisplayName,
  profileAvatar,
  profileBio,
  password
}) {
  if (!user?.id) {
    throw new Error('Kein aktiver GaiaCom Nutzer.');
  }
  if (!mnemonic || typeof mnemonic !== 'string') {
    throw new Error('Schluessel sind nicht entsperrt.');
  }
  if (!password || password.length < 12) {
    throw new Error('Das Recovery-Passwort muss mindestens 12 Zeichen haben.');
  }

  const derived = deriveKeysFromMnemonic(mnemonic);
  const payload = {
    type: RECOVERY_FILE_TYPE,
    version: RECOVERY_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      username: user.username || profileDisplayName || ''
    },
    identity: activeIdentity ? {
      id: activeIdentity.ID || activeIdentity.id || '',
      gaiaID: activeIdentity.GaiaID || activeIdentity.gaiaID || '',
      displayName: activeIdentity.DisplayName || activeIdentity.displayName || ''
    } : null,
    mnemonic,
    publicKeys: {
      identity: derived.keys.sign.public,
      box: derived.keys.box.public,
      pke: derived.keys.pke.public
    },
    profile: {
      displayName: profileDisplayName || user.username || '',
      avatar: profileAvatar || '🤖',
      bio: profileBio || ''
    },
    localState: buildStorageSnapshot(user.id, activeIdentity?.ID || activeIdentity?.id || '')
  };

  const encrypted = await encryptLocalRecord(payload, password);
  return {
    type: RECOVERY_FILE_TYPE,
    version: RECOVERY_FILE_VERSION,
    exportedAt: payload.exportedAt,
    encryption: encrypted
  };
}

export async function parseRecoveryBackup(fileText, password) {
  let envelope;
  envelope = safeJsonParse(fileText, null);
  if (!envelope) {
    throw new Error('Recovery-Datei ist kein gueltiges GaiaCom Backup.');
  }

  if (!envelope || envelope.type !== RECOVERY_FILE_TYPE || envelope.version !== RECOVERY_FILE_VERSION || !envelope.encryption) {
    throw new Error('Recovery-Datei wird von dieser GaiaCom Version nicht unterstuetzt.');
  }
  if (!password) {
    throw new Error('Recovery-Passwort fehlt.');
  }

  const payload = await decryptLocalRecord(envelope.encryption, password);
  if (!payload || payload.type !== RECOVERY_FILE_TYPE || !payload.mnemonic) {
    throw new Error('Recovery-Datei enthaelt keine gueltige Identitaet.');
  }

  const derived = deriveKeysFromMnemonic(payload.mnemonic);
  if (payload.publicKeys?.identity && payload.publicKeys.identity !== derived.keys.sign.public) {
    throw new Error('Recovery-Datei passt nicht zu den enthaltenen Schluesseln.');
  }

  return payload;
}

export function downloadRecoveryFile(backup, filenamePrefix = 'gaiacom-recovery') {
  const safePrefix = filenamePrefix.replace(/[^a-z0-9_-]/gi, '_').slice(0, 48) || 'gaiacom-recovery';
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safePrefix}-${date}.gaiacom-recovery.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
