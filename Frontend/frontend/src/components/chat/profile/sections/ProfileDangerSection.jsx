import React from 'react';
import Icon from '../../../ui/Icon';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';

export default function ProfileDangerSection({
  deletePassword,
  setDeletePassword,
  deleteConfirmation,
  setDeleteConfirmation,
  deleteError,
  deleteBusy,
  submitDeleteAccount,
  onNavigate,
  t
}) {
  const confirmationPending = deleteConfirmation !== 'DELETE';

  return (
    <ProfileSection
      eyebrow="Gefahrenzone"
      title={t('delete_account_title') || 'Account löschen'}
      description={
        t('delete_account_desc') ||
        'Dieser Vorgang vernichtet dein Konto, Identitäten, Gerätesitzungen, GaiaDrop-Daten, Upload-Metadaten und serverseitig zuordenbare Nachrichten unwiderruflich.'
      }
      tone="danger"
    >
      <div className="vgt-profile-stack">
        <aside className="vgt-notice vgt-notice--danger" aria-labelledby="vgt-danger-scope-title">
          <Icon name="alertOctagon" size={18} />
          <div>
            <h3 className="vgt-h4" id="vgt-danger-scope-title">Unwiderruflich</h3>
            <p className="vgt-body vgt-body--sm">
              Es gibt keine Wiederherstellung durch den Server. Sichere vorher — falls gewünscht — die
              Recovery-Datei unter „Schlüssel &amp; Seed“.
            </p>
            <button type="button" className="vgt-link" onClick={() => onNavigate('keys')}>
              Zur Recovery-Datei
            </button>
          </div>
        </aside>

        <form className="vgt-profile-form vgt-profile-form--narrow" onSubmit={submitDeleteAccount}>
          <ProfileField
            id="vgt-delete-password"
            label={t('current_password') || 'Aktuelles Passwort'}
            required
          >
            <input
              type="password"
              className="input-field"
              value={deletePassword}
              onChange={event => setDeletePassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </ProfileField>

          <ProfileField
            id="vgt-delete-confirmation"
            label={t('delete_account_confirm_label') || 'Zur Bestätigung DELETE eingeben'}
            hint="Großbuchstaben, exakt DELETE."
            required
            error={deleteConfirmation && confirmationPending ? 'Bestätigung nicht vollständig.' : ''}
          >
            <input
              type="text"
              className="input-field"
              value={deleteConfirmation}
              onChange={event => setDeleteConfirmation(event.target.value)}
              autoComplete="off"
              required
            />
          </ProfileField>

          {deleteError ? <p className="field-error" role="alert">{deleteError}</p> : null}

          <div className="vgt-profile-form__actions">
            <button type="submit" className="btn-danger" disabled={deleteBusy || confirmationPending}>
              <Icon name="trash" size={16} />
              {deleteBusy ? (t('loading') || 'Laden …') : (t('delete_account_button') || 'Account unwiderruflich löschen')}
            </button>
          </div>
        </form>

        <hr className="vgt-divider" />

        <div className="vgt-profile-record">
          <h3 className="vgt-h4">Schlüssel und Geräte</h3>
          <p className="vgt-caption">
            Geräteschlüssel lassen sich einzeln widerrufen, ohne das Konto zu löschen.
          </p>
          <div className="vgt-profile-form__actions">
            <button type="button" className="btn-secondary" onClick={() => onNavigate('devices')}>
              <Icon name="cpu" size={16} />
              Geräte und Schlüssel verwalten
            </button>
          </div>
        </div>
      </div>
    </ProfileSection>
  );
}
