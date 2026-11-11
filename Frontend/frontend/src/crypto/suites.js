/*
 * Cryptographic algorithm suite identifiers (byte-identical values; no suite changes).
 */


export const STANDARD_ALGORITHM_SUITE = 'GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM';

export const TOP_SECRET_ALGORITHM_SUITE = 'GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87';

export const SOVEREIGN_ACCELERATED_SUITE = 'GaiaCom/v1.0/sovereign-accelerated/X25519+ML-KEM-1024+HQC-256/Twofish-256-EAX+AES-256-GCM/Ed25519';

export const SOVEREIGN_TOP_SECRET_SUITE = 'GaiaCom/v1.0/sovereign-top-secret/X25519+ML-KEM-1024+HQC-256/Serpent-256-CTR-HMAC-SHA3-512+Twofish-256-EAX+XChaCha20-Poly1305+AES-256-GCM-SIV/Ed25519+ML-DSA-87';

export const TOP_SECRET_CHAT_ALGORITHM_SUITE = SOVEREIGN_TOP_SECRET_SUITE;

// --- Utility Helpers ---

export function isSovereignSuite(suite) {
  return suite === SOVEREIGN_ACCELERATED_SUITE || suite === SOVEREIGN_TOP_SECRET_SUITE;
}
