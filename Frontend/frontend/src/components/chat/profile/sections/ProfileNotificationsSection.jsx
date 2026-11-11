import React from 'react';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';
import ToggleRow from '../ui/ToggleRow';

export default function ProfileNotificationsSection({
  notificationPreferences,
  setNotificationPreferences
}) {
  const prefs = notificationPreferences || {};
  const quietHours = prefs.quietHoursEnabled === true;

  return (
    <ProfileSection
      eyebrow="Kommunikation"
      title="Benachrichtigungen"
      description="Diese Einstellungen steuern GaiaCom-Benachrichtigungen für Chat und Mail auf diesem Gerät."
    >
      <div className="vgt-profile-stack">
        <ToggleRow
          id="vgt-notifications-enabled"
          label="Benachrichtigungen aktivieren"
          description="Neue Chat- und Mail-Eingänge außerhalb des aktiven Gesprächs anzeigen."
          checked={prefs.enabled !== false}
          onChange={event => setNotificationPreferences(current => ({ ...current, enabled: event.target.checked }))}
        />

        <ToggleRow
          id="vgt-notifications-preview"
          label="Inhaltsvorschau"
          description="Zeigt Textauszüge in System-Benachrichtigungen. Standardmäßig verborgen."
          checked={prefs.showPreview === true}
          onChange={event => setNotificationPreferences(current => ({ ...current, showPreview: event.target.checked }))}
        />

        <ToggleRow
          id="vgt-notifications-quiet-hours"
          label="Ruhezeiten"
          description="Unterdrückt Benachrichtigungen im gewählten Zeitfenster."
          checked={quietHours}
          onChange={event => setNotificationPreferences(current => ({ ...current, quietHoursEnabled: event.target.checked }))}
        />

        {quietHours ? (
          <div className="vgt-profile-form__row">
            <ProfileField id="vgt-notifications-quiet-start" label="Ruhezeit von">
              <input
                className="input-field"
                type="time"
                value={prefs.quietHoursStart || ''}
                onChange={event => setNotificationPreferences(current => ({ ...current, quietHoursStart: event.target.value }))}
              />
            </ProfileField>
            <ProfileField id="vgt-notifications-quiet-end" label="Ruhezeit bis">
              <input
                className="input-field"
                type="time"
                value={prefs.quietHoursEnd || ''}
                onChange={event => setNotificationPreferences(current => ({ ...current, quietHoursEnd: event.target.value }))}
              />
            </ProfileField>
          </div>
        ) : null}
      </div>
    </ProfileSection>
  );
}
