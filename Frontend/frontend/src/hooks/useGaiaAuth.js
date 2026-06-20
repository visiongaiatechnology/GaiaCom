import { useState, useEffect } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { displayGaiaID } from '../utils/gaiaAddress';

export default function useGaiaAuth({ triggerAlert, fetchIdentities, clearAllData }) {
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
        const cachedEncrypted = localStorage.getItem('gaia_mnemonic_enc');
        if (cachedEncrypted) {
          setTempUserId(statusRes.user_id);
          setTempUsername(localStorage.getItem('gaia_username') || 'User');
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
            setAvailableNodes(res.nodes);
            if (res.nodes.length > 0 && !res.nodes.includes(wizardDomain)) {
              setWizardDomain(res.nodes[0]);
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

      const publicRecord = {
        public_keys: {
          identity: derivedKeys.sign.public,
          box: derivedKeys.box.public,
          pke: derivedKeys.pke.public
        },
        routing: {
          primary: domain,
          alternatives: wizardFallbackNodes.split(',').map(n => n.trim()).filter(n => n !== '')
        }
      };

      await api.createIdentity(fullGaiaID, displayName, publicRecord);

      setShowWizard(false);
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
        await api.register(usernameInput, passwordInput, keys.keys.sign.public);
        const encData = await crypto.encryptMnemonic(mnemonic, passwordInput);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(encData));
        localStorage.setItem('gaia_username', usernameInput);
        setDerivedKeys(keys.keys);
        setShowRegSuccessPopup(true);
      } else {
        const loginData = await api.login(usernameInput, passwordInput);
        const encData = await crypto.encryptMnemonic(mnemonic, passwordInput);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(encData));
        localStorage.setItem('gaia_username', usernameInput);
        setDerivedKeys(keys.keys);
        setUser({ id: loginData.user_id, username: usernameInput });
      }
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleUnlock(e) {
    if (e) e.preventDefault();
    setUnlockError('');
    const cachedEncrypted = localStorage.getItem('gaia_mnemonic_enc');
    if (!cachedEncrypted) {
      setUnlockError('Kein verschlüsselter Schlüssel gefunden.');
      return;
    }
    try {
      const encObj = JSON.parse(cachedEncrypted);
      const decMnemonic = await crypto.decryptMnemonic(encObj, unlockPassword);
      
      if (!encObj.kdfParams || encObj.kdfParams.version < 2) {
        const newEncObj = await crypto.encryptMnemonic(decMnemonic, unlockPassword);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(newEncObj));
      }

      const keys = crypto.deriveKeysFromMnemonic(decMnemonic);
      setMnemonic(decMnemonic);
      setDerivedKeys(keys.keys);
      setUser({ id: tempUserId, username: tempUsername });
      setIsLocked(false);
      setUnlockPassword('');
    } catch (err) {
      setUnlockError('Ungültiges Passwort oder Entschlüsselungsfehler.');
    }
  }

  function handleLogout() {
    api.setAuthToken('');
    localStorage.removeItem('gaia_mnemonic');
    localStorage.removeItem('gaia_mnemonic_enc');
    localStorage.removeItem('gaia_username');
    setUser(null);
    setMnemonic('');
    setDerivedKeys(null);
    setIsLocked(false);
    clearAllData();
  }

  function handleLock() {
    if (!user) return;
    setMnemonic('');
    setDerivedKeys(null);
    setTempUserId(user.id);
    setTempUsername(user.username);
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
    handleLock
  };
}
