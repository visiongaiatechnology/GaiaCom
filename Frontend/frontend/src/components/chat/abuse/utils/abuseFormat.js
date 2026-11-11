import { safeJsonParse } from '../../../../utils/safeJson';

/**
 * Presentation helpers for the abuse/governance surface.
 *
 * Labels are derived from server values; missing values are reported as
 * unavailable instead of being displayed as a real measurement.
 */
export const UNAVAILABLE = 'Nicht verfügbar';

export const STATUS_LABELS = Object.freeze({
  new: 'Neu',
  triaged: 'Triagiert',
  reviewing: 'In Prüfung',
  actioned: 'Maßnahme aktiv',
  appealed: 'Einspruch offen',
  closed: 'Geschlossen',
  quarantined: 'Quarantäne'
});

export const CATEGORY_LABELS = Object.freeze({
  spam: 'Spam / Abuse',
  phishing: 'Betrug / Phishing',
  malware: 'Malware / Angriff',
  harassment: 'Belästigung',
  illegal_content: 'Illegale Inhalte',
  threat: 'Akute Bedrohung',
  other: 'Sonstiges'
});

export const SEVERITY_LABELS = Object.freeze({
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  critical: 'Kritisch'
});

export const RECOMMENDATION_LABELS = Object.freeze({
  warn: 'Warnen / freigeben',
  quarantine: 'Quarantäne',
  suspend: 'Sperren',
  timeout: 'Timeout',
  reject: 'Meldung ablehnen'
});

export const DISCLOSURE_ROLE_LABELS = Object.freeze({
  reporter: 'Melder',
  reported: 'Gemeldeter',
  owner: 'Eigener Nachweis',
  authority: 'Behörden-/Rechtsnachweis',
  other: 'Sonstiges'
});

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || UNAVAILABLE;
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || UNAVAILABLE;
}

export function severityLabel(severity) {
  return SEVERITY_LABELS[severity] || severity || UNAVAILABLE;
}

export function recommendationLabel(recommendation) {
  return RECOMMENDATION_LABELS[recommendation] || recommendation || UNAVAILABLE;
}

export function severityTone(severity) {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warn';
  if (severity === 'low') return 'info';
  return 'idle';
}

export function statusTone(status) {
  if (status === 'actioned' || status === 'quarantined') return 'danger';
  if (status === 'appealed') return 'warn';
  if (status === 'closed') return 'ok';
  if (status === 'reviewing' || status === 'triaged') return 'info';
  return 'idle';
}

export function formatDateTime(value) {
  if (!value) return UNAVAILABLE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? UNAVAILABLE : date.toLocaleString();
}
export function formatDate(value) {
  if (!value) return UNAVAILABLE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? UNAVAILABLE : date.toLocaleDateString();
}

export function formatCaseId(id) {
  const value = String(id || '');
  if (!value) return UNAVAILABLE;
  return value.length > 16 ? `${value.slice(0, 12)}…` : value;
}

export function parseJsonRecord(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  return safeJsonParse(value, fallback);
}

/** Returns null when a list is not available, so callers can show "unavailable". */
export function listCount(value) {
  return Array.isArray(value) ? value.length : null;
}


/**
 * Like parseJsonRecord but reports whether the stored snapshot payload was
 * actually unreadable, so the UI can distinguish "empty" from "corrupt".
 */
export function parseJsonRecordDetailed(value) {
  if (!value) return { value: null, invalid: false };
  if (typeof value === 'object') return { value, invalid: false };
  if (typeof value !== 'string') return { value: null, invalid: true };
  const parsed = safeJsonParse(value, null);
  const invalid = parsed === null || typeof parsed !== 'object' || Array.isArray(parsed);
  return { value: parsed, invalid };
}
