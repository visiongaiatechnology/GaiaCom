import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { shake256, sha3_512 } from '@noble/hashes/sha3.js';
import { hqc256Encapsulate, hqc256Decapsulate, sovereignSeal, sovereignOpen } from './sovereignCrypto.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';

const STANDARD_ALGORITHM_SUITE = 'GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM';
const TOP_SECRET_ALGORITHM_SUITE = 'GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87';
const SOVEREIGN_ACCELERATED_SUITE = 'GaiaCom/v1.0/sovereign-accelerated/X25519+ML-KEM-1024+HQC-256/Twofish-256-EAX+AES-256-GCM/Ed25519';
const SOVEREIGN_TOP_SECRET_SUITE = 'GaiaCom/v1.0/sovereign-top-secret/X25519+ML-KEM-1024+HQC-256/Serpent-256-CTR-HMAC-SHA3-512+Twofish-256-EAX+XChaCha20-Poly1305+AES-256-GCM-SIV/Ed25519+ML-DSA-87';
export const TOP_SECRET_CHAT_ALGORITHM_SUITE = SOVEREIGN_TOP_SECRET_SUITE;

// --- Utility Helpers ---

export function hexToBytes(hex) {
  if (typeof hex !== 'string') return new Uint8Array(0);
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes) {
  const arr = Array.from(bytes);
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

function deriveBytes(label, masterKey, size) {
  const labelBytes = new TextEncoder().encode(label);
  const input = new Uint8Array(labelBytes.length + 1 + masterKey.length);
  input.set(labelBytes, 0);
  input.set([0], labelBytes.length);
  input.set(masterKey, labelBytes.length + 1);
  return shake256(input, { dkLen: size });
}

// Length-prefixed combiner helper for hybrid secrets
function combineSecretsLengthPrefixed(sec1, sec2) {
  const buf = new Uint8Array(4 + sec1.length + 4 + sec2.length);
  const view = new DataView(buf.buffer);
  view.setUint32(0, sec1.length, false);
  buf.set(sec1, 4);
  view.setUint32(4 + sec1.length, sec2.length, false);
  buf.set(sec2, 4 + sec1.length + 4);
  return buf;
}

// 2-byte length prefixed string encoder helper
function encodeStringPrefixed(str) {
  const bytes = new TextEncoder().encode(str);
  const buf = new Uint8Array(2 + bytes.length);
  buf[0] = (bytes.length >> 8) & 0xff;
  buf[1] = bytes.length & 0xff;
  buf.set(bytes, 2);
  return buf;
}

// Cryptographically secure random UUID generator helper
function generateUUID() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Canonical Binary AAD Serialization function (Transcript Binding)
export function buildCanonicalAAD({
  protocol_version,
  algorithm_suite,
  sender_identity_key,
  recipient_identity_key,
  recipient_device_key,
  recipient_device_key_id = '',
  ephemeral_x25519_public_key,
  mlkem_ciphertext,
  message_id,
  timestamp,
  iv
}) {
  const verBytes = encodeStringPrefixed(protocol_version);
  const suiteBytes = encodeStringPrefixed(algorithm_suite);
  
  const senderBytes = typeof sender_identity_key === 'string' ? hexToBytes(sender_identity_key) : sender_identity_key;
  const recipientBytes = typeof recipient_identity_key === 'string' ? hexToBytes(recipient_identity_key) : recipient_identity_key;
  const devBytes = typeof recipient_device_key === 'string' ? hexToBytes(recipient_device_key) : recipient_device_key;
  const ephemBytes = typeof ephemeral_x25519_public_key === 'string' ? hexToBytes(ephemeral_x25519_public_key) : ephemeral_x25519_public_key;
  
  // Hash KEM ciphertext to 32 bytes to keep the AAD compact and fixed size
  const kemHash = protocol_version === 'v1.0'
    ? shake256(mlkem_ciphertext, { dkLen: 32 })
    : sha256(mlkem_ciphertext);
  
  const deviceIdBytes = recipient_device_key_id ? encodeStringPrefixed(recipient_device_key_id) : new Uint8Array(0);
  const msgIdBytes = encodeStringPrefixed(message_id);
  
  const tsBytes = new Uint8Array(8);
  const tsView = new DataView(tsBytes.buffer);
  const hi = Math.floor(timestamp / 0x100000000);
  const lo = timestamp % 0x100000000;
  tsView.setUint32(0, hi, false);
  tsView.setUint32(4, lo, false);
  
  const totalLength = verBytes.length + suiteBytes.length + 32 + 32 + 32 + deviceIdBytes.length + 32 + 32 + msgIdBytes.length + 8 + 12;
  const aad = new Uint8Array(totalLength);
  
  let offset = 0;
  aad.set(verBytes, offset); offset += verBytes.length;
  aad.set(suiteBytes, offset); offset += suiteBytes.length;
  aad.set(senderBytes, offset); offset += 32;
  aad.set(recipientBytes, offset); offset += 32;
  aad.set(devBytes, offset); offset += 32;
  if (deviceIdBytes.length) { aad.set(deviceIdBytes, offset); offset += deviceIdBytes.length; }
  aad.set(ephemBytes, offset); offset += 32;
  aad.set(kemHash, offset); offset += 32;
  aad.set(msgIdBytes, offset); offset += msgIdBytes.length;
  aad.set(tsBytes, offset); offset += 8;
  aad.set(iv, offset); offset += 12;
  
  return aad;
}

// Canonical Binary Signature Payload Builder
export function buildCanonicalSignaturePayload({
  protocol_version,
  algorithm_suite,
  sender,
  recipient,
  device_key,
  recipient_device_key_id = '',
  ephemeral_key,
  mlkem_ciphertext_hash,
  message_id,
  timestamp,
  iv,
  ciphertext_hash
}) {
  const verBytes = encodeStringPrefixed(protocol_version);
  const suiteBytes = encodeStringPrefixed(algorithm_suite);
  
  const senderBytes = typeof sender === 'string' ? hexToBytes(sender) : sender;
  const recipientBytes = typeof recipient === 'string' ? hexToBytes(recipient) : recipient;
  const devBytes = typeof device_key === 'string' ? hexToBytes(device_key) : device_key;
  const ephemBytes = typeof ephemeral_key === 'string' ? hexToBytes(ephemeral_key) : ephemeral_key;
  const kemHash = typeof mlkem_ciphertext_hash === 'string' ? hexToBytes(mlkem_ciphertext_hash) : mlkem_ciphertext_hash;
  const cipherHash = typeof ciphertext_hash === 'string' ? hexToBytes(ciphertext_hash) : ciphertext_hash;
  
  const deviceIdBytes = recipient_device_key_id ? encodeStringPrefixed(recipient_device_key_id) : new Uint8Array(0);
  const msgIdBytes = encodeStringPrefixed(message_id);
  
  const tsBytes = new Uint8Array(8);
  const tsView = new DataView(tsBytes.buffer);
  const hi = Math.floor(timestamp / 0x100000000);
  const lo = timestamp % 0x100000000;
  tsView.setUint32(0, hi, false);
  tsView.setUint32(4, lo, false);
  
  const totalLength = verBytes.length + suiteBytes.length + 32 + 32 + 32 + deviceIdBytes.length + 32 + 32 + msgIdBytes.length + 8 + 12 + 32;
  const sigPayload = new Uint8Array(totalLength);
  
  let offset = 0;
  sigPayload.set(verBytes, offset); offset += verBytes.length;
  sigPayload.set(suiteBytes, offset); offset += suiteBytes.length;
  sigPayload.set(senderBytes, offset); offset += 32;
  sigPayload.set(recipientBytes, offset); offset += 32;
  sigPayload.set(devBytes, offset); offset += 32;
  if (deviceIdBytes.length) { sigPayload.set(deviceIdBytes, offset); offset += deviceIdBytes.length; }
  sigPayload.set(ephemBytes, offset); offset += 32;
  sigPayload.set(kemHash, offset); offset += 32;
  sigPayload.set(msgIdBytes, offset); offset += msgIdBytes.length;
  sigPayload.set(tsBytes, offset); offset += 8;
  sigPayload.set(iv, offset); offset += 12;
  sigPayload.set(cipherHash, offset); offset += 32;
  
  return sigPayload;
}

// --- Key Management ---

export function generateMnemonic() {
  return bip39.generateMnemonic(wordlist);
}

export function validateMnemonic(mnemonic) {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

export function deriveKeysFromMnemonic(mnemonic) {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Ungültiges Mnemonic');
  }

  // Derive master seed
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  
  // Use SHA3-Shake256 to hash seed to 32-byte master key
  const masterKey = shake256(seed, { dkLen: 32 });

  // 1. Ed25519 Signing Keys
  const signSeed = deriveBytes('gaiacom.identity.sign.ed25519.v1', masterKey, 32);
  const signPub = ed25519.getPublicKey(signSeed);

  // 2. X25519 Encryption Keys
  const boxSeed = deriveBytes('gaiacom.identity.box.x25519.v1', masterKey, 32);
  // Clamping (standard X25519 clamping matched to Go standard)
  boxSeed[0] &= 248;
  boxSeed[31] &= 127;
  boxSeed[31] |= 64;
  const boxPub = x25519.getPublicKey(boxSeed);

  // 3. ML-KEM-1024 Post-Quantum Keys
  const kemSeed = deriveBytes('gaiacom.identity.pq.mlkem1024.v1', masterKey, 64);
  const kemKeyPair = ml_kem1024.keygen(kemSeed);

  // 4. ML-DSA-87 / Dilithium-5 signature keys for Top Secret mode
  const mldsaSeed = deriveBytes('gaiacom.identity.sign.ml-dsa-87.v1', masterKey, ml_dsa87.lengths.seed || 32);
  const mldsaKeyPair = ml_dsa87.keygen(mldsaSeed);

  return {
    mnemonic,
    keys: {
      sign: {
        public: bytesToHex(signPub),
        private: bytesToHex(signSeed),
      },
      box: {
        public: bytesToHex(boxPub),
        private: bytesToHex(boxSeed),
      },
      pke: {
        public: bytesToHex(kemKeyPair.publicKey),
        private: bytesToHex(kemKeyPair.secretKey),
      },
      mldsa87: {
        public: bytesToHex(mldsaKeyPair.publicKey),
        private: bytesToHex(mldsaKeyPair.secretKey),
      }
    }
  };
}

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

const SOVEREIGN_KEYSET_PROOF_VERSION = 'gaiacom-sovereign-keyset-v1';

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

async function deriveEncryptionKey(password, salt, iterations = 600000) {
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

function base64FromBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
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

function combineSecretSet(secrets) {
  const total = secrets.reduce((size, secret) => size + 4 + secret.length, 0);
  const combined = new Uint8Array(total);
  const view = new DataView(combined.buffer);
  let offset = 0;
  for (const secret of secrets) {
    view.setUint32(offset, secret.length, false);
    offset += 4;
    combined.set(secret, offset);
    offset += secret.length;
  }
  return combined;
}

function isSovereignSuite(suite) {
  return suite === SOVEREIGN_ACCELERATED_SUITE || suite === SOVEREIGN_TOP_SECRET_SUITE;
}

async function encryptSovereignPayload(plaintext, recipientPubKeysHex, senderSignPrivHex, messageId, timestamp, options) {
  const profile = options.sovereignProfile;
  if (profile !== 'accelerated' && profile !== 'top-secret') throw new Error('Souveränes GaiaCom-Profil wurde verworfen.');
  const topSecret = profile === 'top-secret';
  const algorithmSuite = topSecret ? SOVEREIGN_TOP_SECRET_SUITE : SOVEREIGN_ACCELERATED_SUITE;
  const candidateProof = recipientPubKeysHex.keyset_proof || createSovereignKeysetProof(recipientPubKeysHex, senderSignPrivHex);
  if (!verifySovereignKeysetProof({ public_keys: recipientPubKeysHex, keyset_proof: candidateProof })) {
    throw new Error('Souveräne Keyset-Signatur fehlt oder ist ungültig.');
  }
  const recipientPkeBytes = hexToBytes(recipientPubKeysHex.pke);
  const recipientBoxBytes = hexToBytes(recipientPubKeysHex.box);
  const recipientSignBytes = hexToBytes(recipientPubKeysHex.identity);
  const recipientMldsaBytes = hexToBytes(recipientPubKeysHex.mldsa87 || '');
  if (recipientPkeBytes.length !== 1568 || recipientBoxBytes.length !== 32 || recipientSignBytes.length !== 32) {
    throw new Error('Souveräner Empfängerschlüsselsatz wurde verworfen.');
  }
  if (typeof recipientPubKeysHex.hqc256 !== 'string' || recipientPubKeysHex.hqc256.length < 1024) {
    throw new Error('HQC-256 Capability des Empfängers fehlt; Downgrade wurde blockiert.');
  }
  if (topSecret && recipientMldsaBytes.length !== ml_dsa87.lengths.publicKey) {
    throw new Error('Top Secret erfordert ML-DSA-87 Capability des Empfängers.');
  }

  const { cipherText: mlkemCiphertext, sharedSecret: mlkemSecret } = ml_kem1024.encapsulate(recipientPkeBytes);
  const hqc = await hqc256Encapsulate(recipientPubKeysHex.hqc256);
  const hqcCiphertext = hexToBytes(hqc.ciphertextHex);
  const hqcSecret = hexToBytes(hqc.sharedSecretHex);
  const ephemeralPrivate = window.crypto.getRandomValues(new Uint8Array(32));
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate);
  const x25519Secret = x25519.getSharedSecret(ephemeralPrivate, recipientBoxBytes);
  ephemeralPrivate.fill(0);

  const kemTranscript = combineSecretSet([mlkemCiphertext, hqcCiphertext]);
  const salt = combineSecretSet([ephemeralPublic, mlkemCiphertext, hqcCiphertext]);
  const ikm = combineSecretSet([x25519Secret, mlkemSecret, hqcSecret]);
  const rootSecret = hkdf(sha3_512, ikm, salt, new TextEncoder().encode(algorithmSuite), 32);
  x25519Secret.fill(0);
  mlkemSecret.fill(0);
  hqcSecret.fill(0);
  ikm.fill(0);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const senderPrivate = hexToBytes(senderSignPrivHex);
  const senderPublic = ed25519.getPublicKey(senderPrivate);
  const clientMessageId = messageId || generateUUID();
  const sentAt = timestamp || Date.now();
  const recipientDeviceKeyId = String(options.recipientDeviceKeyId || '');
  const aad = buildCanonicalAAD({
    protocol_version: 'v1.0', algorithm_suite: algorithmSuite,
    sender_identity_key: senderPublic, recipient_identity_key: recipientSignBytes,
    recipient_device_key: recipientBoxBytes, recipient_device_key_id: recipientDeviceKeyId,
    ephemeral_x25519_public_key: ephemeralPublic, mlkem_ciphertext: kemTranscript,
    message_id: clientMessageId, timestamp: sentAt, iv
  });
  let payloadCiphertext;
  try {
    payloadCiphertext = hexToBytes(await sovereignSeal(profile, bytesToHex(rootSecret), bytesToHex(aad), bytesToHex(new TextEncoder().encode(String(plaintext)))));
  } finally {
    rootSecret.fill(0);
  }

  const signaturePayload = buildCanonicalSignaturePayload({
    protocol_version: 'v1.0', algorithm_suite: algorithmSuite,
    sender: senderPublic, recipient: recipientSignBytes, device_key: recipientBoxBytes,
    recipient_device_key_id: recipientDeviceKeyId, ephemeral_key: ephemeralPublic,
    mlkem_ciphertext_hash: shake256(kemTranscript, { dkLen: 32 }), message_id: clientMessageId,
    timestamp: sentAt, iv, ciphertext_hash: shake256(payloadCiphertext, { dkLen: 32 })
  });
  const signature = ed25519.sign(signaturePayload, senderPrivate);
  const signatureBundle = { ed25519: bytesToHex(signature) };
  if (topSecret) {
    const mldsaPrivate = hexToBytes(options.senderMldsa87PrivHex || '');
    if (mldsaPrivate.length !== ml_dsa87.lengths.secretKey) throw new Error('Top Secret erfordert lokalen ML-DSA-87 Private Key.');
    signatureBundle.ml_dsa_87 = bytesToHex(ml_dsa87.sign(signaturePayload, mldsaPrivate));
    signatureBundle.ml_dsa_87_public = bytesToHex(ml_dsa87.getPublicKey(mldsaPrivate));
    mldsaPrivate.fill(0);
  }
  senderPrivate.fill(0);

  return {
    algorithm_suite: algorithmSuite,
    kem_ciphertext: bytesToHex(mlkemCiphertext), hqc_ciphertext: bytesToHex(hqcCiphertext),
    ephemeral_pub: bytesToHex(ephemeralPublic), payload_ciphertext: bytesToHex(payloadCiphertext),
    iv: bytesToHex(iv), signature: bytesToHex(signature), signature_bundle: signatureBundle,
    sender_mldsa87_public: signatureBundle.ml_dsa_87_public || '', client_message_id: clientMessageId,
    timestamp: sentAt, recipient_device_key_id: recipientDeviceKeyId,
    recipient_device_box_public: bytesToHex(recipientBoxBytes), sovereign_profile: profile
  };
}

async function decryptSovereignPayload(envelope, senderSignPubHex, recipientPubKeysHex, recipientPrivKeysHex, options) {
  const algorithmSuite = envelope.algorithm_suite;
  const topSecret = algorithmSuite === SOVEREIGN_TOP_SECRET_SUITE;
  const profile = topSecret ? 'top-secret' : 'accelerated';
  if (!isSovereignSuite(algorithmSuite) || envelope.sovereign_profile !== profile) throw new Error('Souveräne Suite-Bindung wurde verworfen.');
  const mlkemCiphertext = hexToBytes(envelope.kem_ciphertext);
  const hqcCiphertext = hexToBytes(envelope.hqc_ciphertext);
  const ephemeralPublic = hexToBytes(envelope.ephemeral_pub);
  const payloadCiphertext = hexToBytes(envelope.payload_ciphertext);
  const iv = hexToBytes(envelope.iv);
  const senderPublic = hexToBytes(senderSignPubHex);
  const recipientPke = hexToBytes(recipientPubKeysHex.pke);
  const recipientBox = hexToBytes(recipientPubKeysHex.box);
  const recipientIdentity = hexToBytes(recipientPubKeysHex.identity);
  if (mlkemCiphertext.length !== 1568 || ephemeralPublic.length !== 32 || iv.length !== 12 || senderPublic.length !== 32 || recipientPke.length !== 1568 || recipientBox.length !== 32 || recipientIdentity.length !== 32) {
    throw new Error('Souveräne Nachrichtengrenzen wurden verletzt.');
  }
  if (!envelope.client_message_id || !envelope.timestamp || !recipientPrivKeysHex.hqc256) throw new Error('Souveräne Nachricht oder HQC-256 Key fehlt.');

  const kemTranscript = combineSecretSet([mlkemCiphertext, hqcCiphertext]);
  const recipientDeviceKeyId = String(envelope.recipient_device_key_id || '');
  const aad = buildCanonicalAAD({
    protocol_version: 'v1.0', algorithm_suite: algorithmSuite,
    sender_identity_key: senderPublic, recipient_identity_key: recipientIdentity,
    recipient_device_key: recipientBox, recipient_device_key_id: recipientDeviceKeyId,
    ephemeral_x25519_public_key: ephemeralPublic, mlkem_ciphertext: kemTranscript,
    message_id: envelope.client_message_id, timestamp: envelope.timestamp, iv
  });
  const signaturePayload = buildCanonicalSignaturePayload({
    protocol_version: 'v1.0', algorithm_suite: algorithmSuite,
    sender: senderPublic, recipient: recipientIdentity, device_key: recipientBox,
    recipient_device_key_id: recipientDeviceKeyId, ephemeral_key: ephemeralPublic,
    mlkem_ciphertext_hash: shake256(kemTranscript, { dkLen: 32 }), message_id: envelope.client_message_id,
    timestamp: envelope.timestamp, iv, ciphertext_hash: shake256(payloadCiphertext, { dkLen: 32 })
  });
  if (!ed25519.verify(hexToBytes(envelope.signature), signaturePayload, senderPublic)) throw new Error('Souveräne Nachrichtensignatur wurde verworfen.');
  if (topSecret) {
    const publicKey = hexToBytes(envelope.signature_bundle?.ml_dsa_87_public || '');
    const expected = hexToBytes(options?.expectedSenderMldsa87PubHex || '');
    const signature = hexToBytes(envelope.signature_bundle?.ml_dsa_87 || '');
    if (publicKey.length !== ml_dsa87.lengths.publicKey || expected.length !== ml_dsa87.lengths.publicKey || bytesToHex(publicKey) !== bytesToHex(expected) || !ml_dsa87.verify(signature, signaturePayload, publicKey)) {
      throw new Error('Top-Secret-Hybridsignatur wurde verworfen.');
    }
  }

  const mlkemSecret = ml_kem1024.decapsulate(mlkemCiphertext, hexToBytes(recipientPrivKeysHex.pke));
  const hqcSecret = hexToBytes(await hqc256Decapsulate(envelope.hqc_ciphertext, recipientPrivKeysHex.hqc256));
  const x25519Secret = x25519.getSharedSecret(hexToBytes(recipientPrivKeysHex.box), ephemeralPublic);
  const salt = combineSecretSet([ephemeralPublic, mlkemCiphertext, hqcCiphertext]);
  const ikm = combineSecretSet([x25519Secret, mlkemSecret, hqcSecret]);
  const rootSecret = hkdf(sha3_512, ikm, salt, new TextEncoder().encode(algorithmSuite), 32);
  x25519Secret.fill(0); mlkemSecret.fill(0); hqcSecret.fill(0); ikm.fill(0);
  let plaintextHex;
  try {
    plaintextHex = await sovereignOpen(profile, bytesToHex(rootSecret), bytesToHex(aad), envelope.payload_ciphertext);
  } finally {
    rootSecret.fill(0);
  }
  return new TextDecoder().decode(hexToBytes(plaintextHex));
}
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

export function calculateReportProof(messageIDStr, senderPubKeyHex, recipientPubKeyHex, ciphertextHashHex) {
  const msgUUIDBytes = parseUUID(messageIDStr);
  const senderPubBytes = hexToBytes(senderPubKeyHex);
  const recipientPubBytes = hexToBytes(recipientPubKeyHex);
  const ciphertextHashBytes = hexToBytes(ciphertextHashHex);

  const input = new Uint8Array(
    msgUUIDBytes.length + senderPubBytes.length + recipientPubBytes.length + ciphertextHashBytes.length
  );
  input.set(msgUUIDBytes, 0);
  input.set(senderPubBytes, msgUUIDBytes.length);
  input.set(recipientPubBytes, msgUUIDBytes.length + senderPubBytes.length);
  input.set(ciphertextHashBytes, msgUUIDBytes.length + senderPubBytes.length + recipientPubBytes.length);

  return bytesToHex(sha256(input));
}

export function sha256Hex(hexStr) {
  const bytes = hexToBytes(hexStr);
  return bytesToHex(sha256(bytes));
}

function parseUUID(uuidStr) {
  const hex = uuidStr.replace(/-/g, '');
  return hexToBytes(hex);
}

export async function stripImageMetadata(file) {
  if (!file || !file.type.startsWith('image/')) return file;

  const outputTypes = new Map([
    ['image/jpeg', { type: 'image/jpeg', extension: '.jpg' }],
    ['image/png', { type: 'image/png', extension: '.png' }],
    ['image/webp', { type: 'image/webp', extension: '.webp' }]
  ]);
  const output = outputTypes.get(file.type.toLowerCase());
  if (!output) throw new Error('Unsupported image format.');
  if (file.size <= 0 || file.size > 25 * 1024 * 1024) throw new Error('Image size boundary violation.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (bitmap.width <= 0 || bitmap.height <= 0 || bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('Image dimensions exceed the safe processing boundary.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { alpha: output.type !== 'image/jpeg' });
    if (!context) throw new Error('Secure image processing unavailable.');
    context.drawImage(bitmap, 0, 0);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (encoded) => encoded ? resolve(encoded) : reject(new Error('Secure image re-encoding failed.')),
        output.type,
        output.type === 'image/jpeg' ? 0.92 : undefined
      );
    });
    const baseName = String(file.name || 'image').replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'image';
    return new File([blob], `${baseName}${output.extension}`, { type: output.type, lastModified: Date.now() });
  } catch (_) {
    throw new Error('Image rejected by secure metadata processing.');
  } finally {
    if (bitmap) bitmap.close();
  }
}

export async function encryptFileSymmetric(fileBlob) {
  const rawKey = window.crypto.getRandomValues(new Uint8Array(32));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);

  const arrayBuffer = await fileBlob.arrayBuffer();
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    arrayBuffer
  );

  return {
    encryptedBlob: new Blob([encryptedBuf], { type: 'application/octet-stream' }),
    keyHex: bytesToHex(rawKey),
    ivHex: bytesToHex(iv)
  };
}

export async function decryptFileSymmetric(encryptedBlob, keyHex, ivHex) {
  const rawKey = hexToBytes(keyHex);
  const iv = hexToBytes(ivHex);
  const cryptoKey = await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);

  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    arrayBuffer
  );

  return new Blob([decryptedBuf]);
}

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
