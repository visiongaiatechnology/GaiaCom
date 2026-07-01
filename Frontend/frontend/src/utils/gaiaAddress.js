// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
export function parseToGaiaID(input) {
  const trimmed = String(input || '').trim();
  if (trimmed.startsWith('@') && trimmed.includes(':')) {
    return trimmed;
  }
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    return `@${local}:${domain}`;
  }
  return trimmed;
}

export function displayGaiaID(gaiaId) {
  const value = String(gaiaId || '');
  if (value.startsWith('@') && value.includes(':')) {
    const clean = value.slice(1);
    const [local, domain] = clean.split(':');
    return `${local}@${domain}`;
  }
  return value;
}
