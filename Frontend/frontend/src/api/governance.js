/* VGT GLASS 2100 — API MODULE: governance
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

export async function submitReport(messageId, senderPublicKey, recipientPublicKey, ciphertextHash, signature) {
  const identities = await getMyIdentities();
  const identity = Array.isArray(identities) ? identities[0] : null;
  if (!identity?.ID) {
    throw new Error('Für die Meldung ist eine aktive Identität erforderlich.');
  }
  const targetIsGaiaId = typeof senderPublicKey === 'string' && senderPublicKey.includes('@');
  const proof = JSON.stringify({
    kind: 'gaiacom.mail_abuse_proof.v1',
    messageId,
    sender: senderPublicKey,
    recipient: recipientPublicKey,
    ciphertextHash,
    signature
  });
  const res = await apiFetch(`${BASE_URL}/api/v1/reports`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      identityId: identity.ID,
      targetType: targetIsGaiaId ? 'user' : 'message',
      targetId: targetIsGaiaId ? senderPublicKey : messageId,
      category: 'other',
      severity: 'low',
      messageId,
      comment: proof
    })
  });
  return handleResponse(res);
}

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

export async function createCaseDisclosure(caseId, identityId, role, disclosurePackage, signature = '') {
  const res = await apiFetch(`${BASE_URL}/api/v1/reports/${encodeURIComponent(caseId)}/disclosures`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, role, package: disclosurePackage, signature })
  });
  return handleResponse(res);
}

export async function requestCaseDisclosure(caseId, identityId, targetRole, reason) {
  const res = await apiFetch(`${BASE_URL}/api/v1/reviewer/cases/${encodeURIComponent(caseId)}/disclosure-requests`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, targetRole, reason })
  });
  return handleResponse(res);
}

export async function createGaiasEyesGrant(identityId, { caseId = '', scope = 'case', disclosurePackage, signature = '', ttlSeconds = 900 } = {}) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gaias-eyes/grants`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, caseId, scope, package: disclosurePackage, signature, ttlSeconds })
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
