/*
 * Device pairing: ephemeral hybrid key handover (X25519 + ML-KEM-1024 + AES-GCM).
 */

import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { hexToBytes, bytesToHex, base64FromBytes, bytesFromBase64 } from './format.js';
import { combineSecretsLengthPrefixed } from './primitives.js';
import { validateMnemonic } from './kdf.js';
import { signGsnMessage } from './signatures.js';

const DEVICE_PAIRING_SUITE = 'GaiaCom/v0.1/device-pairing/X25519+ML-KEM-1024/AES-256-GCM';

const DEVICE_PAIRING_PROTOCOL = 'gaiacom-device-pairing-v1';

function pairingAad(pairing) {
  if (!pairing?.id || !pairing?.secretHash || !pairing?.expiresAt) {
    throw new Error('Unvollstaendige Pairing-Bindung.');
  }
  return new TextEncoder().encode([
    'gaiacom-device-pairing-payload-v1',
    pairing.id,
    pairing.secretHash,
    pairing.expiresAt
  ].join('\n'));
}

export function generateDevicePairingKeys() {
  const boxPrivate = window.crypto.getRandomValues(new Uint8Array(32));
  const kemSeed = window.crypto.getRandomValues(new Uint8Array(64));
  const kemPair = ml_kem1024.keygen(kemSeed);
  const signPrivate = window.crypto.getRandomValues(new Uint8Array(32));
  return {
    publicKeys: { box: bytesToHex(x25519.getPublicKey(boxPrivate)), pke: bytesToHex(kemPair.publicKey), sign: bytesToHex(ed25519.getPublicKey(signPrivate)) },
    privateKeys: { box: bytesToHex(boxPrivate), pke: bytesToHex(kemPair.secretKey), sign: bytesToHex(signPrivate) }
  };
}

export function buildDevicePairingApprovalPayload(pairing, encryptedPayload) {
  if (!pairing?.id || !pairing?.secretHash || !pairing?.deviceBoxPublic || !pairing?.deviceKemPublic || !pairing?.deviceSignPublic || !pairing?.expiresAt) {
    throw new Error('Unvollstaendige Pairing-Anfrage.');
  }
  const digest = value => bytesToHex(sha256(new TextEncoder().encode(value)));
  return [
    DEVICE_PAIRING_PROTOCOL,
    pairing.id,
    pairing.secretHash,
    digest(pairing.deviceBoxPublic),
    digest(pairing.deviceKemPublic),
    digest(pairing.deviceSignPublic),
    digest(encryptedPayload),
    // Must remain byte-for-byte identical to Go's time.RFC3339Nano value.
    // Parsing through Date would truncate sub-millisecond precision and invalidate
    // the existing device's Ed25519 signature.
    pairing.expiresAt
  ].join('\n');
}

export function signDevicePairingApproval(pairing, encryptedPayload, deviceKeyVault) {
  if (!deviceKeyVault?.deviceKeyId || !deviceKeyVault?.privateKeys?.sign) return { approverDeviceKeyId: '', deviceSignature: '' };
  const proof = `gaiacom-device-pairing-approval-v1\n${buildDevicePairingApprovalPayload(pairing, encryptedPayload)}`;
  return { approverDeviceKeyId: deviceKeyVault.deviceKeyId, deviceSignature: signGsnMessage(proof, deviceKeyVault.privateKeys.sign) };
}

export async function encryptDevicePairingPayload(record, pairing) {
  const recipientBox = hexToBytes(pairing?.deviceBoxPublic || '');
  const recipientKem = hexToBytes(pairing?.deviceKemPublic || '');
  if (recipientBox.length !== 32 || recipientKem.length !== 1568) {
    throw new Error('Ungueltige Schluessel des neuen Geraets.');
  }
  const { cipherText, sharedSecret: kemSecret } = ml_kem1024.encapsulate(recipientKem);
  const ephemeralPrivate = window.crypto.getRandomValues(new Uint8Array(32));
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate);
  const xSecret = x25519.getSharedSecret(ephemeralPrivate, recipientBox);
  const salt = new Uint8Array(ephemeralPublic.length + cipherText.length);
  salt.set(ephemeralPublic);
  salt.set(cipherText, ephemeralPublic.length);
  const symmetricKey = hkdf(sha256, combineSecretsLengthPrefixed(xSecret, kemSecret), salt, new TextEncoder().encode(DEVICE_PAIRING_SUITE), 32);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await window.crypto.subtle.importKey('raw', symmetricKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: pairingAad(pairing) },
    cryptoKey,
    new TextEncoder().encode(JSON.stringify({ version: 1, ...record }))
  );
  return JSON.stringify({
    protocol: 'gaiacom-device-pairing-payload-v1',
    suite: DEVICE_PAIRING_SUITE,
    kemCiphertext: base64FromBytes(cipherText),
    ephemeralPublic: base64FromBytes(ephemeralPublic),
    iv: base64FromBytes(iv),
    ciphertext: base64FromBytes(new Uint8Array(encrypted))
  });
}

export async function decryptDevicePairingPayload(encryptedPayload, pairing, privateKeys) {
  let envelope;
  try { envelope = JSON.parse(encryptedPayload); } catch (_) { throw new Error('Pairing-Paket ist unlesbar.'); }
  if (envelope?.protocol !== 'gaiacom-device-pairing-payload-v1' || envelope?.suite !== DEVICE_PAIRING_SUITE) {
    throw new Error('Unbekanntes Pairing-Protokoll.');
  }
  const kemCiphertext = bytesFromBase64(envelope.kemCiphertext || '');
  const ephemeralPublic = bytesFromBase64(envelope.ephemeralPublic || '');
  const iv = bytesFromBase64(envelope.iv || '');
  const ciphertext = bytesFromBase64(envelope.ciphertext || '');
  const kemPrivate = hexToBytes(privateKeys?.pke || '');
  const boxPrivate = hexToBytes(privateKeys?.box || '');
  if (kemCiphertext.length !== 1568 || ephemeralPublic.length !== 32 || iv.length !== 12 || !ciphertext.length || kemPrivate.length !== ml_kem1024.lengths.secretKey || boxPrivate.length !== 32) {
    throw new Error('Pairing-Paket verletzt die Kryptografie-Grenzen.');
  }
  const kemSecret = ml_kem1024.decapsulate(kemCiphertext, kemPrivate);
  const xSecret = x25519.getSharedSecret(boxPrivate, ephemeralPublic);
  const salt = new Uint8Array(ephemeralPublic.length + kemCiphertext.length);
  salt.set(ephemeralPublic);
  salt.set(kemCiphertext, ephemeralPublic.length);
  const symmetricKey = hkdf(sha256, combineSecretsLengthPrefixed(xSecret, kemSecret), salt, new TextEncoder().encode(DEVICE_PAIRING_SUITE), 32);
  const cryptoKey = await window.crypto.subtle.importKey('raw', symmetricKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintext = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: pairingAad(pairing) }, cryptoKey, ciphertext
  );
  const record = JSON.parse(new TextDecoder().decode(plaintext));
  if (record?.version !== 1 || typeof record?.mnemonic !== 'string' || !validateMnemonic(record.mnemonic)) {
    throw new Error('Pairing-Paket enthaelt keine gueltige Recovery-Identitaet.');
  }
  return record;
}

// --- Hybrid E2E Encryption ---
