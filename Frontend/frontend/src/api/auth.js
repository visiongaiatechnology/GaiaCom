/* VGT GLASS 2100 — API MODULE: auth
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse, isDesktopRuntime, setAuthToken, setSessionTokens } from './client';

export async function register(username, password, publicKeyHex) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password, public_key: publicKeyHex })
  });
  return handleResponse(res);
}

export async function login(username, password) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password })
  });
  const data = await handleResponse(res);
  if (isDesktopRuntime()) {
    setSessionTokens(
      typeof data?.access_token === 'string' ? data.access_token : '',
      typeof data?.refresh_token === 'string' ? data.refresh_token : ''
    );
  } else {
    setSessionTokens('', '');
  }
  return data;
}

export async function getStatus() {
  try {
    const res = await apiFetch(`${BASE_URL}/api/v1/auth/status`, {
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
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/change-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return handleResponse(res);
}

export async function logout() {
  try {
    const res = await apiFetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({})
    });
    return await handleResponse(res);
  } finally {
    setAuthToken('');
  }
}

export async function updatePrivacySettings(allowAnonymousStats) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/privacy`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ allowAnonymousStats: !!allowAnonymousStats })
  });
  return handleResponse(res);
}

export async function getNotificationPreferences() {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/notification-preferences`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function saveNotificationPreferences(preferences) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/notification-preferences`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      enabled: preferences?.enabled !== false,
      showPreview: preferences?.showPreview === true,
      quietHoursEnabled: preferences?.quietHoursEnabled === true,
      quietHoursStart: preferences?.quietHoursStart || '22:00',
      quietHoursEnd: preferences?.quietHoursEnd || '07:00'
    })
  });
  return handleResponse(res);
}

export async function deleteAccount(currentPassword) {
  const res = await apiFetch(`${BASE_URL}/api/v1/auth/delete-account`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword })
  });
  return handleResponse(res);
}
