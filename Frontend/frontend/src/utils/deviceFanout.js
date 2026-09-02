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
  const result = await api.getRecipientDeviceKeys(recipientIdentityId);
  const deviceKeys = Array.isArray(result?.keys) ? result.keys.filter(key => key?.status === 'active') : [];
  const targets = deviceKeys.length > 0
    ? deviceKeys.map(key => ({ id: key.id, box: key.boxPublic, pke: key.kemPublic }))
    : [{ id: '', box: recipientPublicKeys.box, pke: recipientPublicKeys.pke }];

  const envelopes = await Promise.all(targets.map(target => crypto.encryptPayload(
    plaintext,
    { pke: target.pke, box: target.box, identity: recipientPublicKeys.identity, mldsa87: recipientPublicKeys.mldsa87 || '' },
    senderSignPrivate,
    createClientMessageId(),
    undefined,
    { topSecret, senderMldsa87PrivHex: senderMldsa87Private, recipientDeviceKeyId: target.id }
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
