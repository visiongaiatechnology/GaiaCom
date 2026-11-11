/*
 * Symmetric file encryption and secure image metadata stripping.
 */

import { hexToBytes, bytesToHex } from './format.js';

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
