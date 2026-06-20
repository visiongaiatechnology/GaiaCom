// standalone Node.js ESM verification script for GaiaCom Phase 13 - Platin Cryptographic Verification Harness
import { webcrypto } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup browser/window globals for the crypto library in Node environment
globalThis.window = {
  crypto: globalThis.crypto || webcrypto
};

import * as crypto from './crypto.js';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';

let failed = 0;
let passed = 0;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed++;
  } else {
    console.log(`[PASS] ${message}`);
    passed++;
  }
}

async function assertRejects(promise, message) {
  try {
    await promise;
    console.error(`[FAIL] Expected rejection, but it succeeded: ${message}`);
    failed++;
  } catch (err) {
    console.log(`[PASS] Rejected as expected (${err.message}): ${message}`);
    passed++;
  }
}

async function run() {
  console.log("Starting GaiaCom Platin Cryptographic Verification Harness...\n");

  const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  
  // Derive keys
  const senderKeys = crypto.deriveKeysFromMnemonic(testMnemonic);
  const recipientMnemonic = crypto.generateMnemonic();
  const recipientKeys = crypto.deriveKeysFromMnemonic(recipientMnemonic);

  const senderPubKeysHex = {
    identity: senderKeys.keys.sign.public,
    box: senderKeys.keys.box.public,
    pke: senderKeys.keys.pke.public
  };

  const recipientPubKeysHex = {
    identity: recipientKeys.keys.sign.public,
    box: recipientKeys.keys.box.public,
    pke: recipientKeys.keys.pke.public
  };

  const recipientPrivKeysHex = {
    box: recipientKeys.keys.box.private,
    pke: recipientKeys.keys.pke.private
  };

  // --- 1. Valid Test Vectors ---
  const plaintext = "This is a super secure platinum message!";
  const msgId = "11112222-3333-4444-5555-666677778888";
  const timestamp = Date.now();

  const envelope = await crypto.encryptPayload(
    plaintext,
    recipientPubKeysHex,
    senderKeys.keys.sign.private,
    msgId,
    timestamp
  );

  assert(envelope.kem_ciphertext !== undefined, "kem_ciphertext exists");
  assert(envelope.ephemeral_pub !== undefined, "ephemeral_pub exists");
  assert(envelope.payload_ciphertext !== undefined, "payload_ciphertext exists");
  assert(envelope.signature !== undefined, "signature exists");
  assert(envelope.client_message_id === msgId, "message_id matches");
  assert(envelope.timestamp === timestamp, "timestamp matches");

  const decrypted = await crypto.decryptPayload(
    envelope,
    senderKeys.keys.sign.public,
    recipientPubKeysHex,
    recipientPrivKeysHex
  );
  assert(decrypted === plaintext, "Decrypted message matches plaintext");

  // --- 2. Invalid Test Vectors & AAD Mutability Rejection ---
  const manipulatedMsgId = { ...envelope, client_message_id: "00000000-0000-0000-0000-000000000000" };
  await assertRejects(
    crypto.decryptPayload(manipulatedMsgId, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects modified message_id"
  );

  const manipulatedTimestamp = { ...envelope, timestamp: envelope.timestamp + 1000 };
  await assertRejects(
    crypto.decryptPayload(manipulatedTimestamp, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects modified timestamp"
  );

  const ivBytes = crypto.hexToBytes(envelope.iv);
  ivBytes[0] ^= 0xff;
  const manipulatedIV = { ...envelope, iv: crypto.bytesToHex(ivBytes) };
  await assertRejects(
    crypto.decryptPayload(manipulatedIV, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects modified IV"
  );

  const kemBytes = crypto.hexToBytes(envelope.kem_ciphertext);
  kemBytes[0] ^= 0xff;
  const manipulatedKEM = { ...envelope, kem_ciphertext: crypto.bytesToHex(kemBytes) };
  await assertRejects(
    crypto.decryptPayload(manipulatedKEM, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects modified KEM ciphertext"
  );

  const ephemBytes = crypto.hexToBytes(envelope.ephemeral_pub);
  ephemBytes[0] ^= 0xff;
  const manipulatedEphem = { ...envelope, ephemeral_pub: crypto.bytesToHex(ephemBytes) };
  await assertRejects(
    crypto.decryptPayload(manipulatedEphem, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects modified Ephemeral Public Key"
  );

  const payloadBytes = crypto.hexToBytes(envelope.payload_ciphertext);
  payloadBytes[0] ^= 0xff;
  const manipulatedPayload = { ...envelope, payload_ciphertext: crypto.bytesToHex(payloadBytes) };
  await assertRejects(
    crypto.decryptPayload(manipulatedPayload, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects modified payload ciphertext"
  );

  const wrongRecipientPubKeys = { ...recipientPubKeysHex, identity: senderKeys.keys.sign.public };
  await assertRejects(
    crypto.decryptPayload(envelope, senderKeys.keys.sign.public, wrongRecipientPubKeys, recipientPrivKeysHex),
    "Rejects modified recipient identity key"
  );

  const wrongRecipientDeviceKeys = { ...recipientPubKeysHex, box: senderKeys.keys.box.public };
  await assertRejects(
    crypto.decryptPayload(envelope, senderKeys.keys.sign.public, wrongRecipientDeviceKeys, recipientPrivKeysHex),
    "Rejects modified recipient device key"
  );

  // --- 3. Signature & Downgrade Attack tests ---
  const sigBytes = crypto.hexToBytes(envelope.signature);
  sigBytes[0] ^= 0xff;
  const manipulatedSig = { ...envelope, signature: crypto.bytesToHex(sigBytes) };
  await assertRejects(
    crypto.decryptPayload(manipulatedSig, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects corrupted signature"
  );

  const missingSig = { ...envelope };
  delete missingSig.signature;
  await assertRejects(
    crypto.decryptPayload(missingSig, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects missing signature"
  );

  const differentMnemonic = crypto.generateMnemonic();
  const attackerKeys = crypto.deriveKeysFromMnemonic(differentMnemonic);
  await assertRejects(
    crypto.decryptPayload(envelope, attackerKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects signature from another key"
  );

  // Downgrade protection test
  const weakSuite = "GaiaCom/v0.1/hybrid-kem/weak-suite";
  const recipientPkeBytes = crypto.hexToBytes(recipientPubKeysHex.pke);
  const recipientBoxBytes = crypto.hexToBytes(recipientPubKeysHex.box);
  const recipientSignBytes = crypto.hexToBytes(recipientPubKeysHex.identity);
  const senderSignPrivBytes = crypto.hexToBytes(senderKeys.keys.sign.private);
  const senderSignPubBytes = crypto.hexToBytes(senderKeys.keys.sign.public);
  const { cipherText: kemCiphertext, sharedSecret: kemSecret } = ml_kem1024.encapsulate(recipientPkeBytes);
  const ephemeralSeed = window.crypto.getRandomValues(new Uint8Array(32));
  const ephemeralPub = x25519.getPublicKey(ephemeralSeed);
  const x25519Secret = x25519.getSharedSecret(ephemeralSeed, recipientBoxBytes);
  const salt = new Uint8Array(ephemeralPub.length + kemCiphertext.length);
  salt.set(ephemeralPub, 0);
  salt.set(kemCiphertext, ephemeralPub.length);
  const ikm = new Uint8Array(4 + x25519Secret.length + 4 + kemSecret.length);
  const view = new DataView(ikm.buffer);
  view.setUint32(0, x25519Secret.length, false);
  ikm.set(x25519Secret, 4);
  view.setUint32(4 + x25519Secret.length, kemSecret.length, false);
  ikm.set(kemSecret, 4 + x25519Secret.length + 4);
  const weakInfo = new TextEncoder().encode(weakSuite);
  const combinedSecret = hkdf(sha256, ikm, salt, weakInfo, 32);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const weakAADBytes = crypto.buildCanonicalAAD({
    protocol_version: "v0.1",
    algorithm_suite: weakSuite,
    sender_identity_key: senderSignPubBytes,
    recipient_identity_key: recipientSignBytes,
    recipient_device_key: recipientBoxBytes,
    ephemeral_x25519_public_key: ephemeralPub,
    mlkem_ciphertext: kemCiphertext,
    message_id: msgId,
    timestamp: timestamp,
    iv: iv
  });

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    combinedSecret,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv, additionalData: weakAADBytes },
    cryptoKey,
    plaintextBytes
  );
  const payloadCiphertext = new Uint8Array(encryptedBuf);
  const kemCiphertextHash = sha256(kemCiphertext);
  const ciphertextHash = sha256(payloadCiphertext);
  const sigPayload = crypto.buildCanonicalSignaturePayload({
    protocol_version: "v0.1",
    algorithm_suite: weakSuite,
    sender: senderSignPubBytes,
    recipient: recipientSignBytes,
    device_key: recipientBoxBytes,
    ephemeral_key: ephemeralPub,
    mlkem_ciphertext_hash: kemCiphertextHash,
    message_id: msgId,
    timestamp: timestamp,
    iv: iv,
    ciphertext_hash: ciphertextHash
  });
  const signature = ed25519.sign(sigPayload, senderSignPrivBytes);

  const downgradeEnvelope = {
    kem_ciphertext: crypto.bytesToHex(kemCiphertext),
    ephemeral_pub: crypto.bytesToHex(ephemeralPub),
    payload_ciphertext: crypto.bytesToHex(payloadCiphertext),
    iv: crypto.bytesToHex(iv),
    signature: crypto.bytesToHex(signature),
    client_message_id: msgId,
    timestamp: timestamp
  };

  await assertRejects(
    crypto.decryptPayload(downgradeEnvelope, senderKeys.keys.sign.public, recipientPubKeysHex, recipientPrivKeysHex),
    "Rejects mutated suite (Downgrade rejection)"
  );

  // --- 4. Key Vault password & migration tests ---
  const password = "Password123!";
  const iterations = 5000;
  const encryptedMnemonic = await crypto.encryptMnemonic(testMnemonic, password, iterations);
  assert(encryptedMnemonic.ciphertext !== undefined, "Vault ciphertext exists");
  assert(encryptedMnemonic.iv !== undefined, "Vault IV exists");
  assert(encryptedMnemonic.kdfParams !== undefined, "Vault kdfParams exist");
  assert(encryptedMnemonic.kdfParams.version === 2, "Vault version is v2");
  assert(encryptedMnemonic.kdfParams.iterations === iterations, "Vault iterations match requested");

  const jsonStr = JSON.stringify(encryptedMnemonic);
  let mnemonicLeaked = false;
  testMnemonic.split(' ').forEach(word => {
    if (jsonStr.includes(word)) mnemonicLeaked = true;
  });
  assert(!mnemonicLeaked, "Mnemonic seed not leaked in storage plain text");

  await assertRejects(
    crypto.decryptMnemonic(encryptedMnemonic, "WrongPassword!"),
    "Decryption fails with wrong password (fail-closed)"
  );

  // Legacy v1 decryption & migration test
  const v1Salt = window.crypto.getRandomValues(new Uint8Array(32));
  const v1IV = window.crypto.getRandomValues(new Uint8Array(12));
  const v1Key = await deriveWebCryptoKey(password, v1Salt, 100000);
  const v1EncBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: v1IV },
    v1Key,
    new TextEncoder().encode(testMnemonic)
  );
  const v1Envelope = {
    ciphertext: crypto.bytesToHex(new Uint8Array(v1EncBuf)),
    iv: crypto.bytesToHex(v1IV),
    salt: crypto.bytesToHex(v1Salt)
  };

  const decryptedV1 = await crypto.decryptMnemonic(v1Envelope, password);
  assert(decryptedV1 === testMnemonic, "Successfully decrypts legacy v1 flat salt envelopes");

  const migrated = await crypto.encryptMnemonic(decryptedV1, password, 5000);
  assert(migrated.kdfParams.version === 2, "Migrated envelope uses v2");
  assert(migrated.salt === undefined, "Migrated envelope does not leak flat salt");

  const decryptedV2 = await crypto.decryptMnemonic(migrated, password);
  assert(decryptedV2 === testMnemonic, "Successfully decrypts migrated v2 envelope");

  // --- 5. Static frontend adversarial guards ---
  const sourceFiles = collectSourceFiles(__dirname);
  const joinedSources = sourceFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const forbiddenReactHtmlSink = 'dangerouslySet' + 'InnerHTML';
  assert(!joinedSources.includes(forbiddenReactHtmlSink), "No React raw HTML sink in frontend source");
  assert(!/\.innerHTML\s*=/.test(joinedSources), "No direct innerHTML assignment in frontend source");
  assert(!/body:\s*JSON\.stringify\([^)]*actorId/.test(joinedSources), "No actorId in protected client payloads");
  assert(!/localStorage\.setItem\(['"]gaia_mnemonic['"]/.test(joinedSources), "No plaintext mnemonic localStorage write");
  assert(!/console\.(log|warn|error)\([^)]*(mnemonic|private|secret|seed)/i.test(joinedSources), "No console logging of secret-bearing values");

  const appSource = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
  const listPaneSource = fs.readFileSync(path.join(__dirname, 'components', 'layout', 'ListPane.js'), 'utf8');
  const groupPaneSource = fs.readFileSync(path.join(__dirname, 'components', 'chat', 'GroupChatPane.js'), 'utf8');
  const dropPaneSource = fs.readFileSync(path.join(__dirname, 'components', 'chat', 'DropPane.js'), 'utf8');
  const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
  const i18nSource = fs.readFileSync(path.join(__dirname, 'utils', 'i18n.js'), 'utf8');

  assert(
    appSource.includes("(currentMenu === 'gaiadrop' && selectedDrop)") &&
      !appSource.includes("|| currentMenu === 'gaiadrop');"),
    "Mobile GaiaDrop inbox remains visible until a drop is selected"
  );
  assert(
    /\.mobile-pane-actions\s+\.mobile-compose-btn[\s\S]*?min-height:\s*34px[\s\S]*?font-size:\s*0\.72rem[\s\S]*?font-weight:\s*800/.test(cssSource),
    "Mobile compose button stays compact"
  );
  assert(
    listPaneSource.includes('desktop-compose-btn') &&
      listPaneSource.includes('<Icons.Plus />') &&
      listPaneSource.includes("const canComposeMail = currentMenu === 'inbox' || currentMenu === 'sent' || currentMenu === 'contacts'"),
    "Desktop compose action is present for mail-capable sections"
  );
  assert(
    appSource.includes('className="mobile-floating-menu mobile-menu-toggle"') &&
      /\.mobile-floating-menu[\s\S]*?min-height:\s*34px[\s\S]*?font-size:\s*0\.72rem/.test(cssSource),
    "Mobile detail panes expose a compact global menu control"
  );
  assert(
    groupPaneSource.includes('detail-mobile-actions') &&
      groupPaneSource.includes('setMobileMenuOpen(true)') &&
      groupPaneSource.includes('setActiveRoom(null)') &&
      groupPaneSource.includes('setActiveChannel(null)'),
    "Mobile group chat exposes menu, group overview, and channel overview controls"
  );
  assert(
    dropPaneSource.includes('detail-mobile-actions') &&
      dropPaneSource.includes('setMobileMenuOpen(true)') &&
      dropPaneSource.includes('setSelectedDrop(null)') &&
      dropPaneSource.includes('drop-detail-address'),
    "Mobile GaiaDrop detail exposes menu, inbox back control, and own address"
  );
  assert(
    listPaneSource.includes('gaiadrop-list-tools') &&
      listPaneSource.includes('loadGaiaDropInbox') &&
      listPaneSource.includes("t('drop_own_address')"),
    "Mobile GaiaDrop list exposes own address and load action"
  );
  assert(
    appSource.includes('untrusted: !!(env.Untrusted || env.untrusted || isLegacySmtp)'),
    "Legacy SMTP is always marked untrusted in mail models"
  );
  assert(
    listPaneSource.includes("mail.isSmtp ? (t('smtp_legacy_badge')") &&
      i18nSource.includes('smtp_legacy_badge: "Legacy SMTP / Unsicher"'),
    "Legacy SMTP list badge is explicit"
  );

  console.log(`\nVerification Finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function collectSourceFiles(root) {
  const files = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'build') continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(js|jsx|mjs|css|html)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function deriveWebCryptoKey(password, salt, iterations) {
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

run().catch(err => {
  console.error(err);
  process.exit(1);
});
