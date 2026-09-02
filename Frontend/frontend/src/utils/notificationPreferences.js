export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  enabled: true,
  showPreview: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
});

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeNotificationPreferences(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    enabled: input.enabled !== false,
    showPreview: input.showPreview === true,
    quietHoursEnabled: input.quietHoursEnabled === true,
    quietHoursStart: isValidTime(input.quietHoursStart) ? input.quietHoursStart : DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
    quietHoursEnd: isValidTime(input.quietHoursEnd) ? input.quietHoursEnd : DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd
  };
}

function minutesSinceMidnight(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function notificationsAllowed(preferences, date = new Date()) {
  const current = normalizeNotificationPreferences(preferences);
  if (!current.enabled || !current.quietHoursEnabled) return current.enabled;

  const now = (date.getHours() * 60) + date.getMinutes();
  const start = minutesSinceMidnight(current.quietHoursStart);
  const end = minutesSinceMidnight(current.quietHoursEnd);
  if (start === end) return false;
  return start < end ? !(now >= start && now < end) : !(now >= start || now < end);
}

export function notificationBody(preferences, preview, fallback) {
  return normalizeNotificationPreferences(preferences).showPreview ? preview : fallback;
}
