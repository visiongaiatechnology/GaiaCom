import { useEffect, useState } from 'react';
import { safeJsonParse } from '../../../../utils/safeJson';

/**
 * Local presentation and mailbox preferences for the identity pane.
 *
 * Extracted unchanged from the previous ProfilePane: accessibility preferences
 * are persisted per device under `gaiacom_accessibility_preferences`, the
 * mailbox editor is seeded from `mailSettings`, and filter rules are handed to
 * the parent `saveFilterRule` callback.
 */
export default function useProfilePreferences({ mailSettings, saveSettings, saveFilterRule }) {
  const [accessibilityPrefs, setAccessibilityPrefs] = useState(() => {
    const stored = safeJsonParse(localStorage.getItem('gaiacom_accessibility_preferences'), {});
    return {
      fontScale: ['90', '100', '112', '125'].includes(stored.fontScale) ? stored.fontScale : '100',
      highContrast: stored.highContrast === true,
      reduceMotion: stored.reduceMotion === true
    };
  });

  const [sigInput, setSigInput] = useState('');
  const [localeInput, setLocaleInput] = useState('de');
  const [keyboardModeInput, setKeyboardModeInput] = useState('default');

  const [filterSender, setFilterSender] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterAction, setFilterAction] = useState('important');
  const [filterLabelVal, setFilterLabelVal] = useState('');

  useEffect(() => {
    if (mailSettings) {
      setSigInput(mailSettings.signature || '');
      setLocaleInput(mailSettings.locale || 'de');
      setKeyboardModeInput(mailSettings.keyboardMode || 'default');
    }
  }, [mailSettings]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${accessibilityPrefs.fontScale}%`;
    document.body.classList.toggle('high-contrast', accessibilityPrefs.highContrast);
    document.body.classList.toggle('reduce-motion', accessibilityPrefs.reduceMotion);
    try {
      localStorage.setItem('gaiacom_accessibility_preferences', JSON.stringify(accessibilityPrefs));
    } catch (_) {}
  }, [accessibilityPrefs]);

  const updateAccessibilityPreference = patch => {
    setAccessibilityPrefs(current => ({ ...current, ...patch }));
  };

  const handleSaveMailboxSettings = async e => {
    e.preventDefault();
    if (!saveSettings) return;
    try {
      await saveSettings({
        ...mailSettings,
        signature: sigInput,
        locale: localeInput,
        keyboardMode: keyboardModeInput
      });
    } catch (_) {}
  };

  const handleAddFilter = async e => {
    e.preventDefault();
    if (!saveFilterRule) return;
    const rule = {
      triggerSender: filterSender.trim(),
      triggerSubject: filterSubject.trim(),
      action: filterAction,
      actionLabel: filterAction === 'label' ? filterLabelVal : ''
    };
    try {
      await saveFilterRule(rule);
      setFilterSender('');
      setFilterSubject('');
      setFilterAction('important');
      setFilterLabelVal('');
    } catch (_) {}
  };

  return {
    accessibilityPrefs,
    updateAccessibilityPreference,
    sigInput,
    setSigInput,
    localeInput,
    setLocaleInput,
    keyboardModeInput,
    setKeyboardModeInput,
    filterSender,
    setFilterSender,
    filterSubject,
    setFilterSubject,
    filterAction,
    setFilterAction,
    filterLabelVal,
    setFilterLabelVal,
    handleSaveMailboxSettings,
    handleAddFilter
  };
}
