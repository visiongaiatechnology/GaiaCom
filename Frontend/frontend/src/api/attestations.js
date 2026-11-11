/* VGT GLASS 2100 — API MODULE: identity attestations (badges)
   Signed, issuer-attributed, revocable claims about an identity. Every response
   carries the canonical payload, the Ed25519 signature and the issuer public
   key so the client can verify the claim locally instead of trusting a boolean. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

/** Public list of attestations for one identity (valid/expired/revoked). */
export async function getIdentityAttestations(gaiaID) {
  const clean = String(gaiaID || '').trim();
  if (!clean) return { subject: '', attestations: [] };
  const res = await apiFetch(
    `${BASE_URL}/api/v1/identities/${encodeURIComponent(clean)}/attestations`,
    { method: 'GET', headers: getHeaders() }
  );
  return handleResponse(res);
}

/** Operator-only: list attestations issued by this node. */
export async function listIssuedAttestations({ status = 'all', limit = 50, cursor = '' } = {}) {
  const params = new URLSearchParams({ status: String(status), limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const res = await apiFetch(`${BASE_URL}/api/v1/node/attestations?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

/** Operator-only: issue a signed attestation for an identity on this node. */
export async function issueAttestation(payload) {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/attestations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload || {})
  });
  return handleResponse(res);
}

/** Operator-only: revoke an attestation with a documented reason. */
export async function revokeAttestation(attestationID, reason) {
  const res = await apiFetch(
    `${BASE_URL}/api/v1/node/attestations/${encodeURIComponent(String(attestationID || ''))}`,
    { method: 'DELETE', headers: getHeaders(), body: JSON.stringify({ reason: String(reason || '') }) }
  );
  return handleResponse(res);
}

/** Operator-only: business metrics for the operator console (no personal data). */
export async function getNodeOperatorStats() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/operator/stats`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

/**
 * Operator-only break-glass directory lookup. The reason is mandatory, logged
 * server-side and surfaced through the public transparency log.
 */
export async function lookupNodeIdentities({ reason, query = '', limit = 25, cursor = '' } = {}) {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/identities/directory`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason: String(reason || ''), query: String(query || ''), limit, cursor })
  });
  return handleResponse(res);
}

/** Transparency log of break-glass directory reads (visible to every user). */
export async function getNodeAccessLog() {
  const res = await apiFetch(`${BASE_URL}/api/v1/node/operator/access-log`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}
