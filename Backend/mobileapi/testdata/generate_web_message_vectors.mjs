// STATUS: DIAMANT VGT SUPREME
// Reproduces fixtures through the actual GaiaCom Web crypto implementation.
import { webcrypto } from 'node:crypto';

let deterministicChunks = [];
const deterministicCrypto = {
  subtle: webcrypto.subtle,
  getRandomValues(target) {
    const next = deterministicChunks.shift();
    if (!(next instanceof Uint8Array) || next.length !== target.length) {
      throw new Error(`Unexpected CSPRNG request: ${target.length} bytes`);
    }
    target.set(next);
    return target;
  }
};

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: deterministicCrypto
});
globalThis.window = { crypto: deterministicCrypto };

const crypto = await import('../../../Frontend/frontend/src/crypto.js');

const senderMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const recipientMnemonic = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const sender = crypto.deriveKeysFromMnemonic(senderMnemonic).keys;
const recipient = crypto.deriveKeysFromMnemonic(recipientMnemonic).keys;

function bytes(length, start, step) {
  return Uint8Array.from({ length }, (_, index) => (start + index * step) & 0xff);
}

function hex(value) {
  return crypto.bytesToHex(value);
}

async function createVector({ topSecret, messageId, timestamp, deviceKeyId, plaintext, offset }) {
  const kemSeed = bytes(32, 0x11 + offset, 0x17);
  const ephemeralPrivate = bytes(32, 0x29 + offset, 0x1d);
  const iv = bytes(12, 0x43 + offset, 0x0b);
  deterministicChunks = [kemSeed, ephemeralPrivate, iv];
  if (topSecret) deterministicChunks.push(new Uint8Array(32));

  const envelope = await crypto.encryptPayload(
    plaintext,
    {
      pke: recipient.pke.public,
      box: recipient.box.public,
      identity: recipient.sign.public,
      mldsa87: recipient.mldsa87.public
    },
    sender.sign.private,
    messageId,
    timestamp,
    {
      topSecret,
      recipientDeviceKeyId: deviceKeyId,
      senderMldsa87PrivHex: sender.mldsa87.private
    }
  );
  if (deterministicChunks.length !== 0) {
    throw new Error(`Unused deterministic chunks: ${deterministicChunks.length}`);
  }
  return {
    plaintext,
    kem_seed: hex(kemSeed),
    ephemeral_private: hex(ephemeralPrivate),
    iv: hex(iv),
    envelope
  };
}

const fixture = {
  source: 'Frontend/frontend/src/crypto.js',
  sender_mnemonic: senderMnemonic,
  recipient_mnemonic: recipientMnemonic,
  vectors: [
    await createVector({
      topSecret: false,
      messageId: '11223344-5566-4788-99aa-bbccddeeff01',
      timestamp: 1784332800123,
      deviceKeyId: '',
      plaintext: 'GaiaCom Web ↔ Android: Standard 🔐',
      offset: 0
    }),
    await createVector({
      topSecret: true,
      messageId: '11223344-5566-4788-99aa-bbccddeeff02',
      timestamp: 1784332800456,
      deviceKeyId: 'aabbccdd-eeff-4123-8abc-0123456789ab',
      plaintext: 'GaiaCom Web ↔ Android: Top Secret 🛡️',
      offset: 7
    })
  ]
};

process.stdout.write(`${JSON.stringify(fixture, null, 2)}\n`);
