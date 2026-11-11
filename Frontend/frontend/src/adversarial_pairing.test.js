// Node.js WebCrypto Polyfill for Vitest / Jest environment
import { webcrypto } from 'crypto';
import { TextDecoder, TextEncoder } from 'util';
import { describe, it, test, expect } from 'vitest';

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder });
}
if (typeof globalThis.TextDecoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder });
}
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, writable: true });
}
if (typeof window !== 'undefined' && !window.crypto) {
  Object.defineProperty(window, 'crypto', { value: webcrypto, writable: true });
}

import * as crypto from './crypto.js';

describe('Vault Migration & Device Pairing Handover Tests', () => {
  const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const password = "SuperSecretPassword123!";

  describe('Legacy Vault Envelope Migration', () => {
    test('Successfully decrypts legacy v1 flat envelopes and supports v2 migration path', async () => {
      const salt = window.crypto.getRandomValues(new Uint8Array(32));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const derivedKeyBytes = await deriveWebCryptoKey(password, salt, 100000);
      const plaintextBytes = new TextEncoder().encode(testMnemonic);
      const encryptedBuf = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        derivedKeyBytes,
        plaintextBytes
      );
      
      const v1Envelope = {
        ciphertext: crypto.bytesToHex(new Uint8Array(encryptedBuf)),
        iv: crypto.bytesToHex(iv),
        salt: crypto.bytesToHex(salt)
      };

      const decrypted = await crypto.decryptMnemonic(v1Envelope, password);
      expect(decrypted).toBe(testMnemonic);

      const migrated = await crypto.encryptMnemonic(decrypted, password, 10000);
      expect(migrated.kdfParams.version).toBe(2);
      expect(migrated.kdfParams.iterations).toBe(10000);
      expect(migrated.salt).toBeUndefined();

      const decryptedV2 = await crypto.decryptMnemonic(migrated, password);
      expect(decryptedV2).toBe(testMnemonic);
    });
  });

  describe('Device Pairing Handover', () => {
    const pairing = {
      id: '8a87fd30-3a85-4f8a-8d12-8b5dc5b4ea11',
      secretHash: 'aa'.repeat(32),
      deviceBoxPublic: '',
      deviceKemPublic: '',
      deviceSignPublic: '',
      expiresAt: '2026-07-11T12:34:56.123456789Z'
    };

    it('encrypts a mnemonic only for the requesting device and binds the exact transcript', async () => {
      const device = crypto.generateDevicePairingKeys();
      pairing.deviceBoxPublic = device.publicKeys.box;
      pairing.deviceKemPublic = device.publicKeys.pke;
      pairing.deviceSignPublic = device.publicKeys.sign;
      const encrypted = await crypto.encryptDevicePairingPayload({ mnemonic: testMnemonic, identityId: 'identity-1' }, pairing);
      const decoded = await crypto.decryptDevicePairingPayload(encrypted, pairing, device.privateKeys);
      expect(decoded.mnemonic).toBe(testMnemonic);
      expect(decoded.identityId).toBe('identity-1');

      const alteredPairing = { ...pairing, expiresAt: '2026-07-11T12:34:56.123456790Z' };
      await expect(crypto.decryptDevicePairingPayload(encrypted, alteredPairing, device.privateKeys)).rejects.toThrow();
    });
  });
});

async function deriveWebCryptoKey(password, salt, iterations) {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
