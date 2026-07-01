// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useState, useEffect } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { displayGaiaID } from '../utils/gaiaAddress';
import { safeJsonParse, safeStorageJson } from '../utils/safeJson';
import { decryptWebAuthnMnemonicEnvelope } from '../utils/webauthnPrf';

const CRYPTO_SESSION_KEY = 'gaia_crypto_session';
const PIN_UNLOCK_GUARD_KEY = 'gaia_pin_unlock_guard';
let volatileCryptoSession = null;

function readPinUnlockGuard() {
  const parsed = safeStorageJson(localStorage, PIN_UNLOCK_GUARD_KEY, {});
  return {
    failures: Number(parsed.failures) || 0,
    lockedUntil: Number(parsed.lockedUntil) || 0
  };
}

function writePinUnlockGuard(nextGuard) {
  localStorage.setItem(PIN_UNLOCK_GUARD_KEY, JSON.stringify({
    failures: Math.max(0, Number(nextGuard.failures) || 0),
    lockedUntil: Math.max(0, Number(nextGuard.lockedUntil) || 0)
  }));
}

function clearPinUnlockGuard() {
  localStorage.removeItem(PIN_UNLOCK_GUARD_KEY);
}

function recordPinUnlockFailure() {
  const guard = readPinUnlockGuard();
  const failures = guard.failures + 1;
  const lockMinutes = failures >= 10 ? 60 : failures >= 6 ? 10 : failures >= 3 ? 2 : 0;
  writePinUnlockGuard({
    failures,
    lockedUntil: lockMinutes > 0 ? Date.now() + lockMinutes * 60 * 1000 : 0
  });
}

function readCryptoSession(expectedUserId, enabledMinutes) {
  if (!enabledMinutes || enabledMinutes <= 0) {
    volatileCryptoSession = null;
    sessionStorage.removeItem(CRYPTO_SESSION_KEY);
    return null;
  }
  try {
    sessionStorage.removeItem(CRYPTO_SESSION_KEY);
    const parsed = volatileCryptoSession;
    if (!parsed || parsed.userId !== expectedUserId || !parsed.mnemonic || Number(parsed.expiresAt) <= Date.now()) {
      volatileCryptoSession = null;
      return null;
    }
    return parsed;
  } catch (_) {
    volatileCryptoSession = null;
    return null;
  }
}

function writeCryptoSession(userValue, mnemonicValue, enabledMinutes) {
  if (!userValue?.id || !mnemonicValue || !enabledMinutes || enabledMinutes <= 0) {
    volatileCryptoSession = null;
    sessionStorage.removeItem(CRYPTO_SESSION_KEY);
    return;
  }
  sessionStorage.removeItem(CRYPTO_SESSION_KEY);
  volatileCryptoSession = {
    userId: userValue.id,
    username: userValue.username || '',
    allowAnonymousStats: userValue.allowAnonymousStats !== false,
    mnemonic: mnemonicValue,
    expiresAt: Date.now() + enabledMinutes * 60 * 1000
  };
}

function clearCryptoSession() {
  volatileCryptoSession = null;
  sessionStorage.removeItem(CRYPTO_SESSION_KEY);
}

export default function useGaiaAuth({ triggerAlert, fetchIdentities, clearAllData, cryptoSessionMinutes = 0 }) {
  // Auth states
  const [user, setUser] = useState(null);
  const [mnemonic, setMnemonic] = useState('');
  const [derivedKeys, setDerivedKeys] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showRegSuccessPopup, setShowRegSuccessPopup] = useState(false);

  // PBKDF2 Unlock States
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [tempUserId, setTempUserId] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [tempAllowAnonymousStats, setTempAllowAnonymousStats] = useState(true);

  // Setup Wizard States
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [wizardGaiaUsername, setWizardGaiaUsername] = useState('');
  const [wizardDomain, setWizardDomain] = useState('gaiacom.de');
  const [wizardCustomDomain, setWizardCustomDomain] = useState('');
  const [wizardFallbackNodes, setWizardFallbackNodes] = useState('backup.gaiacom.de');
  const [wizardError, setWizardError] = useState('');
  const [availableNodes, setAvailableNodes] = useState(['gaiacom.de']);

  // Server metadata state
  const [serverVersion, setServerVersion] = useState('GaiaCom Beta v2');
  const [serverConsensus, setServerConsensus] = useState('gaiacom.v1');

  // Request notification permission
  useEffect(() => {
    if (user && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [user]);

  // --- Fetch Server Version ---
  useEffect(() => {
    async function loadVersion() {
      try {
        const res = await api.getServerVersion();
        if (res && res.version) {
          setServerVersion(res.version);
          setServerConsensus(res.consensus || 'gaiacom.v1');
        }
      } catch (_) {}
    }
    loadVersion();
  }, []);

  // --- Initial Check and Data Hydration ---
  useEffect(() => {
    async function checkAuth() {
      const statusRes = await api.getStatus();
      if (statusRes.status === 'authenticated') {
        const cryptoSession = readCryptoSession(statusRes.user_id, cryptoSessionMinutes);
        if (cryptoSession) {
          const keys = crypto.deriveKeysFromMnemonic(cryptoSession.mnemonic);
          setMnemonic(cryptoSession.mnemonic);
          setDerivedKeys(keys.keys);
          setUser({
            id: statusRes.user_id,
            username: cryptoSession.username || statusRes.username || localStorage.getItem('gaia_username') || 'User',
            allowAnonymousStats: statusRes.allowAnonymousStats !== false
          });
          setIsLocked(false);
          return;
        }

        const cachedEncrypted = localStorage.getItem('gaia_mnemonic_enc');
        if (cachedEncrypted) {
          setTempUserId(statusRes.user_id);
          setTempUsername(statusRes.username || localStorage.getItem('gaia_username') || 'User');
          setTempAllowAnonymousStats(statusRes.allowAnonymousStats !== false);
          setIsLocked(true);
        } else {
          handleLogout();
        }
      }
    }
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch known nodes when wizard opens
  useEffect(() => {
    if (showWizard) {
      async function loadNodes() {
        try {
          const res = await api.getNodes();
          if (res && res.nodes) {
            // Filter out localhost / dev-only nodes so they never appear in production UI
            const productionNodes = res.nodes.filter(
              n => n && !n.startsWith('localhost') && !n.match(/^127\./) && !n.match(/:\d+$/)
            );
            const nodes = productionNodes.length > 0 ? productionNodes : ['gaiacom.de'];
            setAvailableNodes(nodes);
            if (!nodes.includes(wizardDomain)) {
              setWizardDomain(nodes[0]);
            }
          }
        } catch (_) {}
      }
      loadNodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWizard]);

  // --- Setup Wizard: Identity Registration ---
  async function handleWizardRegisterIdentity() {
    setWizardError('');
    if (!wizardGaiaUsername || !derivedKeys) {
      setWizardError('Bitte wÃƒÂ¤hle eine gÃƒÂ¼ltige Adresse.');
      return;
    }

    try {
      const domain = wizardDomain === 'custom' ? wizardCustomDomain : wizardDomain;
      if (!domain) {
        setWizardError('Domain ist erforderlich.');
        return;
      }
      
      const fullGaiaID = `@${wizardGaiaUsername}:${domain}`;
      const displayName = wizardGaiaUsername.charAt(0).toUpperCase() + wizardGaiaUsername.slice(1);

      const publicRecord = {
        public_keys: {
          identity: derivedKeys.sign.public,
          box: derivedKeys.box.public,
          pke: derivedKeys.pke.public,
          mldsa87: derivedKeys.mldsa87?.public || ''
        },
        routing: {
          primary: domain,
          alternatives: wizardFallbackNodes.split(',').map(n => n.trim()).filter(n => n !== '')
        },
        language: localStorage.getItem('gaiacom_language') || 'de'
      };

      try {
        await api.createIdentity(fullGaiaID, displayName, publicRecord);
      } catch (identityErr) {
        if (!String(identityErr?.message || '').toLowerCase().includes('unauthorized') || !usernameInput || !passwordInput) {
          throw identityErr;
        }
        await api.login(usernameInput, passwordInput);
        await api.createIdentity(fullGaiaID, displayName, publicRecord);
      }

      const activeUserId = user?.id || tempUserId;
      if (activeUserId) {
        localStorage.setItem(`gaia_integrated_onboarding_done_${activeUserId}`, 'done');
      }
      setWizardStep(4);
      triggerAlert('IdentitÃƒÂ¤t bereit', `Die Adresse "${displayGaiaID(fullGaiaID)}" ist nun quantensicher registriert.`);
      await fetchIdentities();
    } catch (err) {
      setWizardError(err.message);
    }
  }

  function handleGenerateMnemonic() {
    const fresh = crypto.generateMnemonic();
    setMnemonic(fresh);
    const keys = crypto.deriveKeysFromMnemonic(fresh);
    setDerivedKeys(keys.keys);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');

    if (!usernameInput || !passwordInput || !mnemonic) {
      setAuthError('Benutzername, Passwort und Mnemonic-Phrase sind erforderlich.');
      return;
    }

    try {
      const keys = crypto.deriveKeysFromMnemonic(mnemonic);

      if (isRegister) {
        const registerData = await api.register(usernameInput, passwordInput, keys.keys.sign.public);
        // Automatically login to retrieve session cookie
        await api.login(usernameInput, passwordInput);
        
        const encData = await crypto.encryptMnemonic(mnemonic, passwordInput);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(encData));
        localStorage.setItem('gaia_username', usernameInput);
        setTempUserId(registerData.user_id);
        setTempUsername(usernameInput);
        setTempAllowAnonymousStats(registerData.allowAnonymousStats !== false);
        setDerivedKeys(keys.keys);
        const nextUser = { id: registerData.user_id, username: usernameInput, allowAnonymousStats: registerData.allowAnonymousStats !== false };
        setUser(nextUser);
        writeCryptoSession(nextUser, mnemonic, cryptoSessionMinutes);
        setCopiedMnemonic(false);
        setWizardStep(1);
        setWizardGaiaUsername(usernameInput.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32));
        setShowRegSuccessPopup(false);
        setShowWizard(true);
      } else {
        const loginData = await api.login(usernameInput, passwordInput);
        const encData = await crypto.encryptMnemonic(mnemonic, passwordInput);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(encData));
        localStorage.setItem('gaia_username', usernameInput);
        setDerivedKeys(keys.keys);
        const nextUser = { id: loginData.user_id, username: usernameInput, allowAnonymousStats: loginData.allowAnonymousStats !== false };
        setUser(nextUser);
        writeCryptoSession(nextUser, mnemonic, cryptoSessionMinutes);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleUnlock(e, unlockMode = 'password') {
    if (e) e.preventDefault();
    setUnlockError('');
    if (unlockMode === 'pin') {
      const guard = readPinUnlockGuard();
      if (guard.lockedUntil > Date.now()) {
        const seconds = Math.ceil((guard.lockedUntil - Date.now()) / 1000);
        setUnlockError(`PIN-Entsperrung ist nach zu vielen Fehlversuchen noch ${seconds} Sekunden gesperrt.`);
        return;
      }
    }
    const cachedEncrypted = unlockMode === 'pin'
      ? localStorage.getItem('gaia_pin_mnemonic_enc')
      : unlockMode === 'webauthn'
        ? localStorage.getItem('gaia_webauthn_mnemonic_enc')
        : localStorage.getItem('gaia_mnemonic_enc');
    if (!cachedEncrypted) {
      setUnlockError('Kein verschlÃƒÂ¼sselter SchlÃƒÂ¼ssel gefunden.');
      return;
    }
    try {
      const encObj = safeJsonParse(cachedEncrypted, null);
      if (!encObj) {
        throw new Error('Encrypted mnemonic cache corrupted.');
      }
      const decMnemonic = unlockMode === 'webauthn'
        ? await decryptWebAuthnMnemonicEnvelope(encObj)
        : await crypto.decryptMnemonic(encObj, unlockPassword);
      
      if (unlockMode === 'password' && (!encObj.kdfParams || encObj.kdfParams.version < 2)) {
        const newEncObj = await crypto.encryptMnemonic(decMnemonic, unlockPassword);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(newEncObj));
      }

      const keys = crypto.deriveKeysFromMnemonic(decMnemonic);
      setMnemonic(decMnemonic);
      setDerivedKeys(keys.keys);
      const nextUser = { id: tempUserId, username: tempUsername, allowAnonymousStats: tempAllowAnonymousStats };
      setUser(nextUser);
      writeCryptoSession(nextUser, decMnemonic, cryptoSessionMinutes);
      setIsLocked(false);
      setUnlockPassword('');
      if (unlockMode === 'pin') {
        clearPinUnlockGuard();
      }
    } catch (err) {
      if (unlockMode === 'pin') {
        recordPinUnlockFailure();
      }
      setUnlockError('Ungueltiges Passwort oder Entschluesselungsfehler.');
    }
  }

  function handleLogout() {
    api.setAuthToken('');
    clearCryptoSession();
    localStorage.removeItem('gaia_mnemonic');
    localStorage.removeItem('gaia_mnemonic_enc');
    localStorage.removeItem('gaia_pin_mnemonic_enc');
    localStorage.removeItem('gaia_webauthn_mnemonic_enc');
    clearPinUnlockGuard();
    localStorage.removeItem('gaia_username');
    setUser(null);
    setMnemonic('');
    setDerivedKeys(null);
    setIsLocked(false);
    clearAllData();
  }

  function handleLock() {
    if (!user) return;
    clearCryptoSession();
    setMnemonic('');
    setDerivedKeys(null);
    setTempUserId(user.id);
    setTempUsername(user.username);
    setTempAllowAnonymousStats(user.allowAnonymousStats !== false);
    setIsLocked(true);
  }

  return {
    user, setUser,
    mnemonic, setMnemonic,
    derivedKeys, setDerivedKeys,
    isRegister, setIsRegister,
    usernameInput, setUsernameInput,
    passwordInput, setPasswordInput,
    authError, setAuthError,
    showRegSuccessPopup, setShowRegSuccessPopup,
    isLocked, setIsLocked,
    unlockPassword, setUnlockPassword,
    unlockError, setUnlockError,
    tempUserId, setTempUserId,
    tempUsername, setTempUsername,
    showWizard, setShowWizard,
    wizardStep, setWizardStep,
    copiedMnemonic, setCopiedMnemonic,
    wizardGaiaUsername, setWizardGaiaUsername,
    wizardDomain, setWizardDomain,
    wizardCustomDomain, setWizardCustomDomain,
    wizardFallbackNodes, setWizardFallbackNodes,
    wizardError, setWizardError,
    availableNodes, setAvailableNodes,
    serverVersion, setServerVersion,
    serverConsensus, setServerConsensus,
    handleWizardRegisterIdentity,
    handleGenerateMnemonic,
    handleAuthSubmit,
    handleUnlock,
    handleLogout,
    handleLock,
    writeCryptoSession
  };
}
