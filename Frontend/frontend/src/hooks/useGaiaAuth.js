// useGaiaAuth — fixed-order orchestrator.
// State hooks and effects stay in this file in their original order; the
// non-hook action/handler closures live in ./gaiaAuth/* and are created below.
// Behaviour, storage keys, API calls and the returned object are unchanged.
import { useState, useEffect } from 'react';
import * as api from '../api';
import { onSessionInvalid } from '../api/client';
import * as crypto from '../crypto';
import { clearCryptoSession, readCryptoSession, writeCryptoSession } from './gaiaAuth/sessionHelpers';
import { createAuthActions } from './gaiaAuth/authActions';
import { createSessionActions } from './gaiaAuth/sessionActions';

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
  const [serverVersion, setServerVersion] = useState('GaiaCom 3 · 3.0.2');
  const [serverConsensus, setServerConsensus] = useState('gaiacom.v3');

  const authActions = createAuthActions({
    user,
    mnemonic,
    derivedKeys,
    isRegister,
    usernameInput,
    passwordInput,
    wizardGaiaUsername,
    wizardDomain,
    wizardCustomDomain,
    wizardFallbackNodes,
    tempUserId,
    devicePairing,
    triggerAlert,
    fetchIdentities,
    cryptoSessionMinutes,
    setWizardError,
    setWizardStep,
    setMnemonic,
    setDerivedKeys,
    setAuthError,
    setTempUserId,
    setTempUsername,
    setTempAllowAnonymousStats,
    setUser,
    setCopiedMnemonic,
    setWizardGaiaUsername,
    setShowRegSuccessPopup,
    setShowWizard,
    setDevicePairing,
    setDevicePairingError,
    setDeviceKeyVault
  });

  const sessionActions = createSessionActions({
    user,
    tempUserId,
    tempUsername,
    tempAllowAnonymousStats,
    unlockPassword,
    cryptoSessionMinutes,
    hydrateDeviceKeyVault: authActions.hydrateDeviceKeyVault,
    clearAllData,
    setUnlockError,
    setIsLocked,
    setUnlockPassword,
    setMnemonic,
    setDerivedKeys,
    setUser,
    setDeviceKeyVault,
    setTempUserId,
    setTempUsername,
    setTempAllowAnonymousStats
  });

  const { handleLogout } = sessionActions;

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
          setServerConsensus(res.protocol_version || res.consensus || 'gaiacom.v3');
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

  // SEC-FE FE-07 / FIND-032: react to an explicit session-invalid signal from the
  // API client. Clear the local auth/key state, surface a visible reason and let
  // App route back to the auth screen (user=null). Never keep a stale
  // authenticated UI after a rejected refresh.
  useEffect(() => {
    const unsubscribe = onSessionInvalid((detail) => {
      const reason = detail?.message || 'Sitzung abgelaufen — bitte erneut anmelden.';
      clearCryptoSession();
      setMnemonic('');
      setDerivedKeys(null);
      setDeviceKeyVault(null);
      setUser(null);
      setIsLocked(false);
      setUnlockPassword('');
      setUnlockError(reason);
      setAuthError(reason);
      if (typeof clearAllData === 'function') clearAllData();
    });
    return unsubscribe;
  }, [clearAllData]);

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
    handleWizardRegisterIdentity: authActions.handleWizardRegisterIdentity,
    handleGenerateMnemonic: authActions.handleGenerateMnemonic,
    handleAuthSubmit: authActions.handleAuthSubmit,
    startDevicePairing: authActions.startDevicePairing,
    completeDevicePairing: authActions.completeDevicePairing,
    cancelDevicePairing: authActions.cancelDevicePairing,
    handleUnlock: sessionActions.handleUnlock,
    handleLogout: sessionActions.handleLogout,
    handleLock: sessionActions.handleLock,
    writeCryptoSession
  };
}