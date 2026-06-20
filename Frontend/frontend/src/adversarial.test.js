// Node.js WebCrypto Polyfill for Jest environment
import { webcrypto } from 'crypto';
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true
  });
}
if (typeof window !== 'undefined' && !window.crypto) {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    writable: true
  });
}

import * as crypto from './crypto.js';

describe('GaiaCom Phase 13 - Platin Cryptographic Verification Harness', () => {
  const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  let senderKeys, recipientKeys;
  let senderPubKeysHex, recipientPubKeysHex, recipientPrivKeysHex;

  beforeAll(() => {
    senderKeys = crypto.deriveKeysFromMnemonic(testMnemonic);
    // Derive recipient keys from a different mnemonic
    const recipientMnemonic = crypto.generateMnemonic();
    recipientKeys = crypto.deriveKeysFromMnemonic(recipientMnemonic);

    senderPubKeysHex = {
      identity: senderKeys.keys.sign.public,
      box: senderKeys.keys.box.public,
      pke: senderKeys.keys.pke.public
    };

    recipientPubKeysHex = {
      identity: recipientKeys.keys.sign.public,
      box: recipientKeys.keys.box.public,
      pke: recipientKeys.keys.pke.public
    };

    recipientPrivKeysHex = {
      box: recipientKeys.keys.box.private,
      pke: recipientKeys.keys.pke.private
    };
  });

  test('Valid Test Vector: Encrypt -> Sign -> Verify -> Decrypt succeeds', async () => {
    const plaintext = "This is a super secure platinum message!";
    const msgId = "11112222-3333-4444-5555-666677778888";
    const timestamp = Date.now();

    // Encrypt and sign payload
    const envelope = await crypto.encryptPayload(
      plaintext,
      recipientPubKeysHex,
      senderKeys.keys.sign.private,
      msgId,
      timestamp
    );

    expect(envelope.kem_ciphertext).toBeDefined();
    expect(envelope.ephemeral_pub).toBeDefined();
    expect(envelope.payload_ciphertext).toBeDefined();
    expect(envelope.signature).toBeDefined();
    expect(envelope.client_message_id).toBe(msgId);
    expect(envelope.timestamp).toBe(timestamp);

    // Decrypt and verify signature
    const decrypted = await crypto.decryptPayload(
      envelope,
      senderKeys.keys.sign.public,
      recipientPubKeysHex,
      recipientPrivKeysHex
    );

    expect(decrypted).toBe(plaintext);
  });

  describe('Invalid Test Vectors & AAD Mutability Rejection', () => {
    let validEnvelope;
    const plaintext = "Secret data";
    const msgId = "99998888-7777-6666-5555-444433332222";
    const timestamp = Date.now();

    beforeEach(async () => {
      validEnvelope = await crypto.encryptPayload(
        plaintext,
        recipientPubKeysHex,
        senderKeys.keys.sign.private,
        msgId,
        timestamp
      );
    });

    test('Rejects if client_message_id is modified (AAD fail)', async () => {
      const manipulated = { ...validEnvelope, client_message_id: "00000000-0000-0000-0000-000000000000" };
      await expect(crypto.decryptPayload(
        manipulated,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });

    test('Rejects if timestamp is modified (AAD fail)', async () => {
      const manipulated = { ...validEnvelope, timestamp: validEnvelope.timestamp + 1000 };
      await expect(crypto.decryptPayload(
        manipulated,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });

    test('Rejects if IV is modified (AAD/AES-GCM fail)', async () => {
      const ivBytes = crypto.hexToBytes(validEnvelope.iv);
      ivBytes[0] ^= 0xff; // Mutate first byte
      const manipulated = { ...validEnvelope, iv: crypto.bytesToHex(ivBytes) };
      await expect(crypto.decryptPayload(
        manipulated,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });

    test('Rejects if kem_ciphertext is modified (AAD/KEM fail)', async () => {
      const kemBytes = crypto.hexToBytes(validEnvelope.kem_ciphertext);
      kemBytes[0] ^= 0xff; // Mutate first byte
      const manipulated = { ...validEnvelope, kem_ciphertext: crypto.bytesToHex(kemBytes) };
      await expect(crypto.decryptPayload(
        manipulated,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });

    test('Rejects if ephemeral_pub is modified (AAD/ECDH fail)', async () => {
      const ephemBytes = crypto.hexToBytes(validEnvelope.ephemeral_pub);
      ephemBytes[0] ^= 0xff; // Mutate first byte
      const manipulated = { ...validEnvelope, ephemeral_pub: crypto.bytesToHex(ephemBytes) };
      await expect(crypto.decryptPayload(
        manipulated,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });

    test('Rejects if payload_ciphertext is modified (AES-GCM tag fail)', async () => {
      const payloadBytes = crypto.hexToBytes(validEnvelope.payload_ciphertext);
      payloadBytes[0] ^= 0xff; // Mutate first byte
      const manipulated = { ...validEnvelope, payload_ciphertext: crypto.bytesToHex(payloadBytes) };
      await expect(crypto.decryptPayload(
        manipulated,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });

    test('Rejects if recipient_identity_key is changed (AAD fail)', async () => {
      const modifiedRecipientPubKeys = {
        ...recipientPubKeysHex,
        identity: senderKeys.keys.sign.public // Wrong sender identity instead
      };
      await expect(crypto.decryptPayload(
        validEnvelope,
        senderKeys.keys.sign.public,
        modifiedRecipientPubKeys,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });

    test('Rejects if recipient_device_key is changed (AAD fail)', async () => {
      const modifiedRecipientPubKeys = {
        ...recipientPubKeysHex,
        box: senderKeys.keys.box.public // Wrong box key
      };
      await expect(crypto.decryptPayload(
        validEnvelope,
        senderKeys.keys.sign.public,
        modifiedRecipientPubKeys,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });
  });

  describe('Downgrade & Signature Security Tests', () => {
    let validEnvelope;
    const plaintext = "Downgrade prevention test";
    const msgId = "11111111-2222-3333-4444-555555555555";
    const timestamp = Date.now();

    beforeEach(async () => {
      validEnvelope = await crypto.encryptPayload(
        plaintext,
        recipientPubKeysHex,
        senderKeys.keys.sign.private,
        msgId,
        timestamp
      );
    });

    test('Rejects signature if signed by a different key', async () => {
      const differentMnemonic = crypto.generateMnemonic();
      const attackerKeys = crypto.deriveKeysFromMnemonic(differentMnemonic);

      // Decrypt using attacker's public key as the claimed sender
      await expect(crypto.decryptPayload(
        validEnvelope,
        attackerKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow('Ungültige Nachrichtensignatur');
    });

    test('Rejects signature if signature is modified', async () => {
      const sigBytes = crypto.hexToBytes(validEnvelope.signature);
      sigBytes[0] ^= 0xff; // Corrupt signature
      const manipulated = { ...validEnvelope, signature: crypto.bytesToHex(sigBytes) };

      await expect(crypto.decryptPayload(
        manipulated,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow('Ungültige Nachrichtensignatur');
    });

    test('Rejects signature if signature is missing', async () => {
      const manipulated = { ...validEnvelope };
      delete manipulated.signature;

      await expect(crypto.decryptPayload(
        manipulated,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });

    test('Downgrade protection: mutating algorithm_suite in AAD fails AES-GCM decryption', async () => {
      // In GaiaCom, the algorithm_suite is hardcoded during decryption to prevent downgrade attacks.
      // If the sender encrypted using a different suite context, the receiver's AAD reconstruction
      // will mismatch, causing AES-GCM tag verification to fail.
      
      // Let's simulate a sender using a weak suite context "GaiaCom/v0.1/hybrid-kem/weak-suite":
      const weakSuite = "GaiaCom/v0.1/hybrid-kem/weak-suite";
      
      const recipientPkeBytes = crypto.hexToBytes(recipientPubKeysHex.pke);
      const recipientBoxBytes = crypto.hexToBytes(recipientPubKeysHex.box);
      const recipientSignBytes = crypto.hexToBytes(recipientPubKeysHex.identity);
      const senderSignPrivBytes = crypto.hexToBytes(senderKeys.keys.sign.private);
      const senderSignPubBytes = crypto.hexToBytes(senderKeys.keys.sign.public);
      
      // Encapsulate & ECDH
      const { cipherText: kemCiphertext, sharedSecret: kemSecret } = crypto.ml_kem1024.encapsulate(recipientPkeBytes);
      const ephemeralSeed = window.crypto.getRandomValues(new Uint8Array(32));
      const ephemeralPub = crypto.x25519.getPublicKey(ephemeralSeed);
      const x25519Secret = crypto.x25519.getSharedSecret(ephemeralSeed, recipientBoxBytes);
      
      // Combine with weak suite name
      const salt = new Uint8Array(ephemeralPub.length + kemCiphertext.length);
      salt.set(ephemeralPub, 0);
      salt.set(kemCiphertext, ephemeralPub.length);
      const ikm = new Uint8Array(4 + x25519Secret.length + 4 + kemSecret.length);
      const view = new DataView(ikm.buffer);
      view.setUint32(0, x25519Secret.length, false);
      ikm.set(x25519Secret, 4);
      view.setUint32(4 + x25519Secret.length, kemSecret.length, false);
      ikm.set(kemSecret, 4 + x25519Secret.length + 4);
      
      const weakInfo = new TextEncoder().encode(weakSuite);
      const combinedSecret = crypto.hkdf(crypto.sha256, ikm, salt, weakInfo, 32);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Build AAD using the weak suite name
      const weakAADBytes = crypto.buildCanonicalAAD({
        protocol_version: "v0.1",
        algorithm_suite: weakSuite, // mutated suite
        sender_identity_key: senderSignPubBytes,
        recipient_identity_key: recipientSignBytes,
        recipient_device_key: recipientBoxBytes,
        ephemeral_x25519_public_key: ephemeralPub,
        mlkem_ciphertext: kemCiphertext,
        message_id: msgId,
        timestamp: timestamp,
        iv: iv
      });

      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        combinedSecret,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      const plaintextBytes = new TextEncoder().encode(plaintext);
      const encryptedBuf = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, additionalData: weakAADBytes },
        cryptoKey,
        plaintextBytes
      );
      
      const payloadCiphertext = new Uint8Array(encryptedBuf);
      const kemCiphertextHash = crypto.sha256(kemCiphertext);
      const ciphertextHash = crypto.sha256(payloadCiphertext);

      const sigPayload = crypto.buildCanonicalSignaturePayload({
        protocol_version: "v0.1",
        algorithm_suite: weakSuite, // mutated suite
        sender: senderSignPubBytes,
        recipient: recipientSignBytes,
        device_key: recipientBoxBytes,
        ephemeral_key: ephemeralPub,
        mlkem_ciphertext_hash: kemCiphertextHash,
        message_id: msgId,
        timestamp: timestamp,
        iv: iv,
        ciphertext_hash: ciphertextHash
      });

      const signature = crypto.ed25519.sign(sigPayload, senderSignPrivBytes);

      const downgradeEnvelope = {
        kem_ciphertext: crypto.bytesToHex(kemCiphertext),
        ephemeral_pub: crypto.bytesToHex(ephemeralPub),
        payload_ciphertext: crypto.bytesToHex(payloadCiphertext),
        iv: crypto.bytesToHex(iv),
        signature: crypto.bytesToHex(signature),
        client_message_id: msgId,
        timestamp: timestamp
      };

      // Decryption must fail because decryptPayload enforces the platin suite name
      await expect(crypto.decryptPayload(
        downgradeEnvelope,
        senderKeys.keys.sign.public,
        recipientPubKeysHex,
        recipientPrivKeysHex
      )).rejects.toThrow();
    });
  });

  describe('Key Vault & Password Safety Tests', () => {
    const password = "SuperSecretPassword123!";

    test('Vault contains no plaintext mnemonic or seed', async () => {
      const iterations = 10000; // use lower iterations for fast testing
      const encrypted = await crypto.encryptMnemonic(testMnemonic, password, iterations);
      
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.kdfParams).toBeDefined();
      expect(encrypted.kdfParams.iterations).toBe(iterations);
      expect(encrypted.kdfParams.version).toBe(2);

      // Verify no fields contain raw mnemonic words
      const jsonStr = JSON.stringify(encrypted);
      testMnemonic.split(' ').forEach(word => {
        expect(jsonStr).not.toContain(word);
      });
    });

    test('Wrong password decryption fails cleanly without leaking seeds', async () => {
      const iterations = 10000;
      const encrypted = await crypto.encryptMnemonic(testMnemonic, password, iterations);
      
      // Decrypt with incorrect password
      await expect(crypto.decryptMnemonic(encrypted, "WrongPassword!")).rejects.toThrow();
    });

    test('Successfully decrypts legacy v1 flat envelopes and supports v2 migration path', async () => {
      // Simulate v1 envelope (flat format with salt/iv, no kdfParams block, 100,000 default iterations)
      const salt = window.crypto.getRandomValues(new Uint8Array(32));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Manually encrypt using 100,000 iterations to match legacy v1 behavior
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
        salt: crypto.bytesToHex(salt) // flat field
      };

      // 1. Decrypt v1 envelope
      const decrypted = await crypto.decryptMnemonic(v1Envelope, password);
      expect(decrypted).toBe(testMnemonic);

      // 2. Migration verification: ensure we can re-encrypt to v2 format
      const migrated = await crypto.encryptMnemonic(decrypted, password, 10000);
      expect(migrated.kdfParams.version).toBe(2);
      expect(migrated.kdfParams.iterations).toBe(10000);
      expect(migrated.salt).toBeUndefined(); // salt should now be nested inside kdfParams

      const decryptedV2 = await crypto.decryptMnemonic(migrated, password);
      expect(decryptedV2).toBe(testMnemonic);
    });
  });
});

// Helper for manually deriving key matching crypto.js implementation
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
