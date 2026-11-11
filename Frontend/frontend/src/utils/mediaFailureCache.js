/**
 * Session-scoped memory of media objects the server reported as gone
 * (expired/deleted attachments). Components consult it before requesting the
 * same object again, so an expired GSN image or chat attachment is resolved
 * once and does not re-trigger a storage request on every re-render/navigation.
 *
 * It intentionally keeps only opaque file ids in memory (no content, no
 * persistence) and is cleared with the page.
 */
const missingMediaIds = new Set();

const keyOf = (fileId) => String(fileId || '').trim();

export function isMediaKnownMissing(fileId) {
  const key = keyOf(fileId);
  return Boolean(key) && missingMediaIds.has(key);
}

export function markMediaMissing(fileId) {
  const key = keyOf(fileId);
  if (key) missingMediaIds.add(key);
}

export function isMissingMediaError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('file expired or deleted')
    || message.includes('expired')
    || message.includes('not found')
    || message.includes('404')
    || message.includes('abgelaufen')
    || message.includes('gelöscht')
    || message.includes('nicht gefunden');
}
