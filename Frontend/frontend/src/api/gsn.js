/* VGT GLASS 2100 — API MODULE: gsn
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

export async function createGsnPost(identityId, body, imageAttachment, signature, repostOfPostId = '', timestamp) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, body, imageAttachment, signature, repostOfPostId, timestamp })
  });
  return handleResponse(res);
}

export async function deleteGsnPost(postId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getGsnFeedNode(nodeId = '') {
  const query = nodeId ? `?node_id=${encodeURIComponent(nodeId)}` : '';
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/feed/node${query}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getGsnFeedFollowing() {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/feed/following`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function reactToGsnPost(postId, identityId, emoji) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}/react`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, emoji })
  });
  return handleResponse(res);
}

export async function addGsnComment(postId, identityId, body, signature, timestamp) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}/comment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, body, signature, timestamp })
  });
  return handleResponse(res);
}

export async function getGsnComments(postId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function deleteGsnComment(postId, commentId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function followGsnUser(identityId, followingGaiaId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/follow`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, followingGaiaId })
  });
  return handleResponse(res);
}

export async function unfollowGsnUser(identityId, followingGaiaId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/unfollow`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, followingGaiaId })
  });
  return handleResponse(res);
}

export async function getGsnProfile(gaiaId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/profile/${encodeURIComponent(gaiaId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function updateGsnProfile(identityId, displayName, description, avatar, website, realName = '') {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/profile`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, displayName, description, avatar, website, realName })
  });
  return handleResponse(res);
}

/* Real social data. No payload here is synthesized; the backend derives every
   value from stored posts, follows and notification events. */

export async function getGsnNotifications(identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/notifications?identity_id=${encodeURIComponent(identityId)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function markGsnNotificationsRead(identityId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/notifications/read?identity_id=${encodeURIComponent(identityId)}`, {
    method: 'POST',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getGsnTrends(windowHours = 168) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/trends?window_hours=${encodeURIComponent(windowHours)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getGsnSuggestions(identityId, limit = 5) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/suggestions?identity_id=${encodeURIComponent(identityId)}&limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getGsnNetwork(identityId, limit = 100) {
  const res = await apiFetch(`${BASE_URL}/api/v1/gsn/network?identity_id=${encodeURIComponent(identityId)}&limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}
