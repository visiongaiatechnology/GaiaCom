// GaiaAuth unlock/lock/logout actions (moved verbatim from useGaiaAuth.js).
// Factory: receives the hook's state/setters as a context object each render.
import * as api from '../../api';
import { isSessionInvalidated } from '../../api/client';
import * as crypto from '../../crypto';
import { decryptWebAuthnMnemonicEnvelope } from '../../utils/webauthnPrf';
import { safeJsonParse } from '../../utils/safeJson';
import {
  DEVICE_KEY_VAULT_KEY,
  clearCryptoSession,
  clearPinUnlockGuard,
  loadSovereignKeys,
  readPinUnlockGuard,
  recordPinUnlockFailure,
  writeCryptoSession
} from './sessionHelpers';

export function createSessionActions(ctx) {
  const {
    user,
    tempUserId,
    tempUsername,
    tempAllowAnonymousStats,
    unlockPassword,
    cryptoSessionMinutes,
    hydrateDeviceKeyVault,
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
  } = ctx;

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
        const hqc256 = await loadSovereignKeys(unlockPassword);
        if (hqc256) keys.keys.hqc256 = hqc256;
      }

      // SEC-FE FE-07 / FIND-032: a local unlock must not produce a false
      // authenticated UI when the server session has explicitly ended. The
      // status call can rotate/refresh the session; if the refresh was rejected
      // the client records an invalid-session event (see api/client.js) and we
      // fail closed with a visible reason. Transport failures/offline keep the
      // local-first unlock working — the next protected request surfaces expiry.
      try {
        await api.getStatus();
      } catch (_) {}
      if (isSessionInvalidated()) {
        setUnlockError('Sitzung abgelaufen — bitte erneut anmelden.');
        return;
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

  return { handleUnlock, handleLogout, handleLock };
}
