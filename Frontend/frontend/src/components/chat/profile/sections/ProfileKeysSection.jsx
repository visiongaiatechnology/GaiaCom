import React from 'react';
import Icon from '../../../ui/Icon';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';

/**
 * Key material display. The values, their grouping and their raw form are
 * unchanged from the previous implementation: no masking, truncation or
 * reformatting is introduced here.
 */
export default function ProfileKeysSection({
  areKeysUnlocked,
  profilePasswordInput,
  setProfilePasswordInput,
  handleUnlockProfileKeys,
  profileUnlockError,
  derivedKeys,
  mnemonic,
  setAreKeysUnlocked,
  recoveryPassword,
  setRecoveryPassword,
  recoveryConfirmPassword,
  setRecoveryConfirmPassword,
  recoveryBusy,
  recoveryError,
  handleRecoveryExport,
  t
}) {
  return (
    <ProfileSection
      eyebrow="Sicherheit"
      title={t('kryptographische_schluessel') || 'Kryptographische Schlüssel'}
      description="Private Schlüssel und Recovery-Seed werden ausschließlich lokal im Browser angezeigt."
    >
      {!areKeysUnlocked ? (
        <div className="vgt-profile-form vgt-profile-form--narrow">
          <p className="vgt-body vgt-body--sm">
            {t('profile_unlock_desc') ||
              'Aus Sicherheitsgründen müssen Sie Ihr Passwort erneut eingeben, um Ihre privaten kryptographischen Schlüssel anzuzeigen.'}
          </p>
          <ProfileField
            id="vgt-key-unlock-password"
            label={t('vault_pwd_placeholder') || 'Passwort'}
            error={profileUnlockError || ''}
          >
            <input
              type="password"
              className="input-field"
              placeholder="Passwort eingeben …"
              value={profilePasswordInput}
              onChange={e => setProfilePasswordInput(e.target.value)}
              autoComplete="current-password"
            />
          </ProfileField>
          <div className="vgt-profile-form__actions">
            <button type="button" className="btn-primary" onClick={handleUnlockProfileKeys}>
              <Icon name="key" size={16} />
              {t('unlock_btn') || 'Freischalten'}
            </button>
          </div>
        </div>
      ) : (
        <div className="vgt-profile-stack">
          <aside className="vgt-notice vgt-notice--danger" aria-labelledby="vgt-key-warning-title">
            <Icon name="shieldAlert" size={18} />
            <div>
              <h3 className="vgt-h4" id="vgt-key-warning-title">Private Schlüssel sichtbar</h3>
              <p className="vgt-body vgt-body--sm">
                Diese Werte entsperren deine Identität und deine Nachrichten. Zeige sie nicht auf
                Bildschirmen, die andere sehen können, und gib sie niemals weiter. Die Ansicht wird
                beim Sperren sofort wieder ausgeblendet.
              </p>
            </div>
          </aside>

          <dl className="vgt-key-grid">
            <div className="vgt-key-card">
              <dt>Ed25519 Identität (Sign Public)</dt>
              <dd className="vgt-mono">{derivedKeys?.sign.public}</dd>
            </div>
            <div className="vgt-key-card">
              <dt>Ed25519 Identität (Sign Private)</dt>
              <dd className="vgt-mono">{derivedKeys?.sign.private}</dd>
            </div>
            <div className="vgt-key-card">
              <dt>X25519 Box (Public)</dt>
              <dd className="vgt-mono">{derivedKeys?.box.public}</dd>
            </div>
            <div className="vgt-key-card">
              <dt>X25519 Box (Private)</dt>
              <dd className="vgt-mono">{derivedKeys?.box.private}</dd>
            </div>
            <div className="vgt-key-card vgt-key-card--wide">
              <dt>ML-KEM-1024 Post-Quantum PKE (Public)</dt>
              <dd className="vgt-mono">{derivedKeys?.pke.public}</dd>
            </div>
            <div className="vgt-key-card vgt-key-card--wide">
              <dt>ML-KEM-1024 Post-Quantum PKE (Private/Secret)</dt>
              <dd className="vgt-mono vgt-key-card__scroll">{derivedKeys?.pke.private}</dd>
            </div>
            <div className="vgt-key-card vgt-key-card--wide">
              <dt>Mnemonic Recovery Seed Phrase (12 Wörter)</dt>
              <dd className="vgt-mono vgt-key-card__seed">{mnemonic}</dd>
            </div>
          </dl>

          <div className="vgt-profile-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setAreKeysUnlocked(false)}>
              <Icon name="lock" size={16} />
              {t('schluessel_entsperrt') || 'Schlüssel wieder sperren'}
            </button>
          </div>

          <hr className="vgt-divider" />

          <div className="vgt-profile-form vgt-profile-form--narrow">
            <h3 className="vgt-h4">Account-Recovery-Datei</h3>
            <p className="vgt-body vgt-body--sm">
              Exportiert deine GaiaCom-Identität, Mnemonic, Profil und lokale Metadaten in eine
              passwortgeschützte Datei. Das Recovery-Passwort wird nicht gespeichert.
            </p>
            <ProfileField id="vgt-recovery-password" label="Recovery-Passwort" hint="Mindestens 12 Zeichen." required>
              <input
                type="password"
                className="input-field"
                placeholder="Recovery-Passwort min. 12 Zeichen"
                value={recoveryPassword}
                onChange={event => setRecoveryPassword(event.target.value)}
                autoComplete="new-password"
              />
            </ProfileField>
            <ProfileField id="vgt-recovery-password-confirm" label="Recovery-Passwort wiederholen" required>
              <input
                type="password"
                className="input-field"
                placeholder="Recovery-Passwort wiederholen"
                value={recoveryConfirmPassword}
                onChange={event => setRecoveryConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </ProfileField>
            {recoveryError ? <p className="field-error" role="alert">{recoveryError}</p> : null}
            <div className="vgt-profile-form__actions">
              <button type="button" className="btn-primary" onClick={handleRecoveryExport} disabled={recoveryBusy}>
                <Icon name="download" size={16} />
                {recoveryBusy ? 'Recovery wird erstellt …' : 'Recovery-Datei herunterladen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileSection>
  );
}
