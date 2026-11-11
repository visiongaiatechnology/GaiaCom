/* VGT GLASS 2100 — API MODULE: messaging
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';
import { isUuid, uniqueUuids } from '../utils/uuid';

export async function sendMessage(senderIdentityId, recipientIds, envelopeData) {
  const res = await apiFetch(`${BASE_URL}/api/v1/messaging/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      senderIdentityId,
      recipientIds,
      envelopeData
    })
  });
  return handleResponse(res);
}

export async function sendSmtpMail(senderIdentityId, to, subject, body, attachments = []) {
  const res = await apiFetch(`${BASE_URL}/api/v1/smtp/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      senderIdentityId,
      to,
      subject,
      body,
      attachments
    })
  });
  return handleResponse(res);
}

export async function markMessagesRead(identityId, messageIds) {
  if (!isUuid(identityId)) return { status: 'skipped' };
  const ids = uniqueUuids(messageIds);
  if (ids.length === 0) return { status: 'skipped' };
  const res = await apiFetch(`${BASE_URL}/api/v1/messaging/read`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, messageIds: ids })
  });
  return handleResponse(res);
}

export async function editDirectMessage(senderIdentityId, messageId, peerEnvelopeData, selfEnvelopeData) {
  const res = await apiFetch(`${BASE_URL}/api/v1/messaging/edit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      senderIdentityId,
      messageId,
      peerEnvelopeData,
      selfEnvelopeData
    })
  });
  return handleResponse(res);
}

export async function sendPresenceHeartbeat(identityId, status = 'online') {
  const res = await apiFetch(`${BASE_URL}/api/v1/presence/heartbeat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, status })
  });
  return handleResponse(res);
}

export async function getPresenceStatus(gaiaIds = []) {
  const ids = Array.from(new Set((gaiaIds || []).filter(Boolean))).slice(0, 64);
  if (ids.length === 0) return { presence: {} };
  const query = ids.map(id => `gaiaId=${encodeURIComponent(id)}`).join('&');
  const res = await apiFetch(`${BASE_URL}/api/v1/presence/status?${query}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateTypingStatus(identityId, { peerGaiaId = '', channelId = '', isTyping = true } = {}) {
  const res = await apiFetch(`${BASE_URL}/api/v1/presence/typing`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, peerGaiaId, channelId, isTyping })
  });
  return handleResponse(res);
}

export async function getTypingStatus(identityId, { peerGaiaId = '', channelId = '' } = {}) {
  const params = new URLSearchParams({ identityId });
  if (peerGaiaId) params.set('peerGaiaId', peerGaiaId);
  if (channelId) params.set('channelId', channelId);
  const res = await apiFetch(`${BASE_URL}/api/v1/presence/typing?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function toggleMessageReaction(identityId, messageId, emoji) {
  const res = await apiFetch(`${BASE_URL}/api/v1/messaging/reaction`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, messageId, emoji })
  });
  return handleResponse(res);
}

export async function getMessageProof(messageId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/messaging/proof?messageId=${messageId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function deleteInboxMessage(identityId, messageId, forEveryone = false) {
  const res = await apiFetch(`${BASE_URL}/api/v1/messaging/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, messageId, forEveryone })
  });
  return handleResponse(res);
}

export async function clearInboxConversation(identityId, { peerGaiaId = '', channelId = '', forEveryone = false, messageIds = [] } = {}) {
  const res = await apiFetch(`${BASE_URL}/api/v1/messaging/clear`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, peerGaiaId, channelId, forEveryone, messageIds })
  });
  return handleResponse(res);
}
