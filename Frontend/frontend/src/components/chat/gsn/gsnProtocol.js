/**
 * GSN protocol vocabularies.
 *
 * Reaction tokens are protocol constants, not decoration: the backend accepts
 * exactly this set (Backend/gsn/handler.go validates against these four values).
 * They are written as unicode escapes so no emoji glyph appears in source; the
 * rendered character is user content and maps 1:1 to the stored reaction key.
 *
 * Report categories/severities carry their locale key so the dialog can resolve
 * existing translations instead of hardcoded German labels.
 */
export const GSN_REACTION_TOKENS = [
  '\u{2764}\u{FE0F}',
  '\u{1F44D}',
  '\u{1F525}',
  '\u{1F440}'
];

export const GSN_REPORT_MAX_COMMENT = 8000;

export const GSN_REPORT_CATEGORIES = [
  { value: 'spam', key: 'gsn_report_spam', label: 'Spam / Werbung' },
  { value: 'harassment', key: 'gsn_report_harassment', label: 'Belästigung / Hassrede' },
  { value: 'phishing', key: 'gsn_report_phishing', label: 'Phishing / Identitätsdiebstahl' },
  { value: 'malware', key: 'gsn_report_malware', label: 'Malware / Schadcode' },
  { value: 'illegal_content', key: 'gsn_report_illegal', label: 'Illegale Inhalte' },
  { value: 'threat', key: 'gsn_report_threat', label: 'Konkrete Bedrohung' },
  { value: 'other', key: 'gsn_report_other', label: 'Sonstiger Missbrauch' }
];

export const GSN_REPORT_SEVERITIES = [
  { value: 'low', key: 'gsn_report_low', label: 'Niedrig' },
  { value: 'medium', key: 'gsn_report_medium', label: 'Mittel' },
  { value: 'high', key: 'gsn_report_high', label: 'Hoch' },
  { value: 'critical', key: 'gsn_report_critical', label: 'Kritisch' }
];

export function formatGsnTime(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale || []);
}
