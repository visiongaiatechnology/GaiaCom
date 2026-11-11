/**
 * VGT GaiaCom — client-side media limits (SEC-FE FE-03/FE-10).
 *
 * The backend accepts envelopes up to several GiB, but the browser must never
 * download + AES-GCM-decrypt an attacker-controlled payload of unbounded size:
 * that freezes tabs and exhausts memory. Every decrypt path therefore checks a
 * byte cap BEFORE decrypting and validates image magic bytes after decrypting.
 *
 * Choices (documented, intentionally conservative):
 *   avatar          2 MiB   — avatars are small by definition
 *   inline images  25 MiB   — GSN posts / channel images after client compression
 *   mail attachment 128 MiB  — browser decrypt buffer; larger files must use a
 *                              desktop/native path, not the web tab
 *
 * These are client safety caps, not a MIME/size gate on the server (FIND-012 /
 * FIND-024 stay backend work).
 */

export const KIB = 1024;
export const MIB = 1024 * KIB;

export const MAX_AVATAR_BYTES = 2 * MIB;
export const MAX_GSN_IMAGE_BYTES = 25 * MIB;
export const MAX_CHANNEL_IMAGE_BYTES = 25 * MIB;
export const MAX_MAIL_ATTACHMENT_BYTES = 128 * MIB;
export const MAX_DIRECT_ATTACHMENT_BYTES = 128 * MIB;
// GaiaDrive cloud downloads: existing cloud uploads are capped at 20 MiB, but
// older/other clients may store more — allow a safe decrypt buffer without
// ever buffering an attacker-inflated blob (SEC-FE FE-03 residual).
export const MAX_DRIVE_CLOUD_DOWNLOAD_BYTES = 64 * MIB;

/** Image types the clients render inline. Anything else is not treated as an image. */
export const ALLOWED_IMAGE_MIME = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif'
]);

export function formatByteLimit(maxBytes) {
  const value = Number(maxBytes) || 0;
  if (value >= MIB) return `${Math.round((value / MIB) * 10) / 10} MB`;
  if (value >= KIB) return `${Math.round(value / KIB)} KB`;
  return `${value} B`;
}

export function exceedsLimit(byteLength, maxBytes) {
  const size = Number(byteLength);
  return Number.isFinite(size) && size > Number(maxBytes);
}

export function limitError(label, maxBytes) {
  return new Error(
    `${label} überschreitet das sichere Browser-Limit von ${formatByteLimit(maxBytes)} und wird nicht entschlüsselt.`
  );
}

function byteAt(bytes, index) {
  return bytes[index] || 0;
}

/**
 * Detect an allowed image signature from the first bytes of a payload.
 * Returns a MIME type or null. This is a magic-byte check, not trust in a
 * declared MIME string.
 */
export function sniffImageMime(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (
    byteAt(bytes, 0) === 0x89 && byteAt(bytes, 1) === 0x50 && byteAt(bytes, 2) === 0x4e && byteAt(bytes, 3) === 0x47 &&
    byteAt(bytes, 4) === 0x0d && byteAt(bytes, 5) === 0x0a && byteAt(bytes, 6) === 0x1a && byteAt(bytes, 7) === 0x0a
  ) {
    return 'image/png';
  }
  if (byteAt(bytes, 0) === 0xff && byteAt(bytes, 1) === 0xd8 && byteAt(bytes, 2) === 0xff) {
    return 'image/jpeg';
  }
  if (byteAt(bytes, 0) === 0x47 && byteAt(bytes, 1) === 0x49 && byteAt(bytes, 2) === 0x46 && byteAt(bytes, 3) === 0x38) {
    return 'image/gif';
  }
  if (
    byteAt(bytes, 0) === 0x52 && byteAt(bytes, 1) === 0x49 && byteAt(bytes, 2) === 0x46 && byteAt(bytes, 3) === 0x46 &&
    byteAt(bytes, 8) === 0x57 && byteAt(bytes, 9) === 0x45 && byteAt(bytes, 10) === 0x42 && byteAt(bytes, 11) === 0x50
  ) {
    return 'image/webp';
  }
  // ISO-BMFF: bytes 4..8 = "ftyp", brand at 8..12 (avif/avis).
  if (
    byteAt(bytes, 4) === 0x66 && byteAt(bytes, 5) === 0x74 && byteAt(bytes, 6) === 0x79 && byteAt(bytes, 7) === 0x70 &&
    byteAt(bytes, 8) === 0x61 && byteAt(bytes, 9) === 0x76 && byteAt(bytes, 10) === 0x69 &&
    (byteAt(bytes, 11) === 0x66 || byteAt(bytes, 11) === 0x73)
  ) {
    return 'image/avif';
  }
  return null;
}

export function isAllowedImageMime(mime) {
  return ALLOWED_IMAGE_MIME.includes(String(mime || '').toLowerCase());
}

export function assertImageSignatureFromBytes(bytes, label = 'Bild') {
  const mime = sniffImageMime(bytes);
  if (!mime) {
    throw new Error(`${label} hat keine zulässige Bildsignatur und wird nicht angezeigt.`);
  }
  return mime;
}

/**
 * Validate a decrypted image Blob without buffering the whole payload: only the
 * first 16 bytes are read for the magic-byte check.
 */
export async function assertImageBlob(blob, label = 'Bild') {
  if (!blob || typeof blob.slice !== 'function') {
    throw new Error(`${label} konnte nicht geprüft werden.`);
  }
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  return assertImageSignatureFromBytes(head, label);
}
