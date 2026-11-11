// GaiaAuth session/persistence helpers (moved verbatim from useGaiaAuth.js).
// Owns the encrypted-session memo, PIN unlock guard and local HQC key vault I/O.
import * as crypto from '../../crypto';
import { generateHqc256KeyPair } from '../../sovereignCrypto.js';
import { safeJsonParse, safeStorageJson } from '../../utils/safeJson';

export const CRYPTO_SESSION_KEY = 'gaia_crypto_session';
export const PIN_UNLOCK_GUARD_KEY = 'gaia_pin_unlock_guard';
export const DEVICE_KEY_VAULT_KEY = 'gaia_device_key_vault_enc';
export const SOVEREIGN_KEY_VAULT_KEY = 'gaiacom_sovereign_hqc256_v1_enc';
let volatileCryptoSession = null;

export function readPinUnlockGuard() {
  const parsed = safeStorageJson(localStorage, PIN_UNLOCK_GUARD_KEY, {});
  return {
    failures: Number(parsed.failures) || 0,
    lockedUntil: Number(parsed.lockedUntil) || 0
  };
}

export function writePinUnlockGuard(nextGuard) {
  localStorage.setItem(PIN_UNLOCK_GUARD_KEY, JSON.stringify({
    failures: Math.max(0, Number(nextGuard.failures) || 0),
    lockedUntil: Math.max(0, Number(nextGuard.lockedUntil) || 0)
  }));
}

export function clearPinUnlockGuard() {
  localStorage.removeItem(PIN_UNLOCK_GUARD_KEY);
}

export function recordPinUnlockFailure() {
  const guard = readPinUnlockGuard();
  const failures = guard.failures + 1;
  const lockMinutes = failures >= 10 ? 60 : failures >= 6 ? 10 : failures >= 3 ? 2 : 0;
  writePinUnlockGuard({
    failures,
    lockedUntil: lockMinutes > 0 ? Date.now() + lockMinutes * 60 * 1000 : 0
  });
}

export function readCryptoSession(expectedUserId, enabledMinutes) {
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

export function writeCryptoSession(userValue, mnemonicValue, enabledMinutes, hqc256 = null) {
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

export function clearCryptoSession() {
  volatileCryptoSession = null;
  sessionStorage.removeItem(CRYPTO_SESSION_KEY);
}

export async function loadSovereignKeys(password) {
  const raw = localStorage.getItem(SOVEREIGN_KEY_VAULT_KEY);
  if (!raw) return null;
  const record = await crypto.decryptLocalRecord(safeJsonParse(raw, null), password);
  if (record?.version !== 1 || typeof record?.public !== 'string' || typeof record?.private !== 'string' || record.public.length < 1024 || record.private.length < 1024) {
    throw new Error('Lokaler HQC-256 Keyvault wurde verworfen.');
  }
  return { public: record.public, private: record.private };
}

export async function createSovereignKeys(password) {
  const generated = await generateHqc256KeyPair();
  const hqc256 = { public: generated.publicKeyHex, private: generated.secretKeyHex };
  const envelope = await crypto.encryptLocalRecord({ version: 1, ...hqc256 }, password);
  localStorage.setItem(SOVEREIGN_KEY_VAULT_KEY, JSON.stringify(envelope));
  return hqc256;
}