// STATUS: PLATIN
import { invoke } from '@tauri-apps/api/core';

const SELF_TEST_ROOT = '6d'.repeat(32);
const SELF_TEST_AAD = '47616961436f6d2f6e61746976652d70726f76696465722d73656c662d746573742f7631';
const SELF_TEST_PLAINTEXT = '70726f76696465722d7265616479';

function constantTimeHexEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  let difference = left.length ^ right.length;
  const maximum = Math.max(left.length, right.length);
  for (let index = 0; index < maximum; index += 1) {
    difference |= (left.charCodeAt(index % Math.max(left.length, 1)) || 0)
      ^ (right.charCodeAt(index % Math.max(right.length, 1)) || 0);
  }
  return difference === 0;
}

export function createNativeProvider(assertHex) {
  let readiness;

  async function selfTest() {
    const keyPair = await invoke('sovereign_hqc256_keypair');
    const encapsulated = await invoke('sovereign_hqc256_encapsulate', {
      publicKeyHex: assertHex(keyPair?.publicKeyHex, 'HQC-256 Public Key', 64 * 1024)
    });
    const recovered = await invoke('sovereign_hqc256_decapsulate', {
      ciphertextHex: assertHex(encapsulated?.ciphertextHex, 'HQC-256 Ciphertext', 128 * 1024),
      secretKeyHex: assertHex(keyPair?.secretKeyHex, 'HQC-256 Secret Key', 128 * 1024)
    });
    if (!constantTimeHexEqual(encapsulated?.sharedSecretHex, recovered)) {
      throw new Error('Sovereign crypto provider self-test rejected.');
    }
    for (const profile of ['accelerated', 'top-secret']) {
      const sealed = await invoke('sovereign_seal', {
        profile,
        rootSecretHex: SELF_TEST_ROOT,
        aadHex: SELF_TEST_AAD,
        plaintextHex: SELF_TEST_PLAINTEXT
      });
      const opened = await invoke('sovereign_open', {
        profile,
        rootSecretHex: SELF_TEST_ROOT,
        aadHex: SELF_TEST_AAD,
        ciphertextHex: assertHex(sealed?.ciphertextHex, 'Ciphertext', 4096)
      });
      if (!constantTimeHexEqual(opened, SELF_TEST_PLAINTEXT)) {
        throw new Error('Sovereign crypto provider self-test rejected.');
      }
    }
    return true;
  }

  function ready() {
    readiness ??= selfTest().catch((error) => {
      readiness = undefined;
      throw error;
    });
    return readiness;
  }

  return {
    async keyPair() {
      await ready();
      return invoke('sovereign_hqc256_keypair');
    },
    async encapsulate(publicKeyHex) {
      await ready();
      return invoke('sovereign_hqc256_encapsulate', { publicKeyHex });
    },
    async decapsulate(ciphertextHex, secretKeyHex) {
      await ready();
      return invoke('sovereign_hqc256_decapsulate', { ciphertextHex, secretKeyHex });
    },
    async seal(profile, rootSecretHex, aadHex, plaintextHex) {
      await ready();
      return invoke('sovereign_seal', { profile, rootSecretHex, aadHex, plaintextHex });
    },
    async open(profile, rootSecretHex, aadHex, ciphertextHex) {
      await ready();
      return invoke('sovereign_open', { profile, rootSecretHex, aadHex, ciphertextHex });
    },
    ready
  };
}

