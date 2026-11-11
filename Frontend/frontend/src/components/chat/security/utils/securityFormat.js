/**
 * Presentation helpers for the security surface.
 *
 * Every helper returns plain text derived from server data; nothing here
 * synthesises a score or a state that the API did not report. Labels resolve
 * through the i18n keys that already exist in all locales (de/en and the 16
 * other locale files); without a `t` function the canonical German fallback is
 * returned, so the helpers stay usable in non-React contexts.
 */
export const UNAVAILABLE = 'Nicht verfügbar';

const SEVERITY = Object.freeze({
  critical: { label: 'Kritisch', key: 'sc_opt_critical' },
  high: { label: 'Hoch', key: 'sc_opt_high' },
  medium: { label: 'Mittel', key: 'sc_opt_medium' },
  low: { label: 'Niedrig', key: 'sc_opt_low' },
  info: { label: 'Info', key: 'sc_opt_info' }
});

export const SEVERITY_LABELS = Object.freeze(Object.fromEntries(
  Object.entries(SEVERITY).map(([value, entry]) => [value, entry.label])
));

export const SEVERITY_KEYS = Object.freeze(Object.fromEntries(
  Object.entries(SEVERITY).map(([value, entry]) => [value, entry.key])
));

const CATEGORY = Object.freeze({
  failed_login: { label: 'Fehlgeschlagener Login', key: 'sc_opt_failed_login' },
  auth_attack: { label: 'Auth-Angriff', key: 'sc_opt_auth_attack' },
  rate_limit: { label: 'Rate Limit', key: 'sc_opt_rate_limit' },
  policy_violation: { label: 'Richtlinien-Hinweis', key: 'sc_opt_policy_violation' },
  message_replay: { label: 'Nachrichten-Replay', key: 'sc_opt_message_replay' }
});

export const CATEGORY_LABELS = Object.freeze(Object.fromEntries(
  Object.entries(CATEGORY).map(([value, entry]) => [value, entry.label])
));

export const CATEGORY_KEYS = Object.freeze(Object.fromEntries(
  Object.entries(CATEGORY).map(([value, entry]) => [value, entry.key])
));

export const STATUS_LABELS = Object.freeze({
  secured: 'Keine offenen Warnungen',
  warnings_active: 'Warnungen aktiv'
});

export const STATUS_KEYS = Object.freeze({
  secured: 'sc_status_secured',
  warnings_active: 'sc_status_warning'
});

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

function translate(t, key, fallback) {
  if (typeof t === 'function' && key) {
    const value = t(key);
    if (value) return value;
  }
  return fallback;
}

export function unavailable(t) {
  return translate(t, 'unavailable', UNAVAILABLE);
}

export function severityTone(severity) {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warn';
  if (severity === 'low') return 'info';
  return 'idle';
}

export function severityLabel(severity, t) {
  const fallback = SEVERITY_LABELS[severity] || severity || UNAVAILABLE;
  return translate(t, SEVERITY_KEYS[severity], fallback);
}

export function categoryLabel(category, t) {
  const fallback = CATEGORY_LABELS[category] || category || UNAVAILABLE;
  return translate(t, CATEGORY_KEYS[category], fallback);
}

export function statusLabel(status, t) {
  const fallback = STATUS_LABELS[status] || status || UNAVAILABLE;
  return translate(t, STATUS_KEYS[status], fallback);
}

export function formatDateTime(value, t) {
  if (!value) return unavailable(t);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? unavailable(t) : date.toLocaleString();
}

export function formatDate(value, t) {
  if (!value) return unavailable(t);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? unavailable(t) : date.toLocaleDateString();
}

export function formatTime(value, t) {
  if (!value) return unavailable(t);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? unavailable(t) : date.toLocaleTimeString();
}

/** The API reports `lastChecked` as a Unix epoch in seconds. */
export function formatEpochSeconds(value, t) {
  if (!value) return unavailable(t);
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? unavailable(t) : date.toLocaleString();
}

export function countBy(events, predicate) {
  if (!Array.isArray(events)) return null;
  return events.filter(predicate).length;
}

export function countCategory(events, category) {
  return countBy(events, event => event.category === category);
}
