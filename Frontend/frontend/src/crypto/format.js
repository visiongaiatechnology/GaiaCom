/*
 * Encoding/serialization helpers (hex, base64, UUID, canonical digest helpers).
 */

import { sha256 } from '@noble/hashes/sha2.js';

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

export function encodeStringPrefixed(str) {
  const bytes = new TextEncoder().encode(str);
  const buf = new Uint8Array(2 + bytes.length);
  buf[0] = (bytes.length >> 8) & 0xff;
  buf[1] = bytes.length & 0xff;
  buf.set(bytes, 2);
  return buf;
}

// Cryptographically secure random UUID generator helper

export function generateUUID() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Canonical Binary AAD Serialization function (Transcript Binding)

export function base64FromBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

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
