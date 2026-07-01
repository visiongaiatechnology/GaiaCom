// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useState, useCallback, useEffect } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { sanitizeAvatarFile } from './avatar';
import { buildRecoveryBackup, downloadRecoveryFile, parseRecoveryBackup } from './recovery';
import { safeJsonParse } from './safeJson';
import { createWebAuthnMnemonicEnvelope, hasWebAuthnSupport } from './webauthnPrf';

const PIN_KDF_ITERATIONS = 2500000;
const DEVICE_CODE_MIN_LENGTH = 16;
const DEVICE_CODE_MAX_LENGTH = 64;
const DEVICE_CODE_MIN_PASSPHRASE_LENGTH = 24;

function normalizeDeviceCode(value) {
  return String(value || '').trim();
}

function hasWeakDeviceCodePattern(value) {
  const normalized = normalizeDeviceCode(value);
  const lower = normalized.toLowerCase();
  if (/^([a-z0-9])\1+$/i.test(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (/^(0123456789|1234567890|9876543210|0987654321)/.test(normalized)) return true;
  if (/(password|passwort|gaiacom|visiongaia|qwerty|admin|letmein|welcome)/i.test(lower)) return true;

  const chars = Array.from(normalized).map(char => char.charCodeAt(0));
  const ascending = chars.every((char, index) => index === 0 || char === chars[index - 1] + 1);
  const descending = chars.every((char, index) => index === 0 || char === chars[index - 1] - 1);
  if (ascending || descending) return true;

  const uniqueChars = new Set(Array.from(normalized.toLowerCase())).size;
  if (uniqueChars < 8) return true;

  const classCount = [
    /[a-z]/.test(normalized),
    /[A-Z]/.test(normalized),
    /\d/.test(normalized),
    /[^A-Za-z0-9]/.test(normalized)
  ].filter(Boolean).length;
  const passphraseWords = normalized.split(/\s+/).filter(word => word.length >= 4);
  const strongPassphrase = normalized.length >= DEVICE_CODE_MIN_PASSPHRASE_LENGTH && passphraseWords.length >= 4;
  return classCount < 3 && !strongPassphrase;
}

function normalizeServerProfile(profile, activeIdentity, user) {
  const remote = profile || {};
  return {
    displayName: remote.displayName || activeIdentity?.DisplayName || user?.username || '',
    realName: remote.realName || '',
    website: remote.website || '',
    bio: remote.description || remote.bio || '',
    avatar: remote.avatar || '\u{1F916}'
  };
}

/**
 * All profile-related actions: unlock keys, save profile, change password,
 * manage PIN, export/import recovery backup, delete account.
 * Extracted from App.js (was lines 1270–1442). Zero logic changes.
 */
export function useProfileActions({
  user,
  setUser,
  mnemonic,
  setMnemonic,
  derivedKeys,
  setDerivedKeys,
  usernameInput,
  setUsernameInput,
  passwordInput,
  setPasswordInput,
  cryptoSessionMinutes,
  setCryptoSessionMinutes,
  inactivityLockMinutes,
  setInactivityLockMinutes,
  writeCryptoSession,
  activeIdentity,
  triggerAlert,
  t
}) {
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileRealName, setProfileRealName] = useState('');
  const [profileWebsite, setProfileWebsite] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('\u{1F916}');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [areKeysUnlocked, setAreKeysUnlocked] = useState(false);
  const [profilePasswordInput, setProfilePasswordInput] = useState('');
  const [profileUnlockError, setProfileUnlockError] = useState('');
  const [pinUnlockEnabled, setPinUnlockEnabled] = useState(() => !!localStorage.getItem('gaia_pin_mnemonic_enc'));
  const [webAuthnUnlockEnabled, setWebAuthnUnlockEnabled] = useState(() => !!localStorage.getItem('gaia_webauthn_mnemonic_enc'));
  // State variables are passed as parameters from the parent component
  const userId = user?.id || '';
  const userName = user?.username || '';
  const activeIdentityGaiaID = activeIdentity?.GaiaID || '';
  const activeIdentityDisplayName = activeIdentity?.DisplayName || '';

  useEffect(() => {
    if (!userId || !activeIdentityGaiaID) return;
    let cancelled = false;

    api.getGsnProfile(activeIdentityGaiaID)
      .then(serverProfile => {
        if (cancelled) return;
        const nextProfile = normalizeServerProfile(
          serverProfile,
          { DisplayName: activeIdentityDisplayName },
          { username: userName }
        );
        setProfileDisplayName(nextProfile.displayName);
        setProfileRealName(nextProfile.realName);
        setProfileWebsite(nextProfile.website);
        setProfileBio(nextProfile.bio);
        setProfileAvatar(nextProfile.avatar);
        localStorage.setItem(`profile_${userId}`, JSON.stringify(nextProfile));
        setUser(prev => prev ? { ...prev, username: nextProfile.displayName || prev.username } : prev);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeIdentityGaiaID, activeIdentityDisplayName, userId, userName, setUser]);

  async function handleUnlockProfileKeys() {
    setProfileUnlockError('');
    if (!profilePasswordInput) return;
    try {
      const cachedEncrypted = localStorage.getItem('gaia_mnemonic_enc');
      if (!cachedEncrypted) throw new Error('Keine Mnemonic gefunden.');
      const encObj = safeJsonParse(cachedEncrypted, null);
      if (!encObj) throw new Error('Mnemonic cache corrupted.');
      const decMnemonic = await crypto.decryptMnemonic(encObj, profilePasswordInput);
      setMnemonic(decMnemonic);
      setAreKeysUnlocked(true);
      setProfilePasswordInput('');
    } catch (_) {
      setProfileUnlockError('Ungültiges Login-Passwort.');
    }
  }

  async function handleAvatarFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const sanitizedBase64 = await sanitizeAvatarFile(file);
      if (!activeIdentity) {
        setProfileAvatar(sanitizedBase64);
        return;
      }
      const sanitizedResponse = await fetch(sanitizedBase64);
      const cleanBlob = await sanitizedResponse.blob();
      const { encryptedBlob, keyHex, ivHex } = await crypto.encryptFileSymmetric(cleanBlob);
      const encryptedBuffer = await encryptedBlob.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encryptedBuffer);
      const fileHash = Array.from(new Uint8Array(hashBuffer)).map(value => value.toString(16).padStart(2, '0')).join('');
      const initRes = await api.initUpload(file.name, encryptedBlob.size, file.type || 'image/png', fileHash);
      const fileId = initRes.fileId;
      const chunkSize = 1024 * 1024;
      const totalChunks = Math.ceil(encryptedBlob.size / chunkSize);
      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, encryptedBlob.size);
        const chunkBlob = encryptedBlob.slice(start, end);
        const chunkBuffer = await chunkBlob.arrayBuffer();
        const chunkHashBuffer = await window.crypto.subtle.digest('SHA-256', chunkBuffer);
        const chunkHash = Array.from(new Uint8Array(chunkHashBuffer)).map(value => value.toString(16).padStart(2, '0')).join('');
        await api.uploadChunk(fileId, index, chunkHash, chunkBlob);
      }
      await api.completeUpload(fileId);
      setProfileAvatar(JSON.stringify({ fileId, keyHex, ivHex }));
      triggerAlert('Profilbild bereit', 'Profilbild wurde verschluesselt hochgeladen. Speichern veroeffentlicht nur den Cipherblob.');
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  async function saveProfile(e) {
    if (e) e.preventDefault();
    if (!user) return;
    const profileData = {
      displayName: profileDisplayName,
      realName: profileRealName,
      website: profileWebsite,
      bio: profileBio,
      avatar: profileAvatar
    };
    localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
    setUser({ ...user, username: profileDisplayName });
    if (activeIdentity) {
      const sharedAvatar = typeof profileAvatar === 'string' && profileAvatar.length <= 4096 && !profileAvatar.startsWith('data:image/')
        ? profileAvatar
        : '';
      await api.updateGsnProfile(
        activeIdentity.ID,
        profileDisplayName,
        profileBio,
        sharedAvatar,
        profileWebsite,
        profileRealName
      );
    }
    triggerAlert('Profil gespeichert', 'Dein GaiaCOM Profil wurde lokal und im Trust-Profil aktualisiert.');
  }

  function saveProfileData(profileData, options = {}) {
    if (!user) return;
    const nextProfile = {
      displayName: profileData.displayName || profileDisplayName || user.username || '',
      realName: profileData.realName ?? profileRealName,
      website: profileData.website ?? profileWebsite,
      bio: profileData.bio ?? profileBio,
      avatar: profileData.avatar || profileAvatar
    };
    setProfileDisplayName(nextProfile.displayName);
    setProfileRealName(nextProfile.realName);
    setProfileWebsite(nextProfile.website);
    setProfileBio(nextProfile.bio);
    setProfileAvatar(nextProfile.avatar);
    localStorage.setItem(`profile_${user.id}`, JSON.stringify(nextProfile));
    setUser({ ...user, username: nextProfile.displayName });
    if (!options.silent) {
      triggerAlert('Profil gespeichert', 'Dein dezentrales Benutzerprofil wurde lokal aktualisiert.');
    }
  }

  async function handleChangePassword(e) {
    if (e) e.preventDefault();
    setPasswordChangeError('');
    if (newPasswordInput.length < 12) {
      setPasswordChangeError('Das neue Passwort muss mindestens 12 Zeichen haben.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('Die neuen Passwoerter stimmen nicht ueberein.');
      return;
    }
    try {
      await api.changePassword(currentPasswordInput, newPasswordInput);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      triggerAlert('Passwort aktualisiert', 'Dein GaiaCOM Login-Passwort wurde geaendert.');
    } catch (err) {
      setPasswordChangeError(err.message || 'Passwort konnte nicht geaendert werden.');
    }
  }

  async function handleSetUnlockPin(pin, confirmPin) {
    if (!mnemonic) {
      throw new Error('Schluessel muessen entsperrt sein, bevor eine PIN gesetzt werden kann.');
    }
    const deviceCode = normalizeDeviceCode(pin);
    const confirmedDeviceCode = normalizeDeviceCode(confirmPin);
    if (deviceCode.length < DEVICE_CODE_MIN_LENGTH || deviceCode.length > DEVICE_CODE_MAX_LENGTH) {
      throw new Error(`Der Geraete-Code muss ${DEVICE_CODE_MIN_LENGTH} bis ${DEVICE_CODE_MAX_LENGTH} Zeichen lang sein.`);
    }
    if (hasWeakDeviceCodePattern(deviceCode)) {
      throw new Error('Dieser Geraete-Code ist zu leicht offline erratbar. Nutze eine laengere gemischte Zeichenfolge.');
    }
    if (deviceCode !== confirmedDeviceCode) {
      throw new Error('Die Geraete-Code-Bestaetigung stimmt nicht ueberein.');
    }
    const encrypted = await crypto.encryptMnemonic(mnemonic, deviceCode, PIN_KDF_ITERATIONS);
    encrypted.unlockPolicy = {
      type: 'device-code-v2',
      kdf: 'PBKDF2-SHA-256',
      iterations: PIN_KDF_ITERATIONS,
      minLength: DEVICE_CODE_MIN_LENGTH,
      maxLength: DEVICE_CODE_MAX_LENGTH,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('gaia_pin_mnemonic_enc', JSON.stringify(encrypted));
    setPinUnlockEnabled(true);
    triggerAlert('Geraete-Code aktiviert', 'GaiaCom kann auf diesem Geraet jetzt per lokalem Geraete-Code entsperrt werden.');
  }

  function handleRemoveUnlockPin() {
    localStorage.removeItem('gaia_pin_mnemonic_enc');
    setPinUnlockEnabled(false);
    triggerAlert('Geraete-Code entfernt', 'Lokale Geraete-Code-Entsperrung wurde fuer dieses Geraet deaktiviert.');
  }

  async function handleSetWebAuthnUnlock() {
    if (!hasWebAuthnSupport()) {
      throw new Error('WebAuthn ist auf diesem Geraet nicht verfuegbar.');
    }
    if (!mnemonic || !user?.id) {
      throw new Error('Schluessel muessen entsperrt sein, bevor WebAuthn aktiviert werden kann.');
    }
    const record = await createWebAuthnMnemonicEnvelope({
      userId: user.id,
      username: user.username,
      mnemonic
    });
    localStorage.setItem('gaia_webauthn_mnemonic_enc', JSON.stringify(record));
    setWebAuthnUnlockEnabled(true);
    triggerAlert('Geraete-Schluessel aktiviert', 'GaiaCOM kann auf diesem Geraet per WebAuthn PRF entsperrt werden.');
  }

  function handleRemoveWebAuthnUnlock() {
    localStorage.removeItem('gaia_webauthn_mnemonic_enc');
    setWebAuthnUnlockEnabled(false);
    triggerAlert('Geraete-Schluessel entfernt', 'WebAuthn-Entsperrung wurde fuer dieses Geraet deaktiviert.');
  }

  async function handleExportRecoveryBackup(recoveryPassword) {
    const backup = await buildRecoveryBackup({
      user,
      activeIdentity,
      mnemonic,
      profileDisplayName,
      profileAvatar,
      profileBio,
      password: recoveryPassword
    });
    downloadRecoveryFile(backup, profileDisplayName || user?.username || 'gaiacom');
  }

  async function handleImportRecoveryBackup(file, recoveryPassword, newLocalPassword) {
    if (!file) {
      throw new Error('Bitte Recovery-Datei auswaehlen.');
    }
    if (!newLocalPassword || newLocalPassword.length < 12) {
      throw new Error('Das neue lokale Passwort muss mindestens 12 Zeichen haben.');
    }
    const payload = await parseRecoveryBackup(await file.text(), recoveryPassword);
    const restoredKeys = crypto.deriveKeysFromMnemonic(payload.mnemonic);
    const encData = await crypto.encryptMnemonic(payload.mnemonic, newLocalPassword);
    localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(encData));
    localStorage.setItem('gaia_username', payload.user?.username || payload.profile?.displayName || 'Recovered User');

    setMnemonic(payload.mnemonic);
    setDerivedKeys(restoredKeys.keys);
    setUsernameInput(payload.user?.username || payload.profile?.displayName || '');
    setPasswordInput(newLocalPassword);

    if (user?.id && payload.profile) {
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(payload.profile));
      setProfileDisplayName(payload.profile.displayName || payload.user?.username || '');
      setProfileRealName(payload.profile.realName || '');
      setProfileWebsite(payload.profile.website || '');
      setProfileBio(payload.profile.bio || '');
      setProfileAvatar(payload.profile.avatar || '\u{1F916}');
      setUser({ ...user, username: payload.profile.displayName || payload.user?.username || user.username });
      writeCryptoSession({ ...user, username: payload.profile.displayName || payload.user?.username || user.username }, payload.mnemonic, cryptoSessionMinutes);
    }

    triggerAlert(
      'Recovery importiert',
      user?.id
        ? 'Deine lokale Schluesseldatei wurde mit dem neuen Passwort wiederhergestellt.'
        : 'Recovery wurde entschluesselt. Mnemonic und Nutzername sind im Login vorausgefuellt.',
      'success'
    );
  }

  async function handleDeleteAccount({ currentPassword, confirmation }) {
    if (!user) {
      throw new Error(t('delete_account_not_authenticated') || 'Kein aktiver Account.');
    }
    if (!currentPassword || confirmation !== 'DELETE') {
      throw new Error(t('delete_account_confirmation_error') || 'Passwort und DELETE-Bestaetigung sind erforderlich.');
    }

    await api.deleteAccount(currentPassword);

    [
      `active_identity_${user.id}`,
      `contacts_${user.id}`,
      `profile_${user.id}`,
      `gaia_read_msgs_${user.id}`,
      `gaia_message_meta_${user.id}`,
      `gaia_vault_${user.id}`
    ].forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem('gaia_crypto_session');
  }

  const handleUpdatePrivacySettings = useCallback(async (allowAnonymousStats) => {
    const result = await api.updatePrivacySettings(allowAnonymousStats);
    const nextAllow = result.allowAnonymousStats !== false;
    setUser(prev => prev ? { ...prev, allowAnonymousStats: nextAllow } : prev);
    triggerAlert(
      'Privacy updated',
      nextAllow
        ? 'Anonymous aggregate statistics are enabled for this account.'
        : 'Anonymous aggregate statistics are disabled for this account.',
      'success'
    );
  }, [setUser, triggerAlert]);

  return {
    // State
    profileDisplayName, setProfileDisplayName,
    profileRealName, setProfileRealName,
    profileWebsite, setProfileWebsite,
    profileBio, setProfileBio,
    profileAvatar, setProfileAvatar,
    currentPasswordInput, setCurrentPasswordInput,
    newPasswordInput, setNewPasswordInput,
    confirmPasswordInput, setConfirmPasswordInput,
    passwordChangeError,
    areKeysUnlocked, setAreKeysUnlocked,
    profilePasswordInput, setProfilePasswordInput,
    profileUnlockError,
    pinUnlockEnabled, setPinUnlockEnabled,
    webAuthnUnlockEnabled, setWebAuthnUnlockEnabled,
    cryptoSessionMinutes,
    setCryptoSessionMinutes,
    inactivityLockMinutes,
    setInactivityLockMinutes,
    // Actions
    handleUnlockProfileKeys,
    handleAvatarFileChange,
    saveProfile,
    saveProfileData,
    handleChangePassword,
    handleSetUnlockPin,
    handleRemoveUnlockPin,
    handleSetWebAuthnUnlock,
    handleRemoveWebAuthnUnlock,
    handleExportRecoveryBackup,
    handleImportRecoveryBackup,
    handleDeleteAccount,
    handleUpdatePrivacySettings
  };
}
