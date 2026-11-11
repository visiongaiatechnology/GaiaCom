/*
 * Canonical binary AAD and signature-transcript serialization (field order unchanged).
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { shake256 } from '@noble/hashes/sha3.js';
import { hexToBytes, encodeStringPrefixed } from './format.js';

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
