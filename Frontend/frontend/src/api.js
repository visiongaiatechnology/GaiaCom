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

let authToken = localStorage.getItem('gaia_auth_token') || '';

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('gaia_auth_token', token);
  } else {
    localStorage.removeItem('gaia_auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

function getHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
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
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password, public_key: publicKeyHex })
  });
  return handleResponse(res);
}

export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password })
  });
  const data = await handleResponse(res);
  if (data && data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getStatus() {
  if (!authToken) return { status: 'unauthenticated' };
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/status`, {
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
  const res = await fetch(`${BASE_URL}/api/v1/auth/change-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return handleResponse(res);
}

export async function getDeviceSessions() {
  const res = await fetch(`${BASE_URL}/api/v1/auth/devices`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function revokeDeviceSession(sessionId) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/devices/revoke`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sessionId })
  });
  return handleResponse(res);
}

export async function createIdentity(gaiaId, displayName, publicRecord) {
  const res = await fetch(`${BASE_URL}/api/v1/identity/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ gaiaId, displayName, publicRecord })
  });
  return handleResponse(res);
}

export async function getMyIdentities() {
  const res = await fetch(`${BASE_URL}/api/v1/identity/me`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getPublicIdentity(gaiaId) {
  const res = await fetch(`${BASE_URL}/api/v1/public/identity/${encodeURIComponent(gaiaId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getTrustPassport(gaiaId) {
  const res = await fetch(`${BASE_URL}/api/v1/public/trust-passport/${encodeURIComponent(gaiaId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function sendMessage(senderIdentityId, recipientIds, envelopeData) {
  const res = await fetch(`${BASE_URL}/api/v1/messaging/send`, {
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
  const res = await fetch(`${BASE_URL}/api/v1/smtp/send`, {
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
  const res = await fetch(`${BASE_URL}/api/v1/messaging/inbox?identityId=${identityId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function markMessagesRead(identityId, messageIds) {
  const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
  const res = await fetch(`${BASE_URL}/api/v1/messaging/read`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, messageIds: ids.filter(Boolean) })
  });
  return handleResponse(res);
}

export async function getMessageProof(messageId) {
  const res = await fetch(`${BASE_URL}/api/v1/messaging/proof?messageId=${messageId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function deleteInboxMessage(identityId, messageId, forEveryone = false) {
  const res = await fetch(`${BASE_URL}/api/v1/messaging/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, messageId, forEveryone })
  });
  return handleResponse(res);
}

export async function clearInboxConversation(identityId, { peerGaiaId = '', channelId = '', forEveryone = false } = {}) {
  const res = await fetch(`${BASE_URL}/api/v1/messaging/clear`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, peerGaiaId, channelId, forEveryone })
  });
  return handleResponse(res);
}

export async function submitReport(messageId, senderPublicKey, recipientPublicKey, ciphertextHash, signature) {
  const res = await fetch(`${BASE_URL}/api/v1/reports/submit`, {
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
  const res = await fetch(`${BASE_URL}/api/v1/public/nodes`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getRooms() {
  const res = await fetch(`${BASE_URL}/api/v1/rooms`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function createRoom(name, description, avatar, memberIds, isGroup = true) {
  const res = await fetch(`${BASE_URL}/api/v1/rooms/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, description, avatar, memberIds, isGroup, isPublic: false })
  });
  return handleResponse(res);
}

export async function updateRoom(roomId, patch) {
  const res = await fetch(`${BASE_URL}/api/v1/rooms/update`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      roomId,
      name: patch.name,
      description: patch.description,
      avatar: patch.avatar
    })
  });
  return handleResponse(res);
}

export async function joinRoom(identityId, hash) {
  const res = await fetch(`${BASE_URL}/api/v1/rooms/join`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, hash })
  });
  return handleResponse(res);
}

export async function leaveRoom(roomId, identityId) {
  const res = await fetch(`${BASE_URL}/api/v1/rooms/leave`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, identityId })
  });
  return handleResponse(res);
}

export async function createChannel(roomId, name) {
  const res = await fetch(`${BASE_URL}/api/v1/rooms/channels`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, name })
  });
  return handleResponse(res);
}

export async function getChannels(roomId) {
  const res = await fetch(`${BASE_URL}/api/v1/rooms/channels?roomId=${roomId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateMemberRole(roomId, targetId, role) {
  const res = await fetch(`${BASE_URL}/api/v1/rooms/members/role`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, targetId, role })
  });
  return handleResponse(res);
}

export async function deleteRoom(roomId) {
  const res = await fetch(`${BASE_URL}/api/v1/rooms/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roomId })
  });
  return handleResponse(res);
}

export async function getServerVersion() {
  const res = await fetch(`${BASE_URL}/api/v1/public/version`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function submitGaiaDrop(targetGaiaId, senderLabel, payload) {
  const res = await fetch(`${BASE_URL}/api/v1/public/gaiadrop/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ targetGaiaId, senderLabel, payload })
  });
  return handleResponse(res);
}

export async function getGaiaDropInbox(identityId) {
  const res = await fetch(`${BASE_URL}/api/v1/gaiadrop/inbox?identityId=${identityId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function markGaiaDropRead(id) {
  const res = await fetch(`${BASE_URL}/api/v1/gaiadrop/read?id=${id}`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function deleteGaiaDrop(id) {
  const res = await fetch(`${BASE_URL}/api/v1/gaiadrop/delete?id=${id}`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}
