/*
 * Anonymous GaiaDrop text envelopes (recipient-bound, sender-hidden).
 */

import { x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { hexToBytes, bytesToHex, generateUUID } from './format.js';
import { combineSecretsLengthPrefixed } from './primitives.js';
import { buildCanonicalAAD } from './canonical.js';

export async function encryptAnonymousDrop(plaintext, recipientPubKeysHex) {
  const recipientPkeBytes = hexToBytes(recipientPubKeysHex.pke);
  const recipientBoxBytes = hexToBytes(recipientPubKeysHex.box);
  const recipientSignBytes = hexToBytes(recipientPubKeysHex.identity);

  if (recipientPkeBytes.length !== 1568 || recipientBoxBytes.length !== 32 || recipientSignBytes.length !== 32) {
    throw new Error('Ungültige GaiaDrop Empfänger-Schlüssel.');
  }

  const { cipherText: kemCiphertext, sharedSecret: kemSecret } = ml_kem1024.encapsulate(recipientPkeBytes);
  const ephemeralSeed = window.crypto.getRandomValues(new Uint8Array(32));
  const ephemeralPub = x25519.getPublicKey(ephemeralSeed);
  const x25519Secret = x25519.getSharedSecret(ephemeralSeed, recipientBoxBytes);
  const salt = new Uint8Array(ephemeralPub.length + kemCiphertext.length);
  salt.set(ephemeralPub, 0);
  salt.set(kemCiphertext, ephemeralPub.length);
  const ikm = combineSecretsLengthPrefixed(x25519Secret, kemSecret);
  const info = new TextEncoder().encode('GaiaCom/v0.1/gaiadrop/X25519+ML-KEM-1024/AES-256-GCM');
  const combinedSecret = hkdf(sha256, ikm, salt, info, 32);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const messageId = generateUUID();
  const timestamp = Date.now();
  const aad = buildCanonicalAAD({
    protocol_version: "drop.v1",
    algorithm_suite: "GaiaCom/v0.1/gaiadrop/X25519+ML-KEM-1024/AES-256-GCM",
    sender_identity_key: recipientSignBytes,
    recipient_identity_key: recipientSignBytes,
    recipient_device_key: recipientBoxBytes,
    ephemeral_x25519_public_key: ephemeralPub,
    mlkem_ciphertext: kemCiphertext,
    message_id: messageId,
    timestamp,
    iv
  });
  const cryptoKey = await window.crypto.subtle.importKey('raw', combinedSecret, { name: 'AES-GCM' }, false, ['encrypt']);
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  );
  return {
    protocol: 'gaiadrop.text.v1',
    kem_ciphertext: bytesToHex(kemCiphertext),
    ephemeral_pub: bytesToHex(ephemeralPub),
    payload_ciphertext: bytesToHex(new Uint8Array(encryptedBuf)),
    iv: bytesToHex(iv),
    recipient_identity_key: bytesToHex(recipientSignBytes),
    client_message_id: messageId,
    timestamp
  };
}

export async function decryptAnonymousDrop(envelope, recipientPubKeysHex, recipientPrivKeysHex) {
  const kemCiphertextBytes = hexToBytes(envelope.kem_ciphertext);
  const ephemeralPubBytes = hexToBytes(envelope.ephemeral_pub);
  const payloadCiphertextBytes = hexToBytes(envelope.payload_ciphertext);
  const ivBytes = hexToBytes(envelope.iv);
  const recipientPkeBytes = hexToBytes(recipientPubKeysHex.pke);
  const recipientBoxBytes = hexToBytes(recipientPubKeysHex.box);
  const recipientSignBytes = hexToBytes(recipientPubKeysHex.identity);
  const recipientKemPrivBytes = hexToBytes(recipientPrivKeysHex.pke);
  const recipientBoxPrivBytes = hexToBytes(recipientPrivKeysHex.box);

  if (recipientPkeBytes.length !== 1568 || recipientBoxBytes.length !== 32 || recipientSignBytes.length !== 32) {
    throw new Error('Ungueltige GaiaDrop Empfaenger-Schluessel.');
  }

  const kemSecret = ml_kem1024.decapsulate(kemCiphertextBytes, recipientKemPrivBytes);
  const x25519Secret = x25519.getSharedSecret(recipientBoxPrivBytes, ephemeralPubBytes);
  const salt = new Uint8Array(ephemeralPubBytes.length + kemCiphertextBytes.length);
  salt.set(ephemeralPubBytes, 0);
  salt.set(kemCiphertextBytes, ephemeralPubBytes.length);
  const ikm = combineSecretsLengthPrefixed(x25519Secret, kemSecret);
  const info = new TextEncoder().encode('GaiaCom/v0.1/gaiadrop/X25519+ML-KEM-1024/AES-256-GCM');
  const combinedSecret = hkdf(sha256, ikm, salt, info, 32);
  const aad = buildCanonicalAAD({
    protocol_version: "drop.v1",
    algorithm_suite: "GaiaCom/v0.1/gaiadrop/X25519+ML-KEM-1024/AES-256-GCM",
    sender_identity_key: recipientSignBytes,
    recipient_identity_key: recipientSignBytes,
    recipient_device_key: recipientBoxBytes,
    ephemeral_x25519_public_key: ephemeralPubBytes,
    mlkem_ciphertext: kemCiphertextBytes,
    message_id: envelope.client_message_id,
    timestamp: envelope.timestamp,
    iv: ivBytes
  });
  const cryptoKey = await window.crypto.subtle.importKey('raw', combinedSecret, { name: 'AES-GCM' }, false, ['decrypt']);
  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes, additionalData: aad },
    cryptoKey,
    payloadCiphertextBytes
  );
  return new TextDecoder().decode(decryptedBuf);
}

// --- Trust Mesh Hashing Helpers ---
