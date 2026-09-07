import { useState, useEffect } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { generateHqc256KeyPair } from '../sovereignCrypto.js';
import { displayGaiaID } from '../utils/gaiaAddress';
import { safeJsonParse, safeStorageJson } from '../utils/safeJson';
import { decryptWebAuthnMnemonicEnvelope } from '../utils/webauthnPrf';
import { reconcileSovereignKeyset } from '../sovereignKeyMigration.js';

const CRYPTO_SESSION_KEY = 'gaia_crypto_session';
const PIN_UNLOCK_GUARD_KEY = 'gaia_pin_unlock_guard';
const DEVICE_KEY_VAULT_KEY = 'gaia_device_key_vault_enc';
const SOVEREIGN_KEY_VAULT_KEY = 'gaiacom_sovereign_hqc256_v1_enc';
const SOVEREIGN_KEY_PENDING_VAULT_KEY = 'gaiacom_sovereign_hqc256_v1_pending_enc';
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

function writeCryptoSession(userValue, mnemonicValue, enabledMinutes, hqc256 = null) {
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
    hqc256,
    expiresAt: Date.now() + enabledMinutes * 60 * 1000
  };
}

function clearCryptoSession() {
  volatileCryptoSession = null;
  sessionStorage.removeItem(CRYPTO_SESSION_KEY);
}

async function decodeSovereignKeys(raw, password) {
  if (!raw) return null;
  const record = await crypto.decryptLocalRecord(safeJsonParse(raw, null), password);
  if (record?.version !== 1 || typeof record?.public !== 'string' || typeof record?.private !== 'string' || record.public.length < 1024 || record.private.length < 1024) {
    throw new Error('Lokaler HQC-256 Keyvault wurde verworfen.');
  }
  return { public: record.public, private: record.private };
}

async function loadSovereignKeyState(password) {
  const committed = localStorage.getItem(SOVEREIGN_KEY_VAULT_KEY);
  if (committed) return { keys: await decodeSovereignKeys(committed, password), pending: false };
  const pending = localStorage.getItem(SOVEREIGN_KEY_PENDING_VAULT_KEY);
  if (pending) return { keys: await decodeSovereignKeys(pending, password), pending: true };
  return { keys: null, pending: false };
}

async function loadSovereignKeys(password) {
  return (await loadSovereignKeyState(password)).keys;
}

async function persistSovereignKeys(storageKey, password, hqc256) {
  const envelope = await crypto.encryptLocalRecord({ version: 1, ...hqc256 }, password);
  localStorage.setItem(storageKey, JSON.stringify(envelope));
  return hqc256;
}

async function createSovereignKeys(password) {
  const generated = await generateHqc256KeyPair();
  const hqc256 = { public: generated.publicKeyHex, private: generated.secretKeyHex };
  return persistSovereignKeys(SOVEREIGN_KEY_VAULT_KEY, password, hqc256);
}

async function createPendingSovereignKeys(password) {
  const generated = await generateHqc256KeyPair();
  const hqc256 = { public: generated.publicKeyHex, private: generated.secretKeyHex };
  return persistSovereignKeys(SOVEREIGN_KEY_PENDING_VAULT_KEY, password, hqc256);
}

function commitPendingSovereignKeys() {
  const pending = localStorage.getItem(SOVEREIGN_KEY_PENDING_VAULT_KEY);
  if (pending) {
    localStorage.setItem(SOVEREIGN_KEY_VAULT_KEY, pending);
    localStorage.removeItem(SOVEREIGN_KEY_PENDING_VAULT_KEY);
  }
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
  const [devicePairing, setDevicePairing] = useState(null);
  const [devicePairingError, setDevicePairingError] = useState('');
  const [deviceKeyVault, setDeviceKeyVault] = useState(null);

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
          if (cryptoSession.hqc256) keys.keys.hqc256 = cryptoSession.hqc256;
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
      setWizardError('Bitte wähle eine gültige Adresse.');
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

      const publicKeys = {
        identity: derivedKeys.sign.public,
        box: derivedKeys.box.public,
        pke: derivedKeys.pke.public,
        mldsa87: derivedKeys.mldsa87?.public || '',
        hqc256: derivedKeys.hqc256?.public || ''
      };
      const publicRecord = {
        public_keys: publicKeys,
        keyset_proof: crypto.createSovereignKeysetProof(publicKeys, derivedKeys.sign.private),
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
      triggerAlert('Identität bereit', `Die Adresse "${displayGaiaID(fullGaiaID)}" ist nun quantensicher registriert.`);
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

  async function hydrateDeviceKeyVault(password) {
    const raw = localStorage.getItem(DEVICE_KEY_VAULT_KEY);
    if (!raw) { setDeviceKeyVault(null); return; }
    try {
      const record = await crypto.decryptLocalRecord(safeJsonParse(raw, null), password);
      if (!record?.deviceKeyId || !record?.privateKeys?.box || !record?.privateKeys?.pke || !record?.privateKeys?.sign) {
        throw new Error('invalid device key vault');
      }
      setDeviceKeyVault(record);
    } catch (_) {
      // The account is recoverable via its mnemonic even if an optional
      // per-device key record is unavailable; never retain unverified keys.
      setDeviceKeyVault(null);
    }
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
        keys.keys.hqc256 = await createSovereignKeys(passwordInput);
      }

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
        await hydrateDeviceKeyVault(passwordInput);
        writeCryptoSession(nextUser, mnemonic, cryptoSessionMinutes, keys.keys.hqc256 || null);
        setCopiedMnemonic(false);
        setWizardStep(1);
        setWizardGaiaUsername(usernameInput.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32));
        setShowRegSuccessPopup(false);
        setShowWizard(true);
      } else {
        const loginData = await api.login(usernameInput, passwordInput);
        const keyState = await loadSovereignKeyState(passwordInput);
        const reconciled = await reconcileSovereignKeyset({
          identities: await api.getMyIdentities(),
          derivedKeys: keys.keys,
          localHqc: keyState.keys,
          generatePendingHqc: () => createPendingSovereignKeys(passwordInput),
          migrateIdentity: api.migrateSovereignKeyset,
          createProof: crypto.createSovereignKeysetProof,
          verifyProof: crypto.verifySovereignKeysetProof
        });
        keys.keys.hqc256 = reconciled.hqc;
        if (keyState.pending || reconciled.generated) commitPendingSovereignKeys();
        const encData = await crypto.encryptMnemonic(mnemonic, passwordInput);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(encData));
        localStorage.setItem('gaia_username', usernameInput);
        setDerivedKeys(keys.keys);
        const nextUser = { id: loginData.user_id, username: usernameInput, allowAnonymousStats: loginData.allowAnonymousStats !== false };
        setUser(nextUser);
        await hydrateDeviceKeyVault(passwordInput);
        writeCryptoSession(nextUser, mnemonic, cryptoSessionMinutes, keys.keys.hqc256 || null);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function startDevicePairing(deviceLabel) {
    setDevicePairingError('');
    if (!usernameInput || !passwordInput || !deviceLabel?.trim()) {
      setDevicePairingError('Kontoname, Passwort und Geraetename sind erforderlich.');
      return;
    }
    try {
      const loginData = await api.login(usernameInput, passwordInput);
      const identities = await api.getMyIdentities();
      const identity = Array.isArray(identities) ? identities[0] : null;
      if (!identity?.ID) throw new Error('Keine Gaia-Identitaet fuer die Kopplung gefunden.');
      const keyMaterial = crypto.generateDevicePairingKeys();
      const started = await api.startDevicePairing(identity.ID, deviceLabel.trim(), keyMaterial.publicKeys.box, keyMaterial.publicKeys.pke, keyMaterial.publicKeys.sign);
      if (!started?.pairing?.id || !started?.secret) throw new Error('Pairing-Antwort unvollstaendig.');
      setDevicePairing({
        pairing: started.pairing,
        secret: started.secret,
        privateKeys: keyMaterial.privateKeys,
        password: passwordInput,
        login: loginData
      });
    } catch (error) {
      api.setAuthToken('');
      setDevicePairingError(error.message || 'Geraet konnte nicht zur Kopplung angemeldet werden.');
    }
  }

  async function completeDevicePairing() {
    if (!devicePairing) return;
    setDevicePairingError('');
    try {
      const pairing = await api.getDevicePairing(devicePairing.pairing.id, devicePairing.secret);
      if (pairing?.status !== 'approved' || !pairing?.encryptedPayload) {
        throw new Error('Warte auf die Freigabe durch ein bestehendes Geraet.');
      }
      const handover = await crypto.decryptDevicePairingPayload(pairing.encryptedPayload, pairing, devicePairing.privateKeys);
      const consumed = await api.consumeDevicePairing(pairing.id, devicePairing.secret);
      if (!consumed?.deviceKey?.id) throw new Error('Geraeteschluessel wurde nicht registriert.');
      const keys = crypto.deriveKeysFromMnemonic(handover.mnemonic);
      if (!handover.sovereignKeys?.public || !handover.sovereignKeys?.private) throw new Error('Pairing-Paket enthält keinen HQC-256 Keyvault.');
      keys.keys.hqc256 = handover.sovereignKeys;
      const sovereignEnvelope = await crypto.encryptLocalRecord({ version: 1, ...handover.sovereignKeys }, devicePairing.password);
      const localEnvelope = await crypto.encryptMnemonic(handover.mnemonic, devicePairing.password);
      const deviceKeyVault = await crypto.encryptLocalRecord({
        version: 1,
        deviceKeyId: consumed.deviceKey.id,
        identityId: handover.identityId,
        privateKeys: devicePairing.privateKeys,
        publicKeys: devicePairing.pairing ? {
          box: devicePairing.pairing.deviceBoxPublic,
          pke: devicePairing.pairing.deviceKemPublic,
          sign: devicePairing.pairing.deviceSignPublic
        } : {}
      }, devicePairing.password);
      localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(localEnvelope));
      localStorage.setItem(DEVICE_KEY_VAULT_KEY, JSON.stringify(deviceKeyVault));
      localStorage.setItem(SOVEREIGN_KEY_VAULT_KEY, JSON.stringify(sovereignEnvelope));
      localStorage.setItem('gaia_username', usernameInput);
      const nextUser = {
        id: devicePairing.login.user_id,
        username: usernameInput,
        allowAnonymousStats: devicePairing.login.allowAnonymousStats !== false
      };
      setMnemonic(handover.mnemonic);
      setDerivedKeys(keys.keys);
      setUser(nextUser);
      writeCryptoSession(nextUser, handover.mnemonic, cryptoSessionMinutes, keys.keys.hqc256);
      setDevicePairing(null);
      setDeviceKeyVault({
        version: 1,
        deviceKeyId: consumed.deviceKey.id,
        identityId: handover.identityId,
        privateKeys: devicePairing.privateKeys,
        publicKeys: devicePairing.pairing ? {
          box: devicePairing.pairing.deviceBoxPublic,
          pke: devicePairing.pairing.deviceKemPublic,
          sign: devicePairing.pairing.deviceSignPublic
        } : {}
      });
    } catch (error) {
      setDevicePairingError(error.message || 'Geraetekopplung fehlgeschlagen.');
    }
  }

  function cancelDevicePairing() {
    setDevicePairing(null);
    setDevicePairingError('');
    api.setAuthToken('');
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
      setUnlockError('Kein verschlüsselter Schlüssel gefunden.');
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
      if (unlockMode === 'password') {
        const keyState = await loadSovereignKeyState(unlockPassword);
        const reconciled = await reconcileSovereignKeyset({
          identities: await api.getMyIdentities(),
          derivedKeys: keys.keys,
          localHqc: keyState.keys,
          generatePendingHqc: () => createPendingSovereignKeys(unlockPassword),
          migrateIdentity: api.migrateSovereignKeyset,
          createProof: crypto.createSovereignKeysetProof,
          verifyProof: crypto.verifySovereignKeysetProof
        });
        keys.keys.hqc256 = reconciled.hqc;
        if (keyState.pending || reconciled.generated) commitPendingSovereignKeys();
      }
      setMnemonic(decMnemonic);
      setDerivedKeys(keys.keys);
      const nextUser = { id: tempUserId, username: tempUsername, allowAnonymousStats: tempAllowAnonymousStats };
      setUser(nextUser);
      if (unlockMode === 'password') {
        await hydrateDeviceKeyVault(unlockPassword);
      } else {
        setDeviceKeyVault(null);
      }
      writeCryptoSession(nextUser, decMnemonic, cryptoSessionMinutes, keys.keys.hqc256 || null);
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

  async function handleLogout() {
    try { await api.logout(); } catch (_) { api.setAuthToken(''); }
    clearCryptoSession();
    localStorage.removeItem('gaia_mnemonic');
    localStorage.removeItem('gaia_mnemonic_enc');
    localStorage.removeItem('gaia_pin_mnemonic_enc');
    localStorage.removeItem('gaia_webauthn_mnemonic_enc');
    localStorage.removeItem(DEVICE_KEY_VAULT_KEY);
    // The encrypted identity HQC key survives logout; only explicit device data destruction may remove it.
    clearPinUnlockGuard();
    localStorage.removeItem('gaia_username');
    setUser(null);
    setMnemonic('');
    setDerivedKeys(null);
    setDeviceKeyVault(null);
    setIsLocked(false);
    clearAllData();
  }

  function handleLock() {
    if (!user) return;
    clearCryptoSession();
    setMnemonic('');
    setDerivedKeys(null);
    setDeviceKeyVault(null);
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
    devicePairing, devicePairingError,
    deviceKeyVault, setDeviceKeyVault,
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
    startDevicePairing,
    completeDevicePairing,
    cancelDevicePairing,
    handleUnlock,
    handleLogout,
    handleLock,
    writeCryptoSession
  };
}
