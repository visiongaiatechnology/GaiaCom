// STATUS: PLATIN
const OPERATION_TIMEOUT_MS = 60_000;

export function createWebProvider() {
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined' || !globalThis.crypto?.getRandomValues) {
    throw new Error('Sovereign browser crypto is unavailable.');
  }

  const worker = new Worker(new URL('./webCrypto.worker.js', import.meta.url), { type: 'module', name: 'gaiacom-sovereign-crypto' });
  const pending = new Map();
  let sequence = 0;
  let readiness;
  let failed = false;

  function rejectAll() {
    failed = true;
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Sovereign crypto provider failed closed.'));
    }
    pending.clear();
    worker.terminate();
  }

  worker.addEventListener('error', rejectAll);
  worker.addEventListener('messageerror', rejectAll);
  worker.addEventListener('message', (event) => {
    const request = pending.get(event.data?.id);
    if (!request) return;
    pending.delete(event.data.id);
    clearTimeout(request.timer);
    if (event.data?.ok === true) request.resolve(event.data.result);
    else request.reject(new Error('Sovereign crypto operation rejected.'));
  });

  function request(operation, payload = {}) {
    if (failed) return Promise.reject(new Error('Sovereign crypto provider failed closed.'));
    sequence = sequence >= Number.MAX_SAFE_INTEGER ? 1 : sequence + 1;
    const id = sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectAll();
        reject(new Error('Sovereign crypto operation timed out.'));
      }, OPERATION_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      worker.postMessage({ id, operation, payload });
    });
  }

  function ready() {
    readiness ??= request('selfTest').catch((error) => {
      readiness = undefined;
      throw error;
    });
    return readiness;
  }

  async function guarded(operation, payload) {
    await ready();
    return request(operation, payload);
  }

  return {
    keyPair: () => guarded('keyPair'),
    encapsulate: (publicKeyHex) => guarded('encapsulate', { publicKeyHex }),
    decapsulate: (ciphertextHex, secretKeyHex) => guarded('decapsulate', { ciphertextHex, secretKeyHex }),
    seal: (profile, rootSecretHex, aadHex, plaintextHex) => guarded('seal', { profile, rootSecretHex, aadHex, plaintextHex }),
    open: (profile, rootSecretHex, aadHex, ciphertextHex) => guarded('open', { profile, rootSecretHex, aadHex, ciphertextHex }),
    ready
  };
}
