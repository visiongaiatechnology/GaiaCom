/* VGT GLASS 2100 — API MODULE: federation
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

export async function getNodes() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/nodes`, {
    method: 'GET',
    headers: getHeaders()
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

export async function getPublicSecurityHealth() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public/security/health`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}
