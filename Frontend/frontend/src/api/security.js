/* VGT GLASS 2100 — API MODULE: security
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

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
