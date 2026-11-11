// useChat shared pure helpers (moved verbatim from useChat.js).
import { safeJsonParse } from '../../utils/safeJson';

export function parsePublicRecordValue(recordValue) {
  if (!recordValue) return null;
  if (typeof recordValue === 'string') return safeJsonParse(recordValue, null);
  if (typeof recordValue === 'object') return recordValue;
  return null;
}

export function hasMldsa87Capability(pubRecord) {
  return Boolean(pubRecord?.public_keys?.mldsa87 && String(pubRecord.public_keys.mldsa87).trim());
}

export function bufToHex(buf) {
  return Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('');
}

export async function computeSha256Hex(arrayBuffer) {
  const hashBuf = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
  return bufToHex(hashBuf);
}
