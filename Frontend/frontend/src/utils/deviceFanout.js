import * as api from '../api';
import * as crypto from '../crypto';
import { createClientMessageId } from './payload';

export async function encryptForRecipientDevices({
  plaintext,
  recipientIdentityId,
  recipientPublicKeys,
  senderSignPrivate,
  topSecret = false,
  senderMldsa87Private = '',
  senderDeviceVault = null
}) {
  const hasHqc = typeof recipientPublicKeys?.hqc256 === 'string' && recipientPublicKeys.hqc256.length >= 1024;
  const sovereignProfile = hasHqc ? (topSecret ? 'top-secret' : 'accelerated') : undefined;

  const targets = [{
    id: '',
    box: recipientPublicKeys.box,
    pke: recipientPublicKeys.pke,
    hqc256: recipientPublicKeys.hqc256,
    keyset_proof: recipientPublicKeys.keyset_proof
  }];

  const envelopes = await Promise.all(targets.map(target => crypto.encryptPayload(
    plaintext,
    {
      pke: target.pke,
      box: target.box,
      hqc256: target.hqc256,
      keyset_proof: target.keyset_proof,
      identity: recipientPublicKeys.identity,
      mldsa87: recipientPublicKeys.mldsa87 || ''
    },
    senderSignPrivate,
    createClientMessageId(),
    undefined,
    {
      topSecret,
      sovereignProfile,
      senderMldsa87PrivHex: senderMldsa87Private,
      recipientDeviceKeyId: target.id
    }
  )));
  return envelopes.map(envelope => crypto.attachDeviceEnvelopeProof(envelope, senderDeviceVault));
}

export async function deliverDeviceEnvelopes(senderIdentityId, recipientIdentityId, envelopes) {
  const deliveries = [];
  for (const envelope of envelopes) {
    deliveries.push(await api.sendMessage(senderIdentityId, [recipientIdentityId], envelope));
  }
  return deliveries;
}
