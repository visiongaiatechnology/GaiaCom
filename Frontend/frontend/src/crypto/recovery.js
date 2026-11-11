/*
 * Passphrase-based mnemonic and local-record encryption (PBKDF2 + AES-GCM).
 */

import { hexToBytes, bytesToHex } from './format.js';
import { deriveEncryptionKey } from './primitives.js';

export async function encryptMnemonic(mnemonic, password, iterations = 600000) {
  const salt = window.crypto.getRandomValues(new Uint8Array(32)); // 256 bits (exceeds 128 bits minimum)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt, iterations);
  
  const enc = new TextEncoder();
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(mnemonic)
  );
  
  return {
    ciphertext: bytesToHex(new Uint8Array(encryptedBuf)),
    iv: bytesToHex(iv),
    kdfParams: {
      kdf: "PBKDF2-HMAC-SHA256",
      iterations: iterations,
      salt: bytesToHex(salt),
      version: 2
    }
  };
}

export async function decryptMnemonic(envelopeOrCiphertext, password, saltHex, ivHex) {
  let ciphertextHex;
  let iv;
  let salt;
  let iterations = 100000;

  if (envelopeOrCiphertext && typeof envelopeOrCiphertext === 'object') {
    ciphertextHex = envelopeOrCiphertext.ciphertext;
    iv = hexToBytes(envelopeOrCiphertext.iv);
    if (envelopeOrCiphertext.kdfParams) {
      iterations = envelopeOrCiphertext.kdfParams.iterations;
      salt = hexToBytes(envelopeOrCiphertext.kdfParams.salt);
    } else {
      salt = hexToBytes(envelopeOrCiphertext.salt);
    }
  } else {
    ciphertextHex = envelopeOrCiphertext;
    salt = hexToBytes(saltHex);
    iv = hexToBytes(ivHex);
  }

  const ciphertext = hexToBytes(ciphertextHex);
  const key = await deriveEncryptionKey(password, salt, iterations);
  
  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decryptedBuf);
}

export async function encryptLocalRecord(record, password, iterations = 600000) {
  const salt = window.crypto.getRandomValues(new Uint8Array(32));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt, iterations);
  const plaintext = JSON.stringify(record);
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(encryptedBuf)),
    iv: bytesToHex(iv),
    kdfParams: {
      kdf: "PBKDF2-HMAC-SHA256",
      iterations,
      salt: bytesToHex(salt),
      version: 2
    }
  };
}

export async function decryptLocalRecord(envelope, password) {
  if (!envelope || typeof envelope !== 'object' || !envelope.ciphertext || !envelope.iv || !envelope.kdfParams) {
    throw new Error('Invalid local vault envelope');
  }
  const key = await deriveEncryptionKey(
    password,
    hexToBytes(envelope.kdfParams.salt),
    envelope.kdfParams.iterations || 600000
  );
  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(envelope.iv) },
    key,
    hexToBytes(envelope.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(decryptedBuf));
}

// --- Device Pairing: ephemeral, hybrid encrypted key handover ---
