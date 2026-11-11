/*
 * Low-level primitives: length-prefixed secret combiners and PBKDF2 key derivation.
 */


export function combineSecretsLengthPrefixed(sec1, sec2) {
  const buf = new Uint8Array(4 + sec1.length + 4 + sec2.length);
  const view = new DataView(buf.buffer);
  view.setUint32(0, sec1.length, false);
  buf.set(sec1, 4);
  view.setUint32(4 + sec1.length, sec2.length, false);
  buf.set(sec2, 4 + sec1.length + 4);
  return buf;
}

// 2-byte length prefixed string encoder helper

export function combineSecretSet(secrets) {
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

export async function deriveEncryptionKey(password, salt, iterations = 600000) {
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
