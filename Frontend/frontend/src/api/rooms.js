/* VGT GLASS 2100 — API MODULE: rooms
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

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
