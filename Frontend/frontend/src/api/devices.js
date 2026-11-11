/* VGT GLASS 2100 — API MODULE: devices
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

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

// Device pairing is deliberately separate from login sessions. The pairing secret
// travels only in the QR/manual handover and is never persisted by this client.

export async function startDevicePairing(identityId, deviceLabel, deviceBoxPublic, deviceKemPublic, deviceSignPublic) {
  const res = await apiFetch(`${BASE_URL}/api/v1/devices/pairings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, deviceLabel, deviceBoxPublic, deviceKemPublic, deviceSignPublic })
  });
  return handleResponse(res);
}

export async function getDevicePairing(pairingId, secret) {
  const res = await apiFetch(`${BASE_URL}/api/v1/devices/pairings/${encodeURIComponent(pairingId)}`, {
    method: 'GET',
    headers: getHeaders({ 'X-Gaia-Pairing-Secret': secret })
  });
  return handleResponse(res);
}

export async function approveDevicePairing(pairingId, secret, encryptedPayload, signature, approverDeviceKeyId = '', deviceSignature = '') {
  const res = await apiFetch(`${BASE_URL}/api/v1/devices/pairings/${encodeURIComponent(pairingId)}/approve`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ secret, encryptedPayload, signature, approverDeviceKeyId, deviceSignature })
  });
  return handleResponse(res);
}

export async function consumeDevicePairing(pairingId, secret) {
  const res = await apiFetch(`${BASE_URL}/api/v1/devices/pairings/${encodeURIComponent(pairingId)}/consume`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ secret })
  });
  return handleResponse(res);
}

export async function getDeviceKeys() {
  const res = await apiFetch(`${BASE_URL}/api/v1/devices/keys`, { method: 'GET', headers: getHeaders() });
  return handleResponse(res);
}

export async function revokeDeviceKey(keyId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/devices/keys/${encodeURIComponent(keyId)}/revoke`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({})
  });
  return handleResponse(res);
}
