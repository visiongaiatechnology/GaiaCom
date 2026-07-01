// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { isUuid, uniqueUuids } from './utils/uuid';

const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (typeof window !== 'undefined') {
    const isTauri = !!window.__TAURI__ || 
                    !!window.__TAURI_INTERNALS__ || 
                    !!window.__TAURI_METADATA__ ||
                    window.location.protocol.startsWith('tauri') || 
                    window.location.protocol.startsWith('file') || 
                    window.location.hostname.includes('tauri') ||
                    window.location.hostname === '';
    if (isTauri) {
      return localStorage.getItem('gaia_api_url') || 'https://beta.gaiacom.de';
    }
    return localStorage.getItem('gaia_api_url') || '';
  }
  return '';
};

const BASE_URL = {
  toString() {
    return getBaseUrl();
  }
};

let authToken = '';

try {
  localStorage.removeItem('gaia_auth_token');
} catch (_) {}

export function setAuthToken(token) {
  authToken = token || '';
  try {
    localStorage.removeItem('gaia_auth_token');
  } catch (_) {}
}

export function getAuthToken() {
  return authToken;
}

function getHeaders(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
}

function apiFetch(url, options = {}) {
  return fetch(url, {
    credentials: 'include',
    ...options
  });
}

async function handleResponse(response) {
  if (!response.ok) {
    let errMsg = 'Ein API-Fehler ist aufgetreten';
    try {
      const data = await response.json();
      errMsg = data.message || data.error || errMsg;
    } catch (_) {
      try {
        errMsg = await response.text() || errMsg;
      } catch (_) {}
    }
    throw new Error(errMsg);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

export async function register(username, password, publicKeyHex) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password, public_key: publicKeyHex })
  });
  return handleResponse(res);
}

export async function login(username, password) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password })
  });
  const data = await handleResponse(res);
  setAuthToken('');
  return data;
}

export async function getStatus() {
  try {
    const res = await apiFetch(`${BASE_URL}/api/v1/auth/status`, {
      method: 'GET',
      headers: getHeaders()
    });
    return await handleResponse(res);
  } catch (err) {
    setAuthToken(''); // Clear invalid token
    return { status: 'unauthenticated' };
  }
}

export async function changePassword(currentPassword, newPassword) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/change-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return handleResponse(res);
}

export async function updatePrivacySettings(allowAnonymousStats) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/privacy`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ allowAnonymousStats: !!allowAnonymousStats })
  });
  return handleResponse(res);
}

export async function deleteAccount(currentPassword) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/delete-account`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword })
  });
  return handleResponse(res);
}

export async function getDeviceSessions() {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/devices`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function revokeDeviceSession(sessionId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/devices/revoke`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sessionId })
  });
  return handleResponse(res);
}

export async function createIdentity(gaiaId, displayName, publicRecord) {
  const res = await apiFetch(`${BASE_URL}/api/v1/identity/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ gaiaId, displayName, publicRecord })
  });
  return handleResponse(res);
}

export async function getMyIdentities() {
  const res = await apiFetch(`${BASE_URL}/api/v1/identity/me`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getPublicIdentity(gaiaId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/identity/${encodeURIComponent(gaiaId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getTrustPassport(gaiaId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/trust-passport/${encodeURIComponent(gaiaId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveIdentityHumanProof(identityId, proof) {
  const res = await apiFetch(`${BASE_URL}/api/v1/identity/human-proof`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, proof })
  });
  return handleResponse(res);
}

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

export async function getInbox(identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/messaging/inbox?identityId=${identityId}`, {
    method: 'GET',
    headers: getHeaders()
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

export async function getMailboxMessages(identityId, filters = {}) {
  const params = new URLSearchParams({ identityId });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/messages?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateMailboxStates(identityId, states) {
  if (!isUuid(identityId)) return { status: 'skipped' };
  const cleanStates = (Array.isArray(states) ? states : [])
    .filter(state => isUuid(state?.messageId))
    .map(state => ({
      ...state,
      messageId: state.messageId.trim()
    }));
  if (cleanStates.length === 0) return { status: 'skipped' };
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/state`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, states: cleanStates })
  });
  return handleResponse(res);
}

export async function getMailDrafts(identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/drafts?identityId=${encodeURIComponent(identityId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailDraft(draft) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/drafts/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(draft)
  });
  return handleResponse(res);
}

export async function deleteMailDraft(draftId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/drafts/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ draftId })
  });
  return handleResponse(res);
}

export async function getMailLabels() {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/labels`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailLabel(label) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/labels/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(label)
  });
  return handleResponse(res);
}

export async function getMailContacts(query = '') {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/contacts${params}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailContact(contact) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/contacts/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(contact)
  });
  return handleResponse(res);
}

export async function getMailFilters() {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/filters`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailFilter(rule) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/filters/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(rule)
  });
  return handleResponse(res);
}

export async function getMailSettings() {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/settings`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailSettings(settings) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/settings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(settings)
  });
  return handleResponse(res);
}

export async function globalSearch(identityId, query, limit = 50) {
  const params = new URLSearchParams({ identityId, q: query, limit: String(limit) });
  const res = await apiFetch(`${BASE_URL}/api/v1/search/global?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function submitReport(messageId, senderPublicKey, recipientPublicKey, ciphertextHash, signature) {
  const res = await apiFetch(`${BASE_URL}/api/v1/reports/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messageId,
      senderPublicKey,
      recipientPublicKey,
      ciphertextHash,
      signature
    })
  });
  return handleResponse(res);
}

export async function getNodes() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/nodes`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getRooms() {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function createRoom(name, description, avatar, memberIds, isGroup = true) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, description, avatar, memberIds, isGroup, isPublic: false })
  });
  return handleResponse(res);
}

export async function updateRoom(roomId, patch) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/update`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      roomId,
      name: patch.name,
      description: patch.description,
      avatar: patch.avatar,
      isPrivate: patch.isPrivate,
      readOnly: patch.readOnly,
      slowModeSeconds: patch.slowModeSeconds,
      topSecret: patch.topSecret
    })
  });
  return handleResponse(res);
}

export async function searchPublicRooms(query) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function kickRoomMember(roomId, targetId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/members/kick`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, targetId })
  });
  return handleResponse(res);
}

export async function transferRoomOwnership(roomId, targetId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/transfer-ownership`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, targetId })
  });
  return handleResponse(res);
}

export async function getRoomPinnedMessages(roomId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/pins?roomId=${encodeURIComponent(roomId)}&channelId=${encodeURIComponent(channelId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function toggleRoomMessagePin(roomId, channelId, messageId, identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/pins/toggle`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, channelId, messageId, identityId })
  });
  return handleResponse(res);
}

export async function createRoomInviteLink(roomId, identityId, expiresAfterSeconds, maxUses) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/invites/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, identityId, expiresAfterSeconds, maxUses })
  });
  return handleResponse(res);
}

export async function joinRoomViaInviteLink(identityId, token) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/invites/join`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, token })
  });
  return handleResponse(res);
}

export async function getRoomJoinRequests(roomId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/join-requests?roomId=${encodeURIComponent(roomId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function createRoomJoinRequest(roomId, identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/join-requests/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, identityId })
  });
  return handleResponse(res);
}

export async function moderateRoomJoinRequest(roomId, requestId, status) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/join-requests/moderate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, requestId, status })
  });
  return handleResponse(res);
}

export async function getRoomModerationLogs(roomId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/moderation-logs?roomId=${encodeURIComponent(roomId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function joinRoom(identityId, hash) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/join`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, hash })
  });
  return handleResponse(res);
}

export async function leaveRoom(roomId, identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/leave`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, identityId })
  });
  return handleResponse(res);
}

export async function createChannel(roomId, name) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/channels`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, name })
  });
  return handleResponse(res);
}

export async function getChannels(roomId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/channels?roomId=${roomId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateMemberRole(roomId, targetId, role) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/members/role`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, targetId, role })
  });
  return handleResponse(res);
}

export async function deleteRoom(roomId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/rooms/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId })
  });
  return handleResponse(res);
}

export async function getServerVersion() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/version`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getNetworkHealth() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/network-health`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getPublicChannels() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function createPublicChannel(identityId, name, description, category = 'General', avatar = null) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, name, description, category, avatar })
  });
  return handleResponse(res);
}

export async function updatePublicChannel(channelId, name, description, category = 'General', avatar = null) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/update`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ channelId, name, description, category, avatar })
  });
  return handleResponse(res);
}

export async function updatePublicChannelComments(channelId, commentsEnabled) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ channelId, commentsEnabled })
  });
  return handleResponse(res);
}

export async function deletePublicChannel(channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ channelId })
  });
  return handleResponse(res);
}

export async function subscribePublicChannel(identityId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/subscribe`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId })
  });
  return handleResponse(res);
}

export async function unsubscribePublicChannel(identityId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/unsubscribe`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId })
  });
  return handleResponse(res);
}

export async function getPublicChannelPosts(channelId, limit = 50, identityId = '') {
  const identityQuery = identityId ? `&identityId=${encodeURIComponent(identityId)}` : '';
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts?channelId=${encodeURIComponent(channelId)}&limit=${encodeURIComponent(limit)}${identityQuery}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function createPublicChannelPost(identityId, channelId, body, formatting = null, attachments = null, scheduledFor = '') {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId, body, formatting, attachments, scheduledFor })
  });
  return handleResponse(res);
}

export async function togglePublicChannelPostReaction(identityId, postId, emoji) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/reaction`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, postId, emoji })
  });
  return handleResponse(res);
}

export async function createPublicChannelPostComment(identityId, postId, body) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/comment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, postId, body })
  });
  return handleResponse(res);
}

export async function updatePublicChannelPostPin(postId, pinned) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/pin`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ postId, pinned })
  });
  return handleResponse(res);
}

export async function blockPublicChannel(identityId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/block`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId })
  });
  return handleResponse(res);
}

export async function unblockPublicChannel(identityId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/unblock`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId })
  });
  return handleResponse(res);
}

export async function discoverPublicChannels(identityId, query = '', category = '') {
  const qStr = query ? `&q=${encodeURIComponent(query)}` : '';
  const catStr = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/discover?identityId=${encodeURIComponent(identityId)}${qStr}${catStr}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function deleteChannelComment(commentId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/comments/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ commentId })
  });
  return handleResponse(res);
}

export async function moderateChannelComment(commentId, status) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/comments/moderate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ commentId, status })
  });
  return handleResponse(res);
}

export async function submitGaiaDrop(targetGaiaId, senderLabel, payload) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/gaiadrop/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ targetGaiaId, senderLabel, payload })
  });
  return handleResponse(res);
}

export async function getGaiaDropInbox(identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gaiadrop/inbox?identityId=${identityId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function markGaiaDropRead(id) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gaiadrop/read?id=${id}`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function deleteGaiaDrop(id) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gaiadrop/delete?id=${id}`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}

// --- GOVERNANCE & ABUSE CONSENSUS API ---

export async function getGovernanceRoles() {
  const res = await apiFetch(`${BASE_URL}/api/v1/governance/roles`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function submitAbuseReport(identityId, targetType, targetId, category, severity, messageId = null, comment = '') {
  const res = await apiFetch(`${BASE_URL}/api/v1/reports`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, targetType, targetId, category, severity, messageId, comment })
  });
  return handleResponse(res);
}

export async function getMyReports() {
  const res = await apiFetch(`${BASE_URL}/api/v1/reports/mine`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getReportDetail(caseId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/reports/${encodeURIComponent(caseId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function submitAppeal(caseId, identityId, reason, statement) {
  const res = await apiFetch(`${BASE_URL}/api/v1/reports/${encodeURIComponent(caseId)}/appeal`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, reason, statement })
  });
  return handleResponse(res);
}

export async function getReviewerQueue() {
  const res = await apiFetch(`${BASE_URL}/api/v1/reviewer/cases`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function submitReview(caseId, identityId, categoryVote, severityVote, recommendation, reason) {
  const res = await apiFetch(`${BASE_URL}/api/v1/reviewer/cases/${encodeURIComponent(caseId)}/review`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, categoryVote, severityVote, recommendation, reason })
  });
  return handleResponse(res);
}

export async function getNodeOperatorQueue() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/abuse/queue`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function applyNodeOperatorAction(identityId, targetType, targetId, suspend, reason) {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/abuse/actions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, targetType, targetId, suspend, reason })
  });
  return handleResponse(res);
}

export async function createTransparencySnapshot() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/transparency/snapshot`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getPublicTransparency() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/transparency`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getSecuritySummary() {
  const res = await apiFetch(`${BASE_URL}/api/v1/security/me/summary`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getSecurityEvents() {
  const res = await apiFetch(`${BASE_URL}/api/v1/security/me/events`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function acknowledgeSecurityEvent(eventId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/security/me/events/${encodeURIComponent(eventId)}/acknowledge`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function exportSecurityReport(format = 'json') {
  const res = await apiFetch(`${BASE_URL}/api/v1/security/me/report?format=${format}`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (res.ok) {
    return res.blob();
  }
  throw new Error('Report export failed');
}

export async function getNodeSecuritySummary() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/security/summary`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getNodeSecurityEvents() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/security/events`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getNodeRegistrySummary() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/registry/summary`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function generateNodeRegistrySecrets() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/registry/secrets`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function pingNodeRegistryMain() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/registry/ping-main`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateNodeRegistryStatus(domain, status, lastError = '') {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/registry/${encodeURIComponent(domain)}/status`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ status, lastError })
  });
  return handleResponse(res);
}

export async function getPublicSecurityHealth() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/security/health`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function initUpload(fileName, fileSize, mimeType, fileHash) {
  const res = await apiFetch(`${BASE_URL}/api/v1/storage/init`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fileName, fileSize, mimeType, fileHash })
  });
  return handleResponse(res);
}

export async function uploadChunk(fileId, index, chunkHash, chunkBlob) {
  const formData = new FormData();
  formData.append('fileId', fileId);
  formData.append('index', String(index));
  formData.append('chunkHash', chunkHash);
  formData.append('chunk', chunkBlob);

  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1/storage/chunk`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) {
    throw new Error(`Chunk upload failed with status ${res.status}`);
  }
  return res.json();
}

export async function completeUpload(fileId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/storage/complete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fileId })
  });
  return handleResponse(res);
}

export async function grantFileAccess(fileId, identityIds = [], expiresInHours = 0) {
  const cleanIdentityIds = Array.from(new Set((identityIds || []).filter(Boolean)));
  if (!fileId || cleanIdentityIds.length === 0) {
    return { status: 'skipped' };
  }
  const res = await apiFetch(`${BASE_URL}/api/v1/storage/grant`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fileId, identityIds: cleanIdentityIds, expiresInHours })
  });
  return handleResponse(res);
}

export async function grantAttachmentsAccess(attachments = [], identityIds = [], expiresInHours = 0) {
  const fileIds = Array.from(new Set((attachments || []).map(att => att && att.fileId).filter(Boolean)));
  const cleanIdentityIds = Array.from(new Set((identityIds || []).filter(Boolean)));
  if (fileIds.length === 0 || cleanIdentityIds.length === 0) {
    return { status: 'skipped' };
  }
  for (const fileId of fileIds) {
    await grantFileAccess(fileId, cleanIdentityIds, expiresInHours);
  }
  return { status: 'granted' };
}

export async function downloadFileAttachment(fileId) {
  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}/api/v1/storage/download/${encodeURIComponent(fileId)}`, {
    method: 'GET',
    headers
  });
  if (res.ok) {
    return res.blob();
  }
  if (res.status === 404) {
    throw new Error('File expired or deleted');
  }
  throw new Error('File download failed');
}

export async function createGsnPost(identityId, body, imageAttachment, signature, repostOfPostId = '', timestamp) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, body, imageAttachment, signature, repostOfPostId, timestamp })
  });
  return handleResponse(res);
}

export async function deleteGsnPost(postId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getGsnFeedNode(nodeId = '') {
  const query = nodeId ? `?node_id=${encodeURIComponent(nodeId)}` : '';
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/feed/node${query}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getGsnFeedFollowing() {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/feed/following`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function reactToGsnPost(postId, identityId, emoji) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}/react`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, emoji })
  });
  return handleResponse(res);
}

export async function addGsnComment(postId, identityId, body, signature, timestamp) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}/comment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, body, signature, timestamp })
  });
  return handleResponse(res);
}

export async function getGsnComments(postId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function deleteGsnComment(postId, commentId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function followGsnUser(identityId, followingGaiaId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/follow`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, followingGaiaId })
  });
  return handleResponse(res);
}

export async function unfollowGsnUser(identityId, followingGaiaId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/unfollow`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, followingGaiaId })
  });
  return handleResponse(res);
}

export async function getGsnProfile(gaiaId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/profile/${encodeURIComponent(gaiaId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateGsnProfile(identityId, displayName, description, avatar, website, realName = '') {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/profile`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, displayName, description, avatar, website, realName })
  });
  return handleResponse(res);
}
