// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { safeJsonParse } from './safeJson';

export function parsePayload(rawPayload) {
  if (!rawPayload) return null;
  if (typeof rawPayload === 'object') return rawPayload;
  if (typeof rawPayload === 'string') {
    const trimmed = rawPayload.trim();
    if (trimmed.startsWith('ey')) {
      try {
        return safeJsonParse(atob(trimmed), null);
      } catch (_) {}
    }
    return safeJsonParse(trimmed, null);
  }
  return null;
}

export function createClientMessageId() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
