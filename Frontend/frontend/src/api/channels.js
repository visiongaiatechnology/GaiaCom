/* VGT GLASS 2100 — API MODULE: channels
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse } from './client';

export async function getPublicChannels() {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function createPublicChannel(identityId, name, description, category = 'General', avatar = null) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, name, description, category, avatar })
  });
  return handleResponse(res);
}

export async function updatePublicChannel(channelId, name, description, category = 'General', avatar = null) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/update`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ channelId, name, description, category, avatar })
  });
  return handleResponse(res);
}

export async function updatePublicChannelComments(channelId, commentsEnabled) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ channelId, commentsEnabled })
  });
  return handleResponse(res);
}

export async function deletePublicChannel(channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ channelId })
  });
  return handleResponse(res);
}

export async function subscribePublicChannel(identityId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/subscribe`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId })
  });
  return handleResponse(res);
}

export async function unsubscribePublicChannel(identityId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/unsubscribe`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId })
  });
  return handleResponse(res);
}

export async function getPublicChannelPosts(channelId, limit = 50, identityId = '') {
  const identityQuery = identityId ? `&identityId=${encodeURIComponent(identityId)}` : '';
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts?channelId=${encodeURIComponent(channelId)}&limit=${encodeURIComponent(limit)}${identityQuery}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function createPublicChannelPost(identityId, channelId, body, formatting = null, attachments = null, scheduledFor = '') {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId, body, formatting, attachments, scheduledFor })
  });
  return handleResponse(res);
}

export async function togglePublicChannelPostReaction(identityId, postId, emoji) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/reaction`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, postId, emoji })
  });
  return handleResponse(res);
}

export async function createPublicChannelPostComment(identityId, postId, body) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/comment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, postId, body })
  });
  return handleResponse(res);
}

export async function updatePublicChannelPostPin(postId, pinned) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/pin`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ postId, pinned })
  });
  return handleResponse(res);
}

export async function blockPublicChannel(identityId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/block`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId })
  });
  return handleResponse(res);
}

export async function unblockPublicChannel(identityId, channelId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/unblock`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ identityId, channelId })
  });
  return handleResponse(res);
}

export async function discoverPublicChannels(identityId, query = '', category = '') {
  const qStr = query ? `&q=${encodeURIComponent(query)}` : '';
  const catStr = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/discover?identityId=${encodeURIComponent(identityId)}${qStr}${catStr}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function deleteChannelComment(commentId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/comments/delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ commentId })
  });
  return handleResponse(res);
}

export async function moderateChannelComment(commentId, status) {
  const res = await apiFetch(`${BASE_URL}/api/v1/public-channels/posts/comments/moderate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ commentId, status })
  });
  return handleResponse(res);
}
