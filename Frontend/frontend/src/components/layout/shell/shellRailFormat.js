/**
 * Shell formatting helpers — VGT GLASS 2100.
 * Small, pure helpers shared by the navigation rail, the mobile dock and its
 * "Mehr" sheet. They never invent data: a badge only renders when the caller
 * passes a real positive count from application state.
 */

/** Translate with an explicit German fallback when the key is missing. */
export function tr(t, key, fallback) {
  const value = typeof t === 'function' ? t(key) : undefined;
  if (value === undefined || value === null) return fallback;
  const text = String(value);
  return text.trim() === '' ? fallback : text;
}

/** Preformatted badge text for an honest count, or null when there is none. */
export function badgeText(formatBadgeCount, count) {
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return null;
  if (typeof formatBadgeCount === 'function') {
    const formatted = formatBadgeCount(count);
    return formatted === undefined || formatted === null ? String(count) : String(formatted);
  }
  return String(count);
}
