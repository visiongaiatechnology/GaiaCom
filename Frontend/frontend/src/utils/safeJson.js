export function safeJsonParse(value, fallback = null) {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

export function safeStorageJson(storage, key, fallback = null) {
  try {
    return safeJsonParse(storage.getItem(key), fallback);
  } catch (_) {
    return fallback;
  }
}
