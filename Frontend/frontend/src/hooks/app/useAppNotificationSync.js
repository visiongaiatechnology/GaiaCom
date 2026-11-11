import { useEffect } from 'react';
import * as api from '../../api';
import { normalizeNotificationPreferences } from '../../utils/notificationPreferences';

/* Server notification-preference hydration + persistence (moved verbatim, same effects/deps). */
export default function useAppNotificationSync({ theme, auth }) {
  const { user } = auth;
  const { notificationPreferences, setNotificationPreferences, notificationPreferencesHydratedForUserRef } = theme;

  useEffect(() => {
    let active = true;
    notificationPreferencesHydratedForUserRef.current = '';
    if (!user?.id) return undefined;

    api.getNotificationPreferences()
      .then(preferences => {
        if (active) setNotificationPreferences(normalizeNotificationPreferences(preferences));
      })
      .catch(() => {})
      .finally(() => {
        if (active) notificationPreferencesHydratedForUserRef.current = user.id;
      });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || notificationPreferencesHydratedForUserRef.current !== user.id) return;
    api.saveNotificationPreferences(notificationPreferences).catch(() => {});
  }, [notificationPreferences, user?.id]);
}
