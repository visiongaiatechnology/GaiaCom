// STATUS: PLATIN
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
  if (!recipientPublicKeys?.hqc256) throw new Error('HQC-256 Capability fehlt; kryptografischer Downgrade wurde blockiert.');
  // Sovereign v1 encrypts only to the identity-signed keyset. Device-specific
  // prekeys must not be substituted until an identity-signed ratchet prekey
  // certificate and its verification chain are part of the wire protocol.
  const targets = [{
    id: '',
    box: recipientPublicKeys.box,
    pke: recipientPublicKeys.pke,
    hqc256: recipientPublicKeys.hqc256,
    keyset_proof: recipientPublicKeys.keyset_proof
  }];

  const envelopes = await Promise.all(targets.map(target => crypto.encryptPayload(
    plaintext,
    { pke: target.pke, box: target.box, hqc256: target.hqc256, keyset_proof: target.keyset_proof, identity: recipientPublicKeys.identity, mldsa87: recipientPublicKeys.mldsa87 || '' },
    senderSignPrivate,
    createClientMessageId(),
    undefined,
    { topSecret, sovereignProfile: topSecret ? 'top-secret' : 'accelerated', senderMldsa87PrivHex: senderMldsa87Private, recipientDeviceKeyId: target.id }
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
