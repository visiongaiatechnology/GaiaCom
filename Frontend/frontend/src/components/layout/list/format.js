/**
 * VGT GLASS 2100 — Inbox list formatting helpers.
 *
 * Pure presentation utilities for the list rail (labels, timestamps, initials,
 * text truncation). No state, no fetching, no behaviour.
 */

import { safeJsonParse } from '../../../utils/safeJson';

/**
 * Mailbox labels arrive either as an array (optimistically patched mail) or as
 * a JSON string straight from the API. Keep the exact historical semantics.
 */
export function parseMailboxLabels(labels) {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === 'string') {
    const parsed = safeJsonParse(labels, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

/**
 * Absolute date label (same locale formatting the pane already used) plus a
 * full timestamp for the native tooltip. Invalid or missing dates stay honest
 * instead of rendering "Invalid Date".
 */
export function listTimestamp(value) {
  if (!value) return { label: '–', title: undefined, dateTime: undefined };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: '–', title: undefined, dateTime: undefined };
  return {
    label: date.toLocaleDateString(),
    title: date.toLocaleString(),
    dateTime: date.toISOString()
  };
}

/**
 * Two-character quiet mark used instead of image frameworks for people/rooms.
 */
export function initialsMark(label) {
  const clean = String(label == null ? '' : label).replace(/^@+/, '').trim();
  if (!clean) return '#';
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '#';
  const first = parts[0].charAt(0);
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : parts[0].charAt(1);
  return `${first}${second || ''}`.toUpperCase();
}

/**
 * Group avatars are user data (usually a short glyph). Remote/data URLs are not
 * rendered as text; those fall back to the room initials mark.
 */
export function avatarText(value, fallbackLabel) {
  const text = value == null ? '' : String(value).trim();
  if (text && !/^(https?:|data:|blob:)/i.test(text)) return text.slice(0, 3);
  return initialsMark(fallbackLabel);
}

/** Collapse whitespace and clamp text at a character budget. */
export function truncateText(value, max = 80) {
  if (value == null) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/** Honest badge string; the caller passes App's real formatter when available. */
export function badgeCount(value, formatBadgeCount) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (typeof formatBadgeCount === 'function') {
    const formatted = formatBadgeCount(count);
    if (formatted != null) return formatted;
  }
  return count > 99 ? '99+' : String(count);
}
