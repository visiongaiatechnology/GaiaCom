/* VGT GLASS 2100 — API MODULE: search
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

export async function globalSearch(identityId, query, limit = 50) {
  const params = new URLSearchParams({ identityId, q: query, limit: String(limit) });
  const res = await apiFetch(`${BASE_URL}/api/v1/search/global?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

/**
 * Mail abuse report -> single authoritative governance pipeline.
 *
 * The legacy trustmesh `/api/v1/reports/submit` path stored a proof that never
 * appeared in the reviewer or node-operator queues. This wrapper now creates a
 * governance abuse case (`POST /api/v1/reports`), so a reported mail is visible
 * to reviewers and operators; the cryptographic proof material is preserved in
 * the case comment.
 *
 * Authz: protected route. The server verifies that the acting identity belongs
 * to the authenticated user (Backend/governance/handler.go `CreateReport`) and
 * requires an owned identity; the caller signature is unchanged.
 */
