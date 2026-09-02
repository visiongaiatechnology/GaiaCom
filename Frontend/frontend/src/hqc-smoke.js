// STATUS: PLATIN
// Headless Chromium advances virtual time aggressively. Keep the production
// provider's fail-closed timeout beyond the smoke test's virtual-time window.
const schedule = globalThis.setTimeout.bind(globalThis);
globalThis.setTimeout = (handler, timeout = 0, ...parameters) => schedule(
  handler,
  timeout >= 60_000 ? timeout * 1_000 : timeout,
  ...parameters
);

async function run() {
  const {
    ensureSovereignRuntime,
    generateHqc256KeyPair,
    hqc256Decapsulate,
    hqc256Encapsulate,
    sovereignOpen,
    sovereignSeal
  } = await import('./sovereignCrypto.js');
  await ensureSovereignRuntime();
  const keyPair = await generateHqc256KeyPair();
  const encapsulation = await hqc256Encapsulate(keyPair.publicKeyHex);
  const recoveredSecret = await hqc256Decapsulate(
    encapsulation.ciphertextHex,
    keyPair.secretKeyHex
  );
  if (recoveredSecret !== encapsulation.sharedSecretHex) {
    throw new Error('HQC_BROWSER_SHARED_SECRET_MISMATCH');
  }

  const rootSecretHex = '42'.repeat(32);
  const aadHex = '67616961636f6d2d6871632d62726f777365722d736d6f6b65';
  const plaintextHex = '736f7665726569676e2d62726f777365722d726f756e6474726970';
  for (const profile of ['accelerated', 'top-secret']) {
    const ciphertextHex = await sovereignSeal(profile, rootSecretHex, aadHex, plaintextHex);
    const openedHex = await sovereignOpen(profile, rootSecretHex, aadHex, ciphertextHex);
    if (openedHex !== plaintextHex) throw new Error('HQC_BROWSER_CASCADE_MISMATCH');
  }

  document.body.dataset.result = 'pass';
  document.body.textContent = 'HQC_BROWSER_SMOKE_PASS';
}

run().catch((error) => {
  document.body.dataset.result = 'fail';
  document.body.textContent = `HQC_BROWSER_SMOKE_FAIL:${error instanceof Error ? error.message : 'unknown'}`;
});
