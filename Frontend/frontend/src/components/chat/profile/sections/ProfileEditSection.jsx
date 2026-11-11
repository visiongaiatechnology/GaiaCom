import React, { useState } from 'react';
import Icon from '../../../ui/Icon';
import AvatarMark from '../ui/AvatarMark';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';

/**
 * Avatar presets are stored profile *data*, not UI icons: the persisted value
 * must stay identical so existing profiles keep rendering everywhere else in
 * the product. They are encoded as escapes here on purpose.
 */
const AVATAR_GLYPHS = [
  { value: '\u{1F916}', label: 'Roboter' },
  { value: '\u{1F47D}', label: 'Alien' },
  { value: '\u{1F680}', label: 'Rakete' },
  { value: '\u{1F6E1}\uFE0F', label: 'Schild' },
  { value: '\u{1F310}', label: 'Netzwerk' },
  { value: '\u{1F30C}', label: 'Galaxie' },
  { value: '\u{1F9EC}', label: 'DNA' },
  { value: '\u{1F4BB}', label: 'Terminal' },
  { value: '\u{1F9E0}', label: 'Denken' },
  { value: '\u26A1', label: 'Energie' },
  { value: '\u2728', label: 'Glanz' },
  { value: '\u{1F525}', label: 'Feuer' }
];

export default function ProfileEditSection({
  profileAvatar,
  setProfileAvatar,
  profileDisplayName,
  setProfileDisplayName,
  profileRealName,
  setProfileRealName,
  profileWebsite,
  setProfileWebsite,
  profileBio,
  setProfileBio,
  saveProfile,
  handleAvatarFileChange,
  t
}) {
  const displayNameMissing = !String(profileDisplayName || '').trim();
  const [nameTouched, setNameTouched] = useState(false);

  return (
    <ProfileSection
      eyebrow="Profil"
      title={t('edit_profile') || 'Profil bearbeiten'}
      description="Anzeigename, freiwillige Angaben und Avatar dieser Identität ändern."
    >
      <div className="vgt-profile-edit">
        <div className="vgt-profile-edit__preview">
          <AvatarMark avatar={profileAvatar} displayName={profileDisplayName} variant="profile" className="vgt-profile-edit__avatar" />
          <div>
            <strong>{profileDisplayName || (t('no_specification') || 'Kein Anzeigename')}</strong>
            <p className="vgt-caption">
              {profileBio || (t('biography') || 'Keine Biografie angegeben')}
            </p>
            {profileRealName ? (
              <p className="vgt-caption">Echter Name: {profileRealName}</p>
            ) : null}
            {profileWebsite ? (
              <p className="vgt-caption">Webseite: {profileWebsite}</p>
            ) : null}
          </div>
        </div>

        <form className="vgt-profile-form" onSubmit={saveProfile}>
          <ProfileField
            id="vgt-profile-display-name"
            label={t('display_name') || 'Anzeigename'}
            required
            error={nameTouched && displayNameMissing ? 'Anzeigename ist erforderlich.' : ''}
          >
            <input
              type="text"
              className="input-field"
              value={profileDisplayName}
              onChange={e => {
                setNameTouched(true);
                setProfileDisplayName(e.target.value);
              }}
              required
            />
          </ProfileField>

          <ProfileField
            id="vgt-profile-real-name"
            label="Echter Name (freiwillig)"
            hint="Wird nur gespeichert und angezeigt, wenn du ihn hier einträgst."
          >
            <input
              type="text"
              className="input-field"
              value={profileRealName}
              onChange={e => setProfileRealName(e.target.value)}
              placeholder="Nur sichtbar, wenn du ihn speicherst"
            />
          </ProfileField>

          <ProfileField
            id="vgt-profile-website"
            label="Webseite (freiwillig)"
            hint="Nur eine vollständige Adresse inklusive https:// wird gespeichert."
          >
            <input
              type="url"
              className="input-field"
              value={profileWebsite}
              onChange={e => setProfileWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </ProfileField>

          <ProfileField
            id="vgt-profile-bio"
            label={t('bio_status') || 'Biografie / Status'}
            hint="Kurztext für dein Profil und Nachrichtenliste."
          >
            <input
              type="text"
              className="input-field"
              value={profileBio}
              onChange={e => setProfileBio(e.target.value)}
            />
          </ProfileField>

          <fieldset className="vgt-avatar-field">
            <legend className="input-label">{t('choose_avatar') || 'Avatar wählen'}</legend>
            <div className="vgt-avatar-upload">
              <AvatarMark avatar={profileAvatar} displayName={profileDisplayName} variant="editor" />
              <label className="btn-secondary vgt-avatar-upload__btn">
                <Icon name="upload" size={16} />
                {t('upload_avatar_btn') || 'Bild hochladen (Sanitized)'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="vgt-sr-only"
                />
              </label>
            </div>
            <div className="vgt-avatar-grid" role="group" aria-label="Avatar-Vorschläge">
              {AVATAR_GLYPHS.map(item => {
                const selected = profileAvatar === item.value;
                return (
                  <button
                    type="button"
                    key={item.value}
                    className={`vgt-avatar-option ${selected ? 'is-active' : ''}`.trim()}
                    aria-pressed={selected}
                    aria-label={`Avatar ${item.label}`}
                    title={item.label}
                    onClick={() => setProfileAvatar(item.value)}
                  >
                    <span aria-hidden="true">{item.value}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="vgt-profile-form__actions">
            <button type="submit" className="btn-primary">
              {t('save_profile') || 'Profil speichern'}
            </button>
          </div>
        </form>
      </div>
    </ProfileSection>
  );
}
