import React from 'react';
import LogoMark from '../layout/LogoMark';
import VersionBadge from '../layout/VersionBadge';
import { languageOptions, useTranslation } from '../../utils/i18n';

export default function AuthScreen({
  isRegister,
  usernameInput,
  passwordInput,
  mnemonic,
  copiedMnemonic,
  authError,
  showRegSuccessPopup,
  derivedKeys,
  serverVersion,
  serverConsensus,
  dropTargetInput,
  dropSenderInput,
  dropMessageInput,
  dropStatus,
  dropError,
  onSubmit,
  onUsernameChange,
  onPasswordChange,
  onMnemonicChange,
  onDropTargetChange,
  onDropSenderChange,
  onDropMessageChange,
  onSubmitGaiaDrop,
  onGenerateMnemonic,
  onCopyMnemonic,
  onToggleMode,
  onCloseSuccess,
}) {
  const { language, changeLanguage, t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState('auth'); // 'auth' or 'drop'

  return (
    <div className={`auth-wrapper auth-product-shell auth-lang-${language}`}>
      <div className="auth-lang-container">
        <div className="language-selector-row">
          <select
            className="language-dropdown"
            value={language}
            onChange={event => changeLanguage(event.target.value)}
            aria-label="Language"
          >
            {languageOptions.map(option => (
              <option key={option.code} value={option.code}>
                {option.flag} {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="auth-story-panel">
        <div className="auth-brand-row">
          <LogoMark />
          <VersionBadge version={serverVersion} consensus={serverConsensus} />
        </div>
        <div className="auth-kicker">{t('auth_kicker')}</div>
        <h1>{t('auth_headline')}</h1>
        <p>{t('auth_subline')}</p>
        <div className="auth-beta-notice">{t('auth_beta_notice')}</div>
        <div className="auth-value-strip">
          <span>{t('auth_value_mail')}</span>
          <span>{t('auth_value_chat')}</span>
          <span>{t('auth_value_rooms')}</span>
          <span>{t('auth_value_drop')}</span>
        </div>
        <div className="auth-proof-grid">
          <div><strong>E2EE</strong><span>{t('auth_proof_e2ee_desc')}</span></div>
          <div><strong>GaiaProof</strong><span>{t('auth_proof_gaiaproof_desc')}</span></div>
          <div><strong>GaiaDrop</strong><span>{t('auth_proof_gaiadrop_desc')}</span></div>
          <div><strong>GaiaVault</strong><span>{t('auth_proof_gaiavault_desc')}</span></div>
        </div>
        <div className="auth-usecase-panel">
          <strong>{t('auth_usecase_title')}</strong>
          <span>{t('auth_usecase_text')}</span>
        </div>
        <div className="powered-by">Powered by VisionGaiaTechnology</div>
      </section>

      <section className="auth-card glass-panel">
        <div className="auth-header">
          <LogoMark compact />
          <p>{t('auth_secure_mail')}</p>
        </div>

        <div className="auth-card-status" aria-label="Security stack">
          <span>E2EE</span>
          <span>ML-KEM</span>
          <span>LOCAL KEYS</span>
        </div>

        <div className="auth-tabs">
          <button 
            type="button" 
            className={`auth-tab-btn ${activeTab === 'auth' ? 'active' : ''}`}
            onClick={() => setActiveTab('auth')}
          >
            {t('auth_tab_login')}
          </button>
          <button 
            type="button" 
            className={`auth-tab-btn ${activeTab === 'drop' ? 'active' : ''}`}
            onClick={() => setActiveTab('drop')}
          >
            {t('auth_tab_drop')}
          </button>
        </div>

        {activeTab === 'auth' ? (
          <>
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label>{t('auth_username')}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('auth_username_placeholder')}
                  value={usernameInput}
                  onChange={event => onUsernameChange(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('auth_password')}</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder={t('auth_password_placeholder')}
                  value={passwordInput}
                  onChange={event => onPasswordChange(event.target.value)}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('auth_mnemonic')}</label>
                <textarea
                  className="input-field"
                  placeholder={t('auth_mnemonic_placeholder')}
                  value={mnemonic}
                  onChange={event => onMnemonicChange(event.target.value)}
                  autoComplete="off"
                  required
                />
                {isRegister && !mnemonic && (
                  <button type="button" className="btn-secondary compact-btn" onClick={onGenerateMnemonic}>
                    {t('auth_generate_seed')}
                  </button>
                )}
                {mnemonic && (
                  <div className="mnemonic-display">
                    {mnemonic}
                    <button type="button" className="btn-action" onClick={onCopyMnemonic}>
                      {copiedMnemonic ? t('auth_copied') : t('auth_copy_seed')}
                    </button>
                  </div>
                )}
              </div>

              {authError && <p className="form-error">{authError}</p>}

              <button type="submit" className="btn-primary">
                {isRegister ? t('auth_btn_register') : t('auth_btn_login')}
              </button>
            </form>

            <button type="button" className="btn-secondary" style={{ marginTop: '10px' }} onClick={onToggleMode}>
              {isRegister ? t('auth_toggle_login') : t('auth_toggle_register')}
            </button>
          </>
        ) : (
          <form onSubmit={onSubmitGaiaDrop} className="gaia-drop-public">
            <div className="profile-section-title">GaiaDrop</div>
            <p className="auth-copy">{t('public_drop_desc')}</p>
            <div className="form-group">
              <label>{t('public_drop_target')}</label>
              <input
                type="text"
                className="input-field"
                placeholder="name@gaiacom.de"
                value={dropTargetInput}
                onChange={event => onDropTargetChange(event.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="form-group">
              <label>{t('public_drop_sender')}</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('public_drop_sender_placeholder')}
                value={dropSenderInput}
                onChange={event => onDropSenderChange(event.target.value)}
                autoComplete="off"
                maxLength={80}
              />
            </div>
            <div className="form-group">
              <label>{t('public_drop_message')}</label>
              <textarea
                className="input-field"
                placeholder={t('public_drop_message_placeholder')}
                value={dropMessageInput}
                onChange={event => onDropMessageChange(event.target.value)}
                maxLength={5000}
                required
              />
            </div>
            {dropError && <p className="form-error">{dropError}</p>}
            {dropStatus && <p className="form-success">{dropStatus}</p>}
            <button type="submit" className="btn-secondary">
              {t('public_drop_send')}
            </button>
          </form>
        )}
      </section>

      {showRegSuccessPopup && (
        <div className="popup-overlay">
          <div className="popup-card glass-panel success-card">
            <div className="popup-title">{t('auth_success_title')}</div>
            <div className="popup-text">
              {t('auth_success_text')}
            </div>
            <div className="crypto-value">{derivedKeys?.sign.public}</div>
            <button className="btn-primary" onClick={onCloseSuccess}>{t('auth_success_btn')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
