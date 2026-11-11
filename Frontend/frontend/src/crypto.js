/*
 * crypto.js — thin facade over the modular src/crypto/ package (VGT 500-line rule).
 *
 * Public API is unchanged: every named export of the previous monolithic crypto.js is
 * re-exported here with the identical implementation (bodies byte-copied into the
 * domain modules). No algorithm, suite, nonce, AAD, KDF or randomness change.
 */

export { TOP_SECRET_CHAT_ALGORITHM_SUITE } from './crypto/suites.js';
export { hexToBytes, bytesToHex } from './crypto/format.js';
export { buildCanonicalAAD, buildCanonicalSignaturePayload } from './crypto/canonical.js';
export { generateMnemonic, validateMnemonic, deriveKeysFromMnemonic } from './crypto/kdf.js';
export { signMldsa87Message, getMldsa87PublicKey, createSovereignKeysetProof, verifySovereignKeysetProof, signGsnMessage, attachDeviceEnvelopeProof } from './crypto/signatures.js';
export { encryptMnemonic, decryptMnemonic, encryptLocalRecord, decryptLocalRecord } from './crypto/recovery.js';
export { generateDevicePairingKeys, buildDevicePairingApprovalPayload, signDevicePairingApproval, encryptDevicePairingPayload, decryptDevicePairingPayload } from './crypto/devicePairing.js';
export { encryptPayload, decryptPayload } from './crypto/envelope.js';
export { encryptAnonymousDrop, decryptAnonymousDrop } from './crypto/drop.js';
export { calculateReportProof, sha256Hex } from './crypto/format.js';
export { stripImageMetadata, encryptFileSymmetric, decryptFileSymmetric } from './crypto/files.js';
