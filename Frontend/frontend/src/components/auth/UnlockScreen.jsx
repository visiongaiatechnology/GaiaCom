import React from 'react';
import LogoMark from '../layout/LogoMark';
import Icon from '../ui/Icon';
import { useTranslation } from '../../utils/i18n';

/**
 * VGT GLASS 2100 — local key vault unlock surface.
 *
 * Presentation only. The unlock contract from App.jsx is unchanged:
 *   onSubmit(event, 'password' | 'pin') for the form,
 *   onSubmit(null, 'webauthn') for the device-key button,
 *   onPasswordChange('') when the unlock mode changes,
 *   onLogout for the escape hatch.
 */
export default function UnlockScreen({
  unlockPassword,
  unlockError,
  pinEnabled,
  webAuthnEnabled,
  onPasswordChange,
  onSubmit,
  onLogout
}) {
  const { t } = useTranslation();
  const [unlockMode, setUnlockMode] = React.useState('password');
  const [revealPassword, setRevealPassword] = React.useState(false);

  const handleModeChange = nextMode => {
    setUnlockMode(nextMode);
    setRevealPassword(false);
    onPasswordChange('');
  };

  const isPinMode = unlockMode === 'pin';
  const statusTone = unlockError ? 'danger' : unlockPassword ? 'info' : 'idle';
  const statusIcon = unlockError ? 'alertTriangle' : unlockPassword ? 'unlock' : 'lock';
  const statusText = unlockError
    ? (t('unlock_state_error') || 'Entsperrung fehlgeschlagen. Prüfe dein Passwort und versuche es erneut.')
    : unlockPassword
      ? (t('unlock_state_ready') || 'Bereit zum Entsperren. Mit Enter bestätigen.')
      : (t('unlock_state_locked') || 'Tresor gesperrt. Private Schlüssel sind nicht geladen.');

  return (
    <div className="vgt-lockpage">
      <section className="vgt-lockpage__story" aria-labelledby="vgt-unlock-title">
        <LogoMark size={36} />
        <p className="vgt-eyebrow">{t('local_key_vault') || 'Lokaler Schlüssel-Tresor'}</p>
        <h1 className="vgt-h1" id="vgt-unlock-title">{t('unlock_title') || 'Identität entsperren'}</h1>
        <p className="vgt-body">{t('unlock_desc')}</p>

        <dl className="vgt-lockpage__facts">
          <div>
            <dt><Icon name="shieldCheck" size={16} />E2EE</dt>
            <dd>{t('ui_unlock_e2ee') || 'Nachrichten sind Ende-zu-Ende zwischen Geräten verschlüsselt.'}</dd>
          </div>
          <div>
            <dt><Icon name="key" size={16} />{t('local_keys_label') || 'Lokale Schlüssel'}</dt>
            <dd>{t('ui_unlock_local_keys') || 'Private Schlüssel liegen verschlüsselt auf diesem Gerät.'}</dd>
          </div>
          <div>
            <dt><Icon name="lock" size={16} />{t('session_lock') || 'Sitzungssperre'}</dt>
            <dd>{t('ui_unlock_session_lock') || 'Sperrt den Tresor automatisch nach Inaktivität.'}</dd>
          </div>
        </dl>
      </section>

      <section className={`vgt-glass vgt-lockcard${unlockError ? ' is-error' : ''}`}>
        <header className="vgt-lockcard__head">
          <LogoMark compact size={26} />
          <p className="vgt-caption">{t('ui_unlock_boundaries') || 'Serverkonto und lokaler Schlüsseltresor sind getrennte Grenzen.'}</p>
        </header>

        <div className="vgt-lockcard__status" role="status" aria-live="polite">
          <Icon name={statusIcon} size={16} />
          <span className={`vgt-lockcard__status-text vgt-lockcard__status-text--${statusTone}`}>{statusText}</span>
        </div>

        {pinEnabled ? (
          <div className="vgt-lockcard__modes" role="group" aria-label="Entsperrmethode">
            <button
              type="button"
              className={`vgt-lockcard__mode${!isPinMode ? ' is-active' : ''}`}
              aria-pressed={!isPinMode}
              onClick={() => handleModeChange('password')}
            >
              <Icon name="key" size={15} />
              Passwort
            </button>
            <button
              type="button"
              className={`vgt-lockcard__mode${isPinMode ? ' is-active' : ''}`}
              aria-pressed={isPinMode}
              onClick={() => handleModeChange('pin')}
            >
              <Icon name="fingerprint" size={15} />
              Geräte-Code
            </button>
          </div>
        ) : null}

        {webAuthnEnabled ? (
          <button
            type="button"
            className="btn-secondary vgt-lockcard__webauthn"
            onClick={() => onSubmit(null, 'webauthn')}
          >
            <Icon name="fingerprint" size={16} />
            Geräte-Schlüssel verwenden
          </button>
        ) : null}

        <form className="vgt-lockcard__form" onSubmit={event => onSubmit(event, isPinMode ? 'pin' : 'password')}>
          <input type="text" name="username" autoComplete="username" className="vgt-sr-only" readOnly tabIndex={-1} />

          <div className="vgt-lockfield">
            <label className="input-label" htmlFor="vgt-unlock-secret">
              {isPinMode ? 'Geräte-Code oder alte PIN' : (t('auth_password') || 'Passwort')}
            </label>
            <div className="vgt-lockfield__control">
              <input
                id="vgt-unlock-secret"
                type={revealPassword && !isPinMode ? 'text' : 'password'}
                className="input-field vgt-lockfield__input"
                placeholder={isPinMode ? 'Lokalen Geräte-Code eingeben' : (t('auth_password_placeholder') || 'Passwort eingeben')}
                value={unlockPassword}
                onChange={event => onPasswordChange(event.target.value)}
                autoComplete={isPinMode ? 'one-time-code' : 'current-password'}
                aria-invalid={unlockError ? 'true' : undefined}
                aria-describedby={unlockError ? 'vgt-unlock-error' : undefined}
                autoFocus
                required
              />
              {!isPinMode ? (
                <button
                  type="button"
                  className="btn-icon vgt-lockfield__toggle"
                  onClick={() => setRevealPassword(value => !value)}
                  aria-label={revealPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  aria-pressed={revealPassword}
                >
                  <Icon name={revealPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              ) : null}
            </div>
          </div>

          {unlockError ? <p className="field-error" id="vgt-unlock-error" role="alert">{unlockError}</p> : null}

          <button type="submit" className="btn-primary vgt-lockcard__submit">
            <Icon name="unlock" size={16} />
            {t('unlock_btn') || 'Tresor öffnen'}
          </button>
        </form>

        <button type="button" className="btn-ghost vgt-lockcard__logout" onClick={onLogout}>
          <Icon name="logout" size={16} />
          {t('unlock_logout') || 'Abmelden und Tresor schließen'}
        </button>
      </section>
    </div>
  );
}
