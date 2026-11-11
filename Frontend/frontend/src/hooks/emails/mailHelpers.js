// useEmails shared helpers/constants (moved verbatim from useEmails.js).
import * as crypto from '../../crypto';
import { safeJsonParse } from '../../utils/safeJson';

export function parsePublicRecordValue(recordValue) {
  if (!recordValue) return null;
  if (typeof recordValue === 'string') {
    return safeJsonParse(recordValue, null);
  }
  if (typeof recordValue === 'object') return recordValue;
  return null;
}

export function parseMailboxLabels(labels) {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === 'string') {
    const parsed = safeJsonParse(labels, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

export const GAIA_MAIL_MAX_BYTES = 10 * 1024 * 1024 * 1024;
export const AES_GCM_TAG_BYTES = 16;
export const STORAGE_CHUNK_BYTES = 1024 * 1024;
export const GAIA_MAIL_CHUNK_BYTES = STORAGE_CHUNK_BYTES - AES_GCM_TAG_BYTES;

export function encryptedChunkedSize(plainSize) {
  const chunks = Math.max(1, Math.ceil(plainSize / GAIA_MAIL_CHUNK_BYTES));
  return plainSize + (chunks * AES_GCM_TAG_BYTES);
}

export async function computeSha256Hex(bufferSource) {
  const digest = await window.crypto.subtle.digest('SHA-256', bufferSource);
  return crypto.bytesToHex(new Uint8Array(digest));
}

export function randomHex(byteLength) {
  return crypto.bytesToHex(window.crypto.getRandomValues(new Uint8Array(byteLength)));
}
