/* VGT GLASS 2100 — API MODULE: mailbox
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';
import { isUuid } from '../utils/uuid';

export async function getMailboxMessages(identityId, filters = {}) {
  const params = new URLSearchParams({ identityId });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/messages?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateMailboxStates(identityId, states) {
  if (!isUuid(identityId)) return { status: 'skipped' };
  const cleanStates = (Array.isArray(states) ? states : [])
    .filter(state => isUuid(state?.messageId))
    .map(state => ({
      ...state,
      messageId: state.messageId.trim()
    }));
  if (cleanStates.length === 0) return { status: 'skipped' };
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/state`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, states: cleanStates })
  });
  return handleResponse(res);
}

export async function getMailDrafts(identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/drafts?identityId=${encodeURIComponent(identityId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailDraft(draft) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/drafts/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(draft)
  });
  return handleResponse(res);
}

export async function deleteMailDraft(draftId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/drafts/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ draftId })
  });
  return handleResponse(res);
}

export async function getMailLabels() {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/labels`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailLabel(label) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/labels/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(label)
  });
  return handleResponse(res);
}

export async function getMailContacts(query = '') {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/contacts${params}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailContact(contact) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/contacts/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(contact)
  });
  return handleResponse(res);
}

export async function getMailFilters() {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/filters`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailFilter(rule) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/filters/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(rule)
  });
  return handleResponse(res);
}

export async function getMailSettings() {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/settings`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveMailSettings(settings) {
  const res = await apiFetch(`${BASE_URL}/api/v1/mailbox/settings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(settings)
  });
  return handleResponse(res);
}
