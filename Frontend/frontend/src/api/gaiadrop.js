/* VGT GLASS 2100 — API MODULE: gaiadrop
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

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
