/*
 * Standard / top-secret envelope encrypt/decrypt with AAD + Ed25519 binding.
 */

import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { STANDARD_ALGORITHM_SUITE, TOP_SECRET_ALGORITHM_SUITE, isSovereignSuite } from './suites.js';
import { hexToBytes, bytesToHex, generateUUID } from './format.js';
import { combineSecretsLengthPrefixed } from './primitives.js';
import { buildCanonicalAAD, buildCanonicalSignaturePayload } from './canonical.js';
import { encryptSovereignPayload, decryptSovereignPayload } from './sovereignEnvelope.js';

export async function encryptPayload(plaintext, recipientPubKeysHex, senderSignPrivHex, messageId, timestamp, options = {}) {
  if (options?.sovereignProfile) return encryptSovereignPayload(plaintext, recipientPubKeysHex, senderSignPrivHex, messageId, timestamp, options);
  const topSecret = options?.topSecret === true;
  const recipientDeviceKeyId = String(options?.recipientDeviceKeyId || '');
  const algorithmSuite = topSecret ? TOP_SECRET_ALGORITHM_SUITE : STANDARD_ALGORITHM_SUITE;
  const recipientPkeBytes = hexToBytes(recipientPubKeysHex.pke);
  const recipientBoxBytes = hexToBytes(recipientPubKeysHex.box);
  const recipientSignBytes = hexToBytes(recipientPubKeysHex.identity);
  const recipientMldsaBytes = hexToBytes(recipientPubKeysHex.mldsa87 || '');

  if (recipientPkeBytes.length !== 1568) {
    throw new Error('Ungültige ML-KEM Public Key Länge (fail-closed)');
  }
  if (recipientBoxBytes.length !== 32) {
    throw new Error('Ungültige X25519 Public Key Länge (fail-closed)');
  }
  if (recipientSignBytes.length !== 32) {
    throw new Error('Ungültige Empfänger-Identitätsschlüssel Länge (fail-closed)');
  }

  if (topSecret && recipientMldsaBytes.length !== ml_dsa87.lengths.publicKey) {
    throw new Error('Top Secret erfordert ML-DSA-87 Capability des Empfaengers.');
  }

  // 1. ML-KEM-1024 Encapsulation
  const { cipherText: kemCiphertext, sharedSecret: kemSecret } = ml_kem1024.encapsulate(recipientPkeBytes);

  // 2. Ephemeral X25519 ECDH
  const ephemeralSeed = window.crypto.getRandomValues(new Uint8Array(32));
  const ephemeralPub = x25519.getPublicKey(ephemeralSeed);
  const x25519Secret = x25519.getSharedSecret(ephemeralSeed, recipientBoxBytes);

  // 3. HKDF Combine (Length-prefixed combiner for secrets)
  const salt = new Uint8Array(ephemeralPub.length + kemCiphertext.length);
  salt.set(ephemeralPub, 0);
  salt.set(kemCiphertext, ephemeralPub.length);

  const ikm = combineSecretsLengthPrefixed(x25519Secret, kemSecret);
  const info = new TextEncoder().encode(algorithmSuite);
  
  const combinedSecret = hkdf(sha256, ikm, salt, info, 32);

  // 4. IV and AAD construction (Transcript Binding)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const senderSignPrivBytes = hexToBytes(senderSignPrivHex);
  const senderSignPubBytes = ed25519.getPublicKey(senderSignPrivBytes);

  const client_message_id = messageId || generateUUID();
  const ts = timestamp || Date.now();

  const aadBytes = buildCanonicalAAD({
    protocol_version: "v0.1",
    algorithm_suite: algorithmSuite,
    sender_identity_key: senderSignPubBytes,
    recipient_identity_key: recipientSignBytes,
    recipient_device_key: recipientBoxBytes,
    recipient_device_key_id: recipientDeviceKeyId,
    ephemeral_x25519_public_key: ephemeralPub,
    mlkem_ciphertext: kemCiphertext,
    message_id: client_message_id,
    timestamp: ts,
    iv: iv
  });

  // 5. Symmetric Encryption via Web Crypto AES-GCM with AAD
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    combinedSecret,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv, additionalData: aadBytes },
    cryptoKey,
    plaintextBytes
  );
  
  const payloadCiphertext = new Uint8Array(encryptedBuf);

  // 6. Sign the entire envelope context deterministically using Sender's Ed25519 private key
  const kemCiphertextHash = sha256(kemCiphertext);
  const ciphertextHash = sha256(payloadCiphertext);

  const sigPayload = buildCanonicalSignaturePayload({
    protocol_version: "v0.1",
    algorithm_suite: algorithmSuite,
    sender: senderSignPubBytes,
    recipient: recipientSignBytes,
    device_key: recipientBoxBytes,
    recipient_device_key_id: recipientDeviceKeyId,
    ephemeral_key: ephemeralPub,
    mlkem_ciphertext_hash: kemCiphertextHash,
    message_id: client_message_id,
    timestamp: ts,
    iv: iv,
    ciphertext_hash: ciphertextHash
  });

  const signature = ed25519.sign(sigPayload, senderSignPrivBytes);
  const signatureBundle = {
    ed25519: bytesToHex(signature)
  };
  if (topSecret) {
    const senderMldsaPrivBytes = hexToBytes(options?.senderMldsa87PrivHex || '');
    if (senderMldsaPrivBytes.length !== ml_dsa87.lengths.secretKey) {
      throw new Error('Top Secret erfordert lokalen ML-DSA-87 Private Key.');
    }
    signatureBundle.ml_dsa_87 = bytesToHex(ml_dsa87.sign(sigPayload, senderMldsaPrivBytes));
    signatureBundle.ml_dsa_87_public = bytesToHex(ml_dsa87.getPublicKey(senderMldsaPrivBytes));
  }

  return {
    algorithm_suite: algorithmSuite,
    kem_ciphertext: bytesToHex(kemCiphertext),
    ephemeral_pub: bytesToHex(ephemeralPub),
    payload_ciphertext: bytesToHex(payloadCiphertext),
    iv: bytesToHex(iv),
    signature: bytesToHex(signature),
    signature_bundle: signatureBundle,
    sender_mldsa87_public: signatureBundle.ml_dsa_87_public || '',
    client_message_id,
    timestamp: ts,
    recipient_device_key_id: recipientDeviceKeyId,
    recipient_device_box_public: bytesToHex(recipientBoxBytes)
  };
}

export async function decryptPayload(envelope, senderSignPubHex, recipientPubKeysHex, recipientPrivKeysHex, options = {}) {
  const algorithmSuite = envelope.algorithm_suite || STANDARD_ALGORITHM_SUITE;
  if (isSovereignSuite(algorithmSuite)) return decryptSovereignPayload(envelope, senderSignPubHex, recipientPubKeysHex, recipientPrivKeysHex, options);
  const topSecret = algorithmSuite === TOP_SECRET_ALGORITHM_SUITE;
  const kemCiphertextBytes = hexToBytes(envelope.kem_ciphertext);
  const ephemeralPubBytes = hexToBytes(envelope.ephemeral_pub);
  const payloadCiphertextBytes = hexToBytes(envelope.payload_ciphertext);
  const signatureBytes = hexToBytes(envelope.signature);
  const senderSignPubBytes = hexToBytes(senderSignPubHex);
  const senderMldsaPubBytes = hexToBytes(envelope.signature_bundle?.ml_dsa_87_public || envelope.sender_mldsa87_public || envelope.senderMldsa87Public || '');
  const ivBytes = hexToBytes(envelope.iv);

  const recipientPkeBytes = hexToBytes(recipientPubKeysHex.pke);
  const recipientBoxBytes = hexToBytes(recipientPubKeysHex.box);
  const recipientSignBytes = hexToBytes(recipientPubKeysHex.identity);
  
  const recipientKemPrivBytes = hexToBytes(recipientPrivKeysHex.pke);
  const recipientBoxPrivBytes = hexToBytes(recipientPrivKeysHex.box);

  const client_message_id = envelope.client_message_id;
  const recipientDeviceKeyId = String(envelope.recipient_device_key_id || '');
  const ts = envelope.timestamp;

  if (kemCiphertextBytes.length !== 1568) {
    throw new Error('Ungültige ML-KEM Ciphertext Länge (fail-closed)');
  }
  if (ephemeralPubBytes.length !== 32) {
    throw new Error('Ungültige Ephemeral X25519 Public Key Länge (fail-closed)');
  }
  if (recipientPkeBytes.length !== 1568) {
    throw new Error('Ungültige ML-KEM Empfänger Key Länge (fail-closed)');
  }
  if (recipientBoxBytes.length !== 32) {
    throw new Error('Ungültige X25519 Empfänger Key Länge (fail-closed)');
  }
  if (recipientSignBytes.length !== 32) {
    throw new Error('Ungültige Empfänger-Identitätsschlüssel Länge (fail-closed)');
  }
  if (!client_message_id || !ts) {
    throw new Error('Fehlende Nachricht-Metadaten für AAD Bindung (fail-closed)');
  }

  // 1. Verify Sender Signature over canonical transcript payload
  const kemCiphertextHash = sha256(kemCiphertextBytes);
  const ciphertextHash = sha256(payloadCiphertextBytes);

  const sigPayload = buildCanonicalSignaturePayload({
    protocol_version: "v0.1",
    algorithm_suite: algorithmSuite,
    sender: senderSignPubBytes,
    recipient: recipientSignBytes,
    device_key: recipientBoxBytes,
    recipient_device_key_id: recipientDeviceKeyId,
    ephemeral_key: ephemeralPubBytes,
    mlkem_ciphertext_hash: kemCiphertextHash,
    message_id: client_message_id,
    timestamp: ts,
    iv: ivBytes,
    ciphertext_hash: ciphertextHash
  });

  const isSigValid = ed25519.verify(signatureBytes, sigPayload, senderSignPubBytes);
  if (!isSigValid) {
    throw new Error('Ungültige Nachrichtensignatur (Absender-Authentifizierung fehlgeschlagen)');
  }

  if (topSecret) {
    const mldsaSignature = hexToBytes(envelope.signature_bundle?.ml_dsa_87 || '');
    const expectedSenderMldsaPubHex = options?.expectedSenderMldsa87PubHex || '';
    const expectedSenderMldsaPubBytes = hexToBytes(expectedSenderMldsaPubHex);
    if (senderMldsaPubBytes.length !== ml_dsa87.lengths.publicKey || mldsaSignature.length !== ml_dsa87.lengths.signature) {
      throw new Error('Top Secret Nachricht ohne gueltige ML-DSA-87 Signatur.');
    }
    if (expectedSenderMldsaPubBytes.length !== ml_dsa87.lengths.publicKey) {
      throw new Error('Top Secret Sender ohne verifizierte ML-DSA-87 Capability.');
    }
    if (bytesToHex(senderMldsaPubBytes).toLowerCase() !== bytesToHex(expectedSenderMldsaPubBytes).toLowerCase()) {
      throw new Error('Top Secret ML-DSA-87 Public Key stimmt nicht mit Sender-Identitaet ueberein.');
    }
    if (!ml_dsa87.verify(mldsaSignature, sigPayload, senderMldsaPubBytes)) {
      throw new Error('Ungueltige Top Secret ML-DSA-87 Signatur.');
    }
  }

  // 2. KEM Decapsulation
  const kemSecret = ml_kem1024.decapsulate(kemCiphertextBytes, recipientKemPrivBytes);
  if (!kemSecret || kemSecret.length !== 32) {
    throw new Error('ML-KEM Entkapselungsfehler (fail-closed)');
  }

  // 3. Ephemeral X25519 ECDH
  const x25519Secret = x25519.getSharedSecret(recipientBoxPrivBytes, ephemeralPubBytes);
  if (!x25519Secret || x25519Secret.length !== 32) {
    throw new Error('X25519 ECDH Fehler (fail-closed)');
  }

  // 4. HKDF Combine (Length-prefixed combiner for secrets)
  const salt = new Uint8Array(ephemeralPubBytes.length + kemCiphertextBytes.length);
  salt.set(ephemeralPubBytes, 0);
  salt.set(kemCiphertextBytes, ephemeralPubBytes.length);

  const ikm = combineSecretsLengthPrefixed(x25519Secret, kemSecret);
  const info = new TextEncoder().encode(algorithmSuite);
  
  const combinedSecret = hkdf(sha256, ikm, salt, info, 32);

  // 5. Build AAD
  const aadBytes = buildCanonicalAAD({
    protocol_version: "v0.1",
    algorithm_suite: algorithmSuite,
    sender_identity_key: senderSignPubBytes,
    recipient_identity_key: recipientSignBytes,
    recipient_device_key: recipientBoxBytes,
    recipient_device_key_id: recipientDeviceKeyId,
    ephemeral_x25519_public_key: ephemeralPubBytes,
    mlkem_ciphertext: kemCiphertextBytes,
    message_id: client_message_id,
    timestamp: ts,
    iv: ivBytes
  });

  // 6. Symmetric Decryption via Web Crypto AES-GCM
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    combinedSecret,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes, additionalData: aadBytes },
    cryptoKey,
    payloadCiphertextBytes
  );

  return new TextDecoder().decode(decryptedBuf);
}
