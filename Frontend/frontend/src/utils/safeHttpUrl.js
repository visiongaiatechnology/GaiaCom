/**
 * VGT GaiaCom — safe external URL helper (SEC-FE FE-04/FE-06).
 *
 * One allowlist for every place that opens or links a URL value that can be
 * influenced by message/contact/GSN/channel content. Only absolute `http:` and
 * `https:` URLs are accepted; `javascript:`, `data:`, `file:`, `blob:` and
 * relative strings are rejected. URLs that embed credentials
 * (`https://trusted.example@evil.example`) are rejected as phishing vectors.
 */

export function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_) {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  return parsed.href;
}

export function isSafeHttpUrl(value) {
  return safeHttpUrl(value) !== null;
}

/**
 * User-entered website values are accepted without a scheme (e.g. "example.com")
 * by prefixing `https://`, then validated with the same allowlist. Anything that
 * cannot be normalised to http(s) returns null so callers render plain text
 * instead of a link.
 */
export function safeWebsiteUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  return safeHttpUrl(hasScheme ? raw : `https://${raw}`);
}
