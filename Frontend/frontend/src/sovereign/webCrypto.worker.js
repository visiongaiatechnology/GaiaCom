// STATUS: PLATIN
import { createHQC256 } from './vendor/liboqs-hqc256/hqc-256.js';
import initSovereignWasm, {
  sovereign_open as wasmOpen,
  sovereign_seal as wasmSeal,
  sovereign_self_test as wasmSelfTest
} from './wasm/gaiacom_sovereign_wasm.js';

const HQC_PUBLIC_KEY_BYTES = 7245;
const HQC_SECRET_KEY_BYTES = 7317;
const HQC_CIPHERTEXT_BYTES = 14421;
const HQC_SHARED_SECRET_BYTES = 64;
let initialization;

function bytesToHex(bytes) {
  let output = '';
  for (const byte of bytes) output += byte.toString(16).padStart(2, '0');
  return output;
}

function hexToBytes(value, expectedBytes) {
  if (typeof value !== 'string'
    || value.length !== expectedBytes * 2
    || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error('Sovereign crypto boundary rejected.');
  }
  const output = new Uint8Array(expectedBytes);
  for (let index = 0; index < expectedBytes; index += 1) {
    output[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

function constantTimeEqual(left, right) {
  let difference = left.length ^ right.length;
  const maximum = Math.max(left.length, right.length);
  for (let index = 0; index < maximum; index += 1) {
    difference |= (left[index % Math.max(left.length, 1)] || 0)
      ^ (right[index % Math.max(right.length, 1)] || 0);
  }
  return difference === 0;
}

async function withHqc(operation) {
  const hqc = await createHQC256();
  try {
    return await operation(hqc);
  } finally {
    hqc.destroy();
  }
}

async function initialize() {
  initialization ??= (async () => {
    await initSovereignWasm();
    wasmSelfTest();
    await withHqc(async (hqc) => {
      const { publicKey, secretKey } = hqc.generateKeyPair();
      let ciphertext;
      let sharedSecret;
      let recovered;
      try {
        ({ ciphertext, sharedSecret } = hqc.encapsulate(publicKey));
        recovered = hqc.decapsulate(ciphertext, secretKey);
        if (!constantTimeEqual(sharedSecret, recovered)) {
          throw new Error('Sovereign crypto provider self-test rejected.');
        }
      } finally {
        publicKey.fill(0);
        secretKey.fill(0);
        ciphertext?.fill(0);
        sharedSecret?.fill(0);
        recovered?.fill(0);
      }
    });
    return true;
  })().catch((error) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

async function execute(operation, payload) {
  await initialize();
  switch (operation) {
    case 'selfTest':
      return true;
    case 'keyPair':
      return withHqc(async (hqc) => {
        const { publicKey, secretKey } = hqc.generateKeyPair();
        try {
          return { publicKeyHex: bytesToHex(publicKey), secretKeyHex: bytesToHex(secretKey) };
        } finally {
          publicKey.fill(0);
          secretKey.fill(0);
        }
      });
    case 'encapsulate':
      return withHqc(async (hqc) => {
        const publicKey = hexToBytes(payload.publicKeyHex, HQC_PUBLIC_KEY_BYTES);
        let ciphertext;
        let sharedSecret;
        try {
          ({ ciphertext, sharedSecret } = hqc.encapsulate(publicKey));
          return { ciphertextHex: bytesToHex(ciphertext), sharedSecretHex: bytesToHex(sharedSecret) };
        } finally {
          publicKey.fill(0);
          ciphertext?.fill(0);
          sharedSecret?.fill(0);
        }
      });
    case 'decapsulate':
      return withHqc(async (hqc) => {
        const ciphertext = hexToBytes(payload.ciphertextHex, HQC_CIPHERTEXT_BYTES);
        const secretKey = hexToBytes(payload.secretKeyHex, HQC_SECRET_KEY_BYTES);
        let sharedSecret;
        try {
          sharedSecret = hqc.decapsulate(ciphertext, secretKey);
          if (sharedSecret.length !== HQC_SHARED_SECRET_BYTES) throw new Error('Sovereign crypto boundary rejected.');
          return bytesToHex(sharedSecret);
        } finally {
          ciphertext.fill(0);
          secretKey.fill(0);
          sharedSecret?.fill(0);
        }
      });
    case 'seal':
      return { profile: payload.profile, ciphertextHex: wasmSeal(payload.profile, payload.rootSecretHex, payload.aadHex, payload.plaintextHex) };
    case 'open':
      return wasmOpen(payload.profile, payload.rootSecretHex, payload.aadHex, payload.ciphertextHex);
    default:
      throw new Error('Sovereign crypto operation rejected.');
  }
}

self.addEventListener('message', async (event) => {
  const id = Number.isSafeInteger(event.data?.id) ? event.data.id : 0;
  if (id <= 0 || typeof event.data?.operation !== 'string') return;
  try {
    const result = await execute(event.data.operation, event.data.payload || {});
    self.postMessage({ id, ok: true, result });
  } catch (_) {
    self.postMessage({ id, ok: false, error: 'Sovereign crypto operation rejected.' });
  }
});

