// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
const SECRET_FIELD_PATTERNS = [
  /mnemonic/i,
  /seed/i,
  /private[_-]?key/i,
  /secret/i,
  /jwt/i,
  /auth[_-]?token/i,
  /^token$/i,
  /recovery[_-]?phrase/i
];

const SECRET_VALUE_PATTERNS = [
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident)\b(?:\s+\w+){10,23}/i
];

function isSecretField(key) {
  return SECRET_FIELD_PATTERNS.some(pattern => pattern.test(String(key || '')));
}

function isSecretValue(value) {
  return typeof value === 'string' && SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value));
}

export function sanitizeSecureExport(value) {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeSecureExport(item));
  }

  if (!value || typeof value !== 'object') {
    return isSecretValue(value) ? '[REDACTED_SECRET]' : value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (isSecretField(key) || isSecretValue(entry)) {
        return [key, '[REDACTED_SECRET]'];
      }
      return [key, sanitizeSecureExport(entry)];
    })
  );
}

export function assertSecureExportClean(value) {
  const serialized = JSON.stringify(value);
  if (SECRET_VALUE_PATTERNS.some(pattern => pattern.test(serialized))) {
    throw new Error('Export rejected because secret material was detected.');
  }
  return value;
}
