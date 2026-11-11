import { useEffect, useRef, useState } from 'react';
import { safeStorageJson } from '../../utils/safeJson';
import { DEFAULT_NOTIFICATION_PREFERENCES, normalizeNotificationPreferences } from '../../utils/notificationPreferences';

/* App theme + notification-preference persistence (moved verbatim from App.jsx). */
export default function useAppTheme() {
  // Theme Switching
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('gaia_theme') === 'light');
  const [notificationPreferences, setNotificationPreferences] = useState(() => normalizeNotificationPreferences(
    safeStorageJson(localStorage, 'gaiacom_notification_preferences', DEFAULT_NOTIFICATION_PREFERENCES)
  ));
  const notificationPreferencesHydratedForUserRef = useRef('');

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
      localStorage.setItem('gaia_theme', 'light');
    } else {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('gaia_theme', 'dark');
    }
    // C6 (CSS_ARCHITECTURE §6): browser chrome and native controls follow the
    // app theme instead of the static dark meta in index.html.
    document.documentElement.style.colorScheme = isLightMode ? 'light' : 'dark';
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isLightMode ? '#f2f5f4' : '#0a0e13');
    }
    const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (colorSchemeMeta) {
      colorSchemeMeta.setAttribute('content', isLightMode ? 'light' : 'dark');
    }
  }, [isLightMode]);

  useEffect(() => {
    try {
      localStorage.setItem('gaiacom_notification_preferences', JSON.stringify(notificationPreferences));
    } catch (_) {}
  }, [notificationPreferences]);

  return {
    isLightMode,
    setIsLightMode,
    notificationPreferences,
    setNotificationPreferences,
    notificationPreferencesHydratedForUserRef,
  };
}
