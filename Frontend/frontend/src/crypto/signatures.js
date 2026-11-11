/*
 * Ed25519 / ML-DSA-87 signatures, sovereign keyset proofs and device envelope proofs.
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { hexToBytes, bytesToHex } from './format.js';

export function signMldsa87Message(messageText, privateKeyHex) {
  const privateKeyBytes = hexToBytes(privateKeyHex || '');
  if (privateKeyBytes.length !== ml_dsa87.lengths.secretKey) {
    throw new Error('ML-DSA-87 Private Key fehlt oder hat eine ungueltige Laenge.');
  }
  const messageBytes = new TextEncoder().encode(String(messageText || ''));
  return bytesToHex(ml_dsa87.sign(messageBytes, privateKeyBytes));
}

export function getMldsa87PublicKey(privateKeyHex) {
  const privateKeyBytes = hexToBytes(privateKeyHex || '');
  if (privateKeyBytes.length !== ml_dsa87.lengths.secretKey) {
    throw new Error('ML-DSA-87 Private Key fehlt oder hat eine ungueltige Laenge.');
  }
  return bytesToHex(ml_dsa87.getPublicKey(privateKeyBytes));
}

export const SOVEREIGN_KEYSET_PROOF_VERSION = 'gaiacom-sovereign-keyset-v1';

function sovereignKeysetTranscript(publicKeys) {
  const fieldSizes = { identity: 32, box: 32, pke: 1568, mldsa87: 2592, hqc256: 7245 };
  const fields = Object.keys(fieldSizes);
  for (const field of fields) {
    const value = publicKeys?.[field];
    if (typeof value !== 'string' || value.length !== fieldSizes[field] * 2 || !/^[0-9a-f]+$/i.test(value)) {
      throw new Error('Souveräner Keyset wurde verworfen.');
    }
  }
  return [SOVEREIGN_KEYSET_PROOF_VERSION, ...fields.map(field => publicKeys[field].toLowerCase())].join('\n');
}

export function createSovereignKeysetProof(publicKeys, identityPrivateKeyHex) {
  return {
    version: SOVEREIGN_KEYSET_PROOF_VERSION,
    ed25519: signGsnMessage(sovereignKeysetTranscript(publicKeys), identityPrivateKeyHex)
  };
}

export function verifySovereignKeysetProof(publicRecord) {
  const publicKeys = publicRecord?.public_keys;
  const proof = publicRecord?.keyset_proof;
  if (proof?.version !== SOVEREIGN_KEYSET_PROOF_VERSION || typeof proof?.ed25519 !== 'string') return false;
  const identityPublic = hexToBytes(publicKeys?.identity || '');
  const signature = hexToBytes(proof.ed25519);
  if (identityPublic.length !== 32 || signature.length !== 64) return false;
  try {
    return ed25519.verify(signature, new TextEncoder().encode(sovereignKeysetTranscript(publicKeys)), identityPublic);
  } catch (_) {
    return false;
  }
}
// --- Passphrase-Based Mnemonic Encryption (WebCrypto PBKDF2 + AES-GCM) ---

export function signGsnMessage(messageText, privateKeyHex) {
  const msgBytes = new TextEncoder().encode(messageText);
  const privKeyBytes = hexToBytes(privateKeyHex);
  const sigBytes = ed25519.sign(msgBytes, privKeyBytes);
  return bytesToHex(sigBytes);
}

export function attachDeviceEnvelopeProof(envelope, deviceKeyVault) {
  if (!deviceKeyVault?.deviceKeyId || !deviceKeyVault?.privateKeys?.sign) return envelope;
  const proof = [
    'gaiacom-device-envelope-v1',
    deviceKeyVault.deviceKeyId,
    String(envelope?.client_message_id || ''),
    String(envelope?.signature || '')
  ].join('\n');
  return {
    ...envelope,
    sender_device_key_id: deviceKeyVault.deviceKeyId,
    device_signature: signGsnMessage(proof, deviceKeyVault.privateKeys.sign)
  };
}
