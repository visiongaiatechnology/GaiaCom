/*
 * Sovereign accelerated/top-secret envelope paths (HQC-256 + cascade sealing).
 */

import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { shake256, sha3_512 } from '@noble/hashes/sha3.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { hqc256Encapsulate, hqc256Decapsulate, sovereignSeal, sovereignOpen } from '../sovereignCrypto.js';
import { SOVEREIGN_ACCELERATED_SUITE, SOVEREIGN_TOP_SECRET_SUITE, isSovereignSuite } from './suites.js';
import { hexToBytes, bytesToHex, generateUUID } from './format.js';
import { combineSecretSet } from './primitives.js';
import { buildCanonicalAAD, buildCanonicalSignaturePayload } from './canonical.js';
import { createSovereignKeysetProof, verifySovereignKeysetProof } from './signatures.js';

export async function encryptSovereignPayload(plaintext, recipientPubKeysHex, senderSignPrivHex, messageId, timestamp, options) {
  const profile = options.sovereignProfile;
  if (profile !== 'accelerated' && profile !== 'top-secret') throw new Error('Souveränes GaiaCom-Profil wurde verworfen.');
  const topSecret = profile === 'top-secret';
  const algorithmSuite = topSecret ? SOVEREIGN_TOP_SECRET_SUITE : SOVEREIGN_ACCELERATED_SUITE;
  const candidateProof = recipientPubKeysHex.keyset_proof || createSovereignKeysetProof(recipientPubKeysHex, senderSignPrivHex);
  if (!verifySovereignKeysetProof({ public_keys: recipientPubKeysHex, keyset_proof: candidateProof })) {
    throw new Error('Souveräne Keyset-Signatur fehlt oder ist ungültig.');
  }
  const recipientPkeBytes = hexToBytes(recipientPubKeysHex.pke);
  const recipientBoxBytes = hexToBytes(recipientPubKeysHex.box);
  const recipientSignBytes = hexToBytes(recipientPubKeysHex.identity);
  const recipientMldsaBytes = hexToBytes(recipientPubKeysHex.mldsa87 || '');
  if (recipientPkeBytes.length !== 1568 || recipientBoxBytes.length !== 32 || recipientSignBytes.length !== 32) {
    throw new Error('Souveräner Empfängerschlüsselsatz wurde verworfen.');
  }
  if (typeof recipientPubKeysHex.hqc256 !== 'string' || recipientPubKeysHex.hqc256.length < 1024) {
    throw new Error('HQC-256 Capability des Empfängers fehlt; Downgrade wurde blockiert.');
  }
  if (topSecret && recipientMldsaBytes.length !== ml_dsa87.lengths.publicKey) {
    throw new Error('Top Secret erfordert ML-DSA-87 Capability des Empfängers.');
  }

  const { cipherText: mlkemCiphertext, sharedSecret: mlkemSecret } = ml_kem1024.encapsulate(recipientPkeBytes);
  const hqc = await hqc256Encapsulate(recipientPubKeysHex.hqc256);
  const hqcCiphertext = hexToBytes(hqc.ciphertextHex);
  const hqcSecret = hexToBytes(hqc.sharedSecretHex);
  const ephemeralPrivate = window.crypto.getRandomValues(new Uint8Array(32));
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate);
  const x25519Secret = x25519.getSharedSecret(ephemeralPrivate, recipientBoxBytes);
  ephemeralPrivate.fill(0);

  const kemTranscript = combineSecretSet([mlkemCiphertext, hqcCiphertext]);
  const salt = combineSecretSet([ephemeralPublic, mlkemCiphertext, hqcCiphertext]);
  const ikm = combineSecretSet([x25519Secret, mlkemSecret, hqcSecret]);
  const rootSecret = hkdf(sha3_512, ikm, salt, new TextEncoder().encode(algorithmSuite), 32);
  x25519Secret.fill(0);
  mlkemSecret.fill(0);
  hqcSecret.fill(0);
  ikm.fill(0);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const senderPrivate = hexToBytes(senderSignPrivHex);
  const senderPublic = ed25519.getPublicKey(senderPrivate);
  const clientMessageId = messageId || generateUUID();
  const sentAt = timestamp || Date.now();
  const recipientDeviceKeyId = String(options.recipientDeviceKeyId || '');
  const aad = buildCanonicalAAD({
    protocol_version: 'v1.0', algorithm_suite: algorithmSuite,
    sender_identity_key: senderPublic, recipient_identity_key: recipientSignBytes,
    recipient_device_key: recipientBoxBytes, recipient_device_key_id: recipientDeviceKeyId,
    ephemeral_x25519_public_key: ephemeralPublic, mlkem_ciphertext: kemTranscript,
    message_id: clientMessageId, timestamp: sentAt, iv
  });
  let payloadCiphertext;
  try {
    payloadCiphertext = hexToBytes(await sovereignSeal(profile, bytesToHex(rootSecret), bytesToHex(aad), bytesToHex(new TextEncoder().encode(String(plaintext)))));
  } finally {
    rootSecret.fill(0);
  }

  const signaturePayload = buildCanonicalSignaturePayload({
    protocol_version: 'v1.0', algorithm_suite: algorithmSuite,
    sender: senderPublic, recipient: recipientSignBytes, device_key: recipientBoxBytes,
    recipient_device_key_id: recipientDeviceKeyId, ephemeral_key: ephemeralPublic,
    mlkem_ciphertext_hash: shake256(kemTranscript, { dkLen: 32 }), message_id: clientMessageId,
    timestamp: sentAt, iv, ciphertext_hash: shake256(payloadCiphertext, { dkLen: 32 })
  });
  const signature = ed25519.sign(signaturePayload, senderPrivate);
  const signatureBundle = { ed25519: bytesToHex(signature) };
  if (topSecret) {
    const mldsaPrivate = hexToBytes(options.senderMldsa87PrivHex || '');
    if (mldsaPrivate.length !== ml_dsa87.lengths.secretKey) throw new Error('Top Secret erfordert lokalen ML-DSA-87 Private Key.');
    signatureBundle.ml_dsa_87 = bytesToHex(ml_dsa87.sign(signaturePayload, mldsaPrivate));
    signatureBundle.ml_dsa_87_public = bytesToHex(ml_dsa87.getPublicKey(mldsaPrivate));
    mldsaPrivate.fill(0);
  }
  senderPrivate.fill(0);

  return {
    algorithm_suite: algorithmSuite,
    kem_ciphertext: bytesToHex(mlkemCiphertext), hqc_ciphertext: bytesToHex(hqcCiphertext),
    ephemeral_pub: bytesToHex(ephemeralPublic), payload_ciphertext: bytesToHex(payloadCiphertext),
    iv: bytesToHex(iv), signature: bytesToHex(signature), signature_bundle: signatureBundle,
    sender_mldsa87_public: signatureBundle.ml_dsa_87_public || '', client_message_id: clientMessageId,
    timestamp: sentAt, recipient_device_key_id: recipientDeviceKeyId,
    recipient_device_box_public: bytesToHex(recipientBoxBytes), sovereign_profile: profile
  };
}

export async function decryptSovereignPayload(envelope, senderSignPubHex, recipientPubKeysHex, recipientPrivKeysHex, options) {
  const algorithmSuite = envelope.algorithm_suite;
  const topSecret = algorithmSuite === SOVEREIGN_TOP_SECRET_SUITE;
  const profile = topSecret ? 'top-secret' : 'accelerated';
  if (!isSovereignSuite(algorithmSuite) || envelope.sovereign_profile !== profile) throw new Error('Souveräne Suite-Bindung wurde verworfen.');
  const mlkemCiphertext = hexToBytes(envelope.kem_ciphertext);
  const hqcCiphertext = hexToBytes(envelope.hqc_ciphertext);
  const ephemeralPublic = hexToBytes(envelope.ephemeral_pub);
  const payloadCiphertext = hexToBytes(envelope.payload_ciphertext);
  const iv = hexToBytes(envelope.iv);
  const senderPublic = hexToBytes(senderSignPubHex);
  const recipientPke = hexToBytes(recipientPubKeysHex.pke);
  const recipientBox = hexToBytes(recipientPubKeysHex.box);
  const recipientIdentity = hexToBytes(recipientPubKeysHex.identity);
  if (mlkemCiphertext.length !== 1568 || ephemeralPublic.length !== 32 || iv.length !== 12 || senderPublic.length !== 32 || recipientPke.length !== 1568 || recipientBox.length !== 32 || recipientIdentity.length !== 32) {
    throw new Error('Souveräne Nachrichtengrenzen wurden verletzt.');
  }
  if (!envelope.client_message_id || !envelope.timestamp || !recipientPrivKeysHex.hqc256) throw new Error('Souveräne Nachricht oder HQC-256 Key fehlt.');

  const kemTranscript = combineSecretSet([mlkemCiphertext, hqcCiphertext]);
  const recipientDeviceKeyId = String(envelope.recipient_device_key_id || '');
  const aad = buildCanonicalAAD({
    protocol_version: 'v1.0', algorithm_suite: algorithmSuite,
    sender_identity_key: senderPublic, recipient_identity_key: recipientIdentity,
    recipient_device_key: recipientBox, recipient_device_key_id: recipientDeviceKeyId,
    ephemeral_x25519_public_key: ephemeralPublic, mlkem_ciphertext: kemTranscript,
    message_id: envelope.client_message_id, timestamp: envelope.timestamp, iv
  });
  const signaturePayload = buildCanonicalSignaturePayload({
    protocol_version: 'v1.0', algorithm_suite: algorithmSuite,
    sender: senderPublic, recipient: recipientIdentity, device_key: recipientBox,
    recipient_device_key_id: recipientDeviceKeyId, ephemeral_key: ephemeralPublic,
    mlkem_ciphertext_hash: shake256(kemTranscript, { dkLen: 32 }), message_id: envelope.client_message_id,
    timestamp: envelope.timestamp, iv, ciphertext_hash: shake256(payloadCiphertext, { dkLen: 32 })
  });
  if (!ed25519.verify(hexToBytes(envelope.signature), signaturePayload, senderPublic)) throw new Error('Souveräne Nachrichtensignatur wurde verworfen.');
  if (topSecret) {
    const publicKey = hexToBytes(envelope.signature_bundle?.ml_dsa_87_public || '');
    const expected = hexToBytes(options?.expectedSenderMldsa87PubHex || '');
    const signature = hexToBytes(envelope.signature_bundle?.ml_dsa_87 || '');
    if (publicKey.length !== ml_dsa87.lengths.publicKey || expected.length !== ml_dsa87.lengths.publicKey || bytesToHex(publicKey) !== bytesToHex(expected) || !ml_dsa87.verify(signature, signaturePayload, publicKey)) {
      throw new Error('Top-Secret-Hybridsignatur wurde verworfen.');
    }
  }

  const mlkemSecret = ml_kem1024.decapsulate(mlkemCiphertext, hexToBytes(recipientPrivKeysHex.pke));
  const hqcSecret = hexToBytes(await hqc256Decapsulate(envelope.hqc_ciphertext, recipientPrivKeysHex.hqc256));
  const x25519Secret = x25519.getSharedSecret(hexToBytes(recipientPrivKeysHex.box), ephemeralPublic);
  const salt = combineSecretSet([ephemeralPublic, mlkemCiphertext, hqcCiphertext]);
  const ikm = combineSecretSet([x25519Secret, mlkemSecret, hqcSecret]);
  const rootSecret = hkdf(sha3_512, ikm, salt, new TextEncoder().encode(algorithmSuite), 32);
  x25519Secret.fill(0); mlkemSecret.fill(0); hqcSecret.fill(0); ikm.fill(0);
  let plaintextHex;
  try {
    plaintextHex = await sovereignOpen(profile, bytesToHex(rootSecret), bytesToHex(aad), envelope.payload_ciphertext);
  } finally {
    rootSecret.fill(0);
  }
  return new TextDecoder().decode(hexToBytes(plaintextHex));
}
