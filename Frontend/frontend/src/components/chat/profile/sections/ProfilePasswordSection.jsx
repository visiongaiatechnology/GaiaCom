import React from 'react';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';

export default function ProfilePasswordSection({
  currentPasswordInput,
  setCurrentPasswordInput,
  newPasswordInput,
  setNewPasswordInput,
  confirmPasswordInput,
  setConfirmPasswordInput,
  passwordChangeError,
  handleChangePassword,
  t
}) {
  const mismatch = Boolean(
    confirmPasswordInput && newPasswordInput && confirmPasswordInput !== newPasswordInput
  );

  return (
    <ProfileSection
      eyebrow="Zugang"
      title={t('change_password_title') || 'Passwort ändern'}
      description={
        t('change_password_desc') ||
        'Ändert dein serverseitiges Login-Passwort. Deine lokale Recovery Phrase bleibt separat durch dein Vault-/Unlock-Passwort geschützt.'
      }
    >
      <form className="vgt-profile-form vgt-profile-form--narrow" onSubmit={handleChangePassword}>
        <ProfileField id="vgt-current-password" label={t('current_password') || 'Aktuelles Passwort'}>
          <input
            type="password"
            className="input-field"
            value={currentPasswordInput}
            onChange={e => setCurrentPasswordInput(e.target.value)}
            required
            autoComplete="current-password"
          />
        </ProfileField>

        <ProfileField
          id="vgt-new-password"
          label={t('new_password') || 'Neues Passwort'}
          hint="Serverseitiges Login-Passwort; es ersetzt nicht deine Recovery Phrase."
        >
          <input
            type="password"
            className="input-field"
            value={newPasswordInput}
            onChange={e => setNewPasswordInput(e.target.value)}
            required
            autoComplete="new-password"
          />
        </ProfileField>

        <ProfileField
          id="vgt-confirm-password"
          label={t('confirm_new_password') || 'Neues Passwort bestätigen'}
          error={mismatch ? 'Die Passwörter stimmen nicht überein.' : ''}
        >
          <input
            type="password"
            className="input-field"
            value={confirmPasswordInput}
            onChange={e => setConfirmPasswordInput(e.target.value)}
            required
            autoComplete="new-password"
          />
        </ProfileField>

        {passwordChangeError ? (
          <p className="field-error" role="alert">{passwordChangeError}</p>
        ) : null}

        <div className="vgt-profile-form__actions">
          <button type="submit" className="btn-primary">
            {t('update_password') || 'Passwort aktualisieren'}
          </button>
        </div>
      </form>
    </ProfileSection>
  );
}
