/*
 * BIP-39 mnemonic handling and identity key derivation (SHAKE-256 labels unchanged).
 */

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { shake256 } from '@noble/hashes/sha3.js';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { bytesToHex } from './format.js';

function deriveBytes(label, masterKey, size) {
  const labelBytes = new TextEncoder().encode(label);
  const input = new Uint8Array(labelBytes.length + 1 + masterKey.length);
  input.set(labelBytes, 0);
  input.set([0], labelBytes.length);
  input.set(masterKey, labelBytes.length + 1);
  return shake256(input, { dkLen: size });
}

// Length-prefixed combiner helper for hybrid secrets

export function generateMnemonic() {
  return bip39.generateMnemonic(wordlist);
}

export function validateMnemonic(mnemonic) {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

export function deriveKeysFromMnemonic(mnemonic) {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Ungültiges Mnemonic');
  }

  // Derive master seed
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  
  // Use SHA3-Shake256 to hash seed to 32-byte master key
  const masterKey = shake256(seed, { dkLen: 32 });

  // 1. Ed25519 Signing Keys
  const signSeed = deriveBytes('gaiacom.identity.sign.ed25519.v1', masterKey, 32);
  const signPub = ed25519.getPublicKey(signSeed);

  // 2. X25519 Encryption Keys
  const boxSeed = deriveBytes('gaiacom.identity.box.x25519.v1', masterKey, 32);
  // Clamping (standard X25519 clamping matched to Go standard)
  boxSeed[0] &= 248;
  boxSeed[31] &= 127;
  boxSeed[31] |= 64;
  const boxPub = x25519.getPublicKey(boxSeed);

  // 3. ML-KEM-1024 Post-Quantum Keys
  const kemSeed = deriveBytes('gaiacom.identity.pq.mlkem1024.v1', masterKey, 64);
  const kemKeyPair = ml_kem1024.keygen(kemSeed);

  // 4. ML-DSA-87 / Dilithium-5 signature keys for Top Secret mode
  const mldsaSeed = deriveBytes('gaiacom.identity.sign.ml-dsa-87.v1', masterKey, ml_dsa87.lengths.seed || 32);
  const mldsaKeyPair = ml_dsa87.keygen(mldsaSeed);

  return {
    mnemonic,
    keys: {
      sign: {
        public: bytesToHex(signPub),
        private: bytesToHex(signSeed),
      },
      box: {
        public: bytesToHex(boxPub),
        private: bytesToHex(boxSeed),
      },
      pke: {
        public: bytesToHex(kemKeyPair.publicKey),
        private: bytesToHex(kemKeyPair.secretKey),
      },
      mldsa87: {
        public: bytesToHex(mldsaKeyPair.publicKey),
        private: bytesToHex(mldsaKeyPair.secretKey),
      }
    }
  };
}
