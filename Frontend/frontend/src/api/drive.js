/* VGT GLASS 2100 — API MODULE: drive
   Split from the historical src/api.js without behaviour change.
   Shared HTTP client helpers live in ./client.js. */

import { BASE_URL, apiFetch, getHeaders, handleResponse, getAuthToken } from './client';
import { limitError } from '../utils/mediaLimits';

export async function initUpload(fileName, fileSize, mimeType, fileHash) {
  const res = await apiFetch(`${BASE_URL}/api/v1/storage/init`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fileName, fileSize, mimeType, fileHash })
  });
  return handleResponse(res);
}

export async function uploadChunk(fileId, index, chunkHash, chunkBlob) {
  const formData = new FormData();
  formData.append('fileId', fileId);
  formData.append('index', String(index));
  formData.append('chunkHash', chunkHash);
  formData.append('chunk', chunkBlob);

  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1/storage/chunk`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) {
    throw new Error(`Chunk upload failed with status ${res.status}`);
  }
  return res.json();
}

export async function completeUpload(fileId) {
  const res = await apiFetch(`${BASE_URL}/api/v1/storage/complete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fileId })
  });
  return handleResponse(res);
}

export async function grantFileAccess(fileId, identityIds = [], expiresInHours = 0) {
  const cleanIdentityIds = Array.from(new Set((identityIds || []).filter(Boolean)));
  if (!fileId || cleanIdentityIds.length === 0) {
    return { status: 'skipped' };
  }
  const res = await apiFetch(`${BASE_URL}/api/v1/storage/grant`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fileId, identityIds: cleanIdentityIds, expiresInHours })
  });
  return handleResponse(res);
}

export async function grantAttachmentsAccess(attachments = [], identityIds = [], expiresInHours = 0) {
  const fileIds = Array.from(new Set((attachments || []).map(att => att && att.fileId).filter(Boolean)));
  const cleanIdentityIds = Array.from(new Set((identityIds || []).filter(Boolean)));
  if (fileIds.length === 0 || cleanIdentityIds.length === 0) {
    return { status: 'skipped' };
  }
  for (const fileId of fileIds) {
    await grantFileAccess(fileId, cleanIdentityIds, expiresInHours);
  }
  return { status: 'granted' };
}

/**
 * Download an encrypted attachment/envelope blob.
 *
 * SEC-FE FE-03 residual: optional `maxBytes` adds a pre-download guard using the
 * declared Content-Length (the body is aborted before it is buffered) plus a
 * post-download size enforcement for responses without Content-Length. Callers
 * pass caps from `utils/mediaLimits.js`; without `maxBytes` behaviour is
 * unchanged.
 */
export async function downloadFileAttachment(fileId, { maxBytes } = {}) {
  const cap = Number(maxBytes);
  const hasCap = Number.isFinite(cap) && cap > 0;
  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}/api/v1/storage/download/${encodeURIComponent(fileId)}`, {
    method: 'GET',
    headers
  });
  if (res.ok) {
    if (hasCap) {
      const declaredLength = Number(res.headers.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > cap) {
        try {
          await res.body?.cancel?.();
        } catch (_) {}
        throw limitError('Die Datei', cap);
      }
    }
    const blob = await res.blob();
    if (hasCap && blob.size > cap) {
      throw limitError('Die Datei', cap);
    }
    return blob;
  }
  if (res.status === 404) {
    throw new Error('File expired or deleted');
  }
  throw new Error('File download failed');
}
