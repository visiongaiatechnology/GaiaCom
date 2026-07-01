// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import LogoMark from '../layout/LogoMark';
import { useTranslation } from '../../utils/i18n';

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

  const handleModeChange = nextMode => {
    setUnlockMode(nextMode);
    onPasswordChange('');
  };

  return (
    <div className={`auth-wrapper unlock-wrapper ${unlockError ? 'unlock-shake' : ''}`}>
      <section className="unlock-story-panel">
        <LogoMark />
        <div className="auth-kicker">{t('local_key_vault') || 'Local Key Vault'}</div>
        <h1>{t('unlock_title')}</h1>
        <p>{t('unlock_desc')}</p>
        <div className="unlock-status-grid">
          <span>E2EE</span>
          <span>{t('local_keys_label') || 'Local Keys'}</span>
          <span>{t('session_lock') || 'Session Lock'}</span>
        </div>
      </section>

      <section className="auth-card glass-panel unlock-card">
        <div className="unlock-orbit" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="auth-header unlock-header">
          <LogoMark compact />
          <p>{t('unlock_title')}</p>
        </div>

        <div className={`vault-status-indicator ${unlockError ? 'error' : 'secured'}`}>
          <span className="vault-status-dot" />
          <span className="vault-status-text">
            {unlockError
              ? (t('unlock_status_denied') || 'ACCESS DENIED / RETRY')
              : unlockPassword
                ? (t('unlock_status_decrypting') || 'DECRYPTING VAULT...')
                : (t('unlock_status_secured') || 'VAULT SECURED / LOCKED')}
          </span>
        </div>

        {pinEnabled && (
          <div className="vault-mode-selector">
            <button
              type="button"
              className={`btn-secondary compact-btn btn-mode-toggle ${unlockMode === 'password' ? 'active' : ''}`}
              onClick={() => handleModeChange('password')}
            >
              Passwort
            </button>
            <button
              type="button"
              className={`btn-secondary compact-btn btn-mode-toggle ${unlockMode === 'pin' ? 'active' : ''}`}
              onClick={() => handleModeChange('pin')}
            >
              Geraete-Code
            </button>
          </div>
        )}

        {webAuthnEnabled && (
          <button
            type="button"
            className="btn-secondary btn-vault-unlock"
            onClick={() => onSubmit(null, 'webauthn')}
          >
            Geraete-Schluessel verwenden
          </button>
        )}

        <form onSubmit={event => onSubmit(event, unlockMode === 'pin' ? 'pin' : 'password')}>
          <input
            type="text"
            name="username"
            autoComplete="username"
            className="sr-hidden-field"
            readOnly
          />

          <div className="form-group vault-input-group active">
            <label>{unlockMode === 'pin' ? 'Geraete-Code / alte PIN' : t('auth_password')}</label>
            <input
              type="password"
              className="input-field vault-password-input active"
              placeholder={unlockMode === 'pin' ? 'Lokalen Geraete-Code eingeben...' : (t('auth_password_placeholder') || 'Passwort eingeben...')}
              value={unlockPassword}
              onChange={event => onPasswordChange(event.target.value)}
              autoComplete={unlockMode === 'pin' ? 'one-time-code' : 'current-password'}
              autoFocus
              required
            />
          </div>

          {unlockError && <p className="form-error vault-error-message">{unlockError}</p>}

          <button type="submit" className="btn-primary btn-vault-unlock">
            Tresor oeffnen
          </button>
        </form>

        <button type="button" className="btn-secondary btn-vault-logout" onClick={onLogout}>
          {t('unlock_logout')}
        </button>
      </section>
    </div>
  );
}
