/* VGT GLASS 2100 — API MODULE: identity
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

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
