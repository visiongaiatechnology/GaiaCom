// STATUS: PLATIN
import { createNativeProvider } from './sovereign/nativeProvider.js';
import { createWebProvider } from './sovereign/webProvider.js';

const MAX_NATIVE_HEX = 32 * 1024 * 1024;
let providerInstance;

function isNativeRuntime() {
  return typeof window !== 'undefined'
    && Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_METADATA__);
}

function assertHex(value, label, maximum = MAX_NATIVE_HEX) {
  if (typeof value !== 'string'
    || value.length === 0
    || value.length > maximum
    || value.length % 2 !== 0
    || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error(`${label} wurde verworfen.`);
  }
  return value.toLowerCase();
}

function assertProfile(profile) {
  if (profile !== 'accelerated' && profile !== 'top-secret') {
    throw new Error('Unbekanntes GaiaCom-Sicherheitsprofil.');
  }
  return profile;
}

function provider() {
  providerInstance ??= isNativeRuntime()
    ? createNativeProvider(assertHex)
    : createWebProvider();
  return providerInstance;
}

export function hasSovereignRuntime() {
  if (isNativeRuntime()) return true;
  return typeof Worker !== 'undefined'
    && typeof WebAssembly !== 'undefined'
    && Boolean(globalThis.crypto?.getRandomValues);
}

export async function ensureSovereignRuntime() {
  if (!hasSovereignRuntime()) throw new Error('Sovereign crypto provider is unavailable.');
  await provider().ready();
  return true;
}

export async function generateHqc256KeyPair() {
  const result = await provider().keyPair();
  return {
    publicKeyHex: assertHex(result?.publicKeyHex, 'HQC-256 Public Key', 64 * 1024),
    secretKeyHex: assertHex(result?.secretKeyHex, 'HQC-256 Secret Key', 128 * 1024)
  };
}

export async function hqc256Encapsulate(publicKeyHex) {
  const result = await provider().encapsulate(assertHex(publicKeyHex, 'HQC-256 Public Key', 64 * 1024));
  return {
    ciphertextHex: assertHex(result?.ciphertextHex, 'HQC-256 Ciphertext', 128 * 1024),
    sharedSecretHex: assertHex(result?.sharedSecretHex, 'HQC-256 Shared Secret', 1024)
  };
}

export async function hqc256Decapsulate(ciphertextHex, secretKeyHex) {
  const sharedSecretHex = await provider().decapsulate(
    assertHex(ciphertextHex, 'HQC-256 Ciphertext', 128 * 1024),
    assertHex(secretKeyHex, 'HQC-256 Secret Key', 128 * 1024)
  );
  return assertHex(sharedSecretHex, 'HQC-256 Shared Secret', 1024);
}

export async function sovereignSeal(profile, rootSecretHex, aadHex, plaintextHex) {
  const selectedProfile = assertProfile(profile);
  const result = await provider().seal(
    selectedProfile,
    assertHex(rootSecretHex, 'Root Secret', 64),
    assertHex(aadHex, 'Transcript', 256 * 1024),
    assertHex(plaintextHex, 'Klartext', 16 * 1024 * 1024)
  );
  if (result?.profile !== selectedProfile) throw new Error('Kryptoprofil-Bindung wurde verworfen.');
  return assertHex(result?.ciphertextHex, 'Ciphertext', 20 * 1024 * 1024);
}

export async function sovereignOpen(profile, rootSecretHex, aadHex, ciphertextHex) {
  const selectedProfile = assertProfile(profile);
  const plaintextHex = await provider().open(
    selectedProfile,
    assertHex(rootSecretHex, 'Root Secret', 64),
    assertHex(aadHex, 'Transcript', 256 * 1024),
    assertHex(ciphertextHex, 'Ciphertext', 20 * 1024 * 1024)
  );
  return assertHex(plaintextHex, 'Klartext', 16 * 1024 * 1024);
}
