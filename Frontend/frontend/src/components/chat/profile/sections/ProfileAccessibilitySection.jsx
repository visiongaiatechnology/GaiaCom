import React from 'react';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';
import ToggleRow from '../ui/ToggleRow';

export default function ProfileAccessibilitySection({
  accessibilityPrefs,
  updateAccessibilityPreference
}) {
  return (
    <ProfileSection
      eyebrow="Kommunikation"
      title="Barrierefreiheit"
      description="Diese Optionen gelten lokal für GaiaCom auf diesem Gerät. Sie verändern weder dein Profil noch Nachrichten oder Schlüsselmaterial."
    >
      <div className="vgt-profile-stack">
        <ProfileField
          id="vgt-accessibility-font-scale"
          label="Textgröße"
          hint="Passt die gesamte Oberflächentypografie dieses Geräts an."
        >
          <select
            className="input-field"
            value={accessibilityPrefs.fontScale}
            onChange={event => updateAccessibilityPreference({ fontScale: event.target.value })}
          >
            <option value="90">Kompakt</option>
            <option value="100">Standard</option>
            <option value="112">Groß</option>
            <option value="125">Sehr groß</option>
          </select>
        </ProfileField>

        <ToggleRow
          id="vgt-accessibility-contrast"
          label="Hoher Kontrast"
          description="Erhöht Kontraste zwischen Text, Steuerflächen und Hintergründen."
          checked={accessibilityPrefs.highContrast}
          onChange={event => updateAccessibilityPreference({ highContrast: event.target.checked })}
        />

        <ToggleRow
          id="vgt-accessibility-reduce-motion"
          label="Bewegungen reduzieren"
          description="Deaktiviert dekorative Animationen und verkürzt Übergänge."
          checked={accessibilityPrefs.reduceMotion}
          onChange={event => updateAccessibilityPreference({ reduceMotion: event.target.checked })}
        />
      </div>
    </ProfileSection>
  );
}
