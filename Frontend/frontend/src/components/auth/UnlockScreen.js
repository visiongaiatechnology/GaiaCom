import React from 'react';
import LogoMark from '../layout/LogoMark';
import { useTranslation } from '../../utils/i18n';

export default function UnlockScreen({
  unlockPassword,
  unlockError,
  onPasswordChange,
  onSubmit,
  onLogout
}) {
  const { t } = useTranslation();

  return (
    <div className="auth-wrapper unlock-wrapper">
      <section className="unlock-story-panel">
        <LogoMark />
        <div className="auth-kicker">Local Key Vault</div>
        <h1>{t('unlock_title')}</h1>
        <p>{t('unlock_desc')}</p>
        <div className="unlock-status-grid">
          <span>E2EE</span>
          <span>Local Keys</span>
          <span>Session Lock</span>
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
        <p className="auth-copy unlock-copy">{t('unlock_desc')}</p>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{ display: 'none' }}
            readOnly
          />
          <div className="form-group">
            <label>{t('auth_password')}</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••••••"
              value={unlockPassword}
              onChange={event => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>
          {unlockError && <p className="form-error">{unlockError}</p>}
          <button type="submit" className="btn-primary">{t('unlock_btn')}</button>
        </form>
        <button type="button" className="btn-secondary" onClick={onLogout}>
          {t('unlock_logout')}
        </button>
      </section>
    </div>
  );
}
