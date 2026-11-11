// GaiaAuth registration/pairing actions (moved verbatim from useGaiaAuth.js).
// Factory: receives the hook's state/setters as a context object each render.
import * as api from '../../api';
import * as crypto from '../../crypto';
import { displayGaiaID } from '../../utils/gaiaAddress';
import { safeJsonParse } from '../../utils/safeJson';
import {
  DEVICE_KEY_VAULT_KEY,
  SOVEREIGN_KEY_VAULT_KEY,
  createSovereignKeys,
  loadSovereignKeys,
  writeCryptoSession
} from './sessionHelpers';

export function createAuthActions(ctx) {
  const {
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
  } = ctx;

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
      triggerAlert('Identität bereit', `Die Adresse "${displayGaiaID(fullGaiaID)}" ist nun mit hybriden Post-Quanten-Schlüsseln registriert.`);
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

    // A hand-typed seed must be a valid BIP39 phrase (12 English words with a
    // correct checksum); otherwise key derivation throws a raw
    // "Ungültiges Mnemonic" later and the user has no actionable guidance.
    // Normalise whitespace/case first so a valid phrase typed with odd casing
    // keeps working.
    const normalizedMnemonic = String(mnemonic).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!crypto.validateMnemonic(normalizedMnemonic)) {
      setAuthError(
        'Die Mnemonic-Phrase ist ungültig. Nutze den Button „Seed generieren“ oder gib eine gültige 12-Wörter-BIP39-Phrase ein.'
      );
      return;
    }
    if (normalizedMnemonic !== mnemonic) {
      setMnemonic(normalizedMnemonic);
    }

    try {
      const keys = crypto.deriveKeysFromMnemonic(normalizedMnemonic);
      let hqc256;
      if (isRegister) {
        hqc256 = await createSovereignKeys(passwordInput);
      } else {
        hqc256 = await loadSovereignKeys(passwordInput);
      }
      if (hqc256) keys.keys.hqc256 = hqc256;

      if (isRegister) {
        const registerData = await api.register(usernameInput, passwordInput, keys.keys.sign.public);
        // Automatically login to retrieve session cookie
        await api.login(usernameInput, passwordInput);

        const encData = await crypto.encryptMnemonic(normalizedMnemonic, passwordInput);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(encData));
        localStorage.setItem('gaia_username', usernameInput);
        setTempUserId(registerData.user_id);
        setTempUsername(usernameInput);
        setTempAllowAnonymousStats(registerData.allowAnonymousStats !== false);
        setDerivedKeys(keys.keys);
        const nextUser = { id: registerData.user_id, username: usernameInput, allowAnonymousStats: registerData.allowAnonymousStats !== false };
        setUser(nextUser);
        await hydrateDeviceKeyVault(passwordInput);
        writeCryptoSession(nextUser, normalizedMnemonic, cryptoSessionMinutes, keys.keys.hqc256 || null);
        setCopiedMnemonic(false);
        setWizardStep(1);
        setWizardGaiaUsername(usernameInput.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32));
        setShowRegSuccessPopup(false);
        setShowWizard(true);
      } else {
        const loginData = await api.login(usernameInput, passwordInput);
        const encData = await crypto.encryptMnemonic(normalizedMnemonic, passwordInput);
        localStorage.setItem('gaia_mnemonic_enc', JSON.stringify(encData));
        localStorage.setItem('gaia_username', usernameInput);
        setDerivedKeys(keys.keys);
        const nextUser = { id: loginData.user_id, username: usernameInput, allowAnonymousStats: loginData.allowAnonymousStats !== false };
        setUser(nextUser);
        await hydrateDeviceKeyVault(passwordInput);
        writeCryptoSession(nextUser, normalizedMnemonic, cryptoSessionMinutes, keys.keys.hqc256 || null);
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

  return {
    hydrateDeviceKeyVault,
    handleWizardRegisterIdentity,
    handleGenerateMnemonic,
    handleAuthSubmit,
    startDevicePairing,
    completeDevicePairing,
    cancelDevicePairing
  };
}
