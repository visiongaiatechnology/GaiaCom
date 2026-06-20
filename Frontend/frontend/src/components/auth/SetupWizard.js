import React from 'react';
import LogoMark from '../layout/LogoMark';
import { useTranslation } from '../../utils/i18n';

export default function SetupWizard({
  wizardStep,
  mnemonic,
  copiedMnemonic,
  wizardGaiaUsername,
  wizardDomain,
  wizardCustomDomain,
  wizardFallbackNodes,
  wizardError,
  availableNodes,
  onCopiedMnemonicChange,
  onStepChange,
  onGaiaUsernameChange,
  onDomainChange,
  onCustomDomainChange,
  onFallbackNodesChange,
  onRegisterIdentity
}) {
  const { t } = useTranslation();

  return (
    <div className="wizard-overlay">
      <div className="wizard-card glass-panel">
        <LogoMark compact />
        <div className="wizard-steps">
          <div className={`wizard-step ${wizardStep === 1 ? 'active' : ''}`}>{t('wizard_step1')}</div>
          <div className={`wizard-step ${wizardStep === 2 ? 'active' : ''}`}>{t('wizard_step2')}</div>
        </div>

        {wizardStep === 1 ? (
          <div>
            <div className="wizard-title">{t('wizard_title1')}</div>
            <p className="wizard-description">
              {t('wizard_desc1')}
            </p>
            <div className="mnemonic-display">{mnemonic}</div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={copiedMnemonic}
                onChange={event => onCopiedMnemonicChange(event.target.checked)}
              />
              {t('wizard_check1')}
            </label>
            <button className="btn-primary" disabled={!copiedMnemonic} onClick={() => onStepChange(2)}>
              {t('wizard_next')}
            </button>
          </div>
        ) : (
          <div>
            <div className="wizard-title">{t('wizard_title2')}</div>
            <p className="wizard-description">
              {t('wizard_desc2')}
            </p>

            <div className="form-group">
              <label>{t('wizard_address')}</label>
              <input
                type="text"
                className="input-field"
                placeholder="alice"
                value={wizardGaiaUsername}
                onChange={event => onGaiaUsernameChange(event.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label>Server Node Domain</label>
              <select className="input-field" value={wizardDomain} onChange={event => onDomainChange(event.target.value)}>
                {availableNodes.map(node => (
                  <option key={node} value={node}>@{node}</option>
                ))}
                <option value="custom">{t('wizard_custom_domain')}</option>
              </select>
              {wizardDomain === 'custom' && (
                <input
                  type="text"
                  className="input-field"
                  placeholder="my-domain.com"
                  value={wizardCustomDomain}
                  onChange={event => onCustomDomainChange(event.target.value)}
                />
              )}
            </div>

            <div className="form-group">
              <label>{t('wizard_fallback')}</label>
              <input
                type="text"
                className="input-field"
                placeholder="backup.gaiacom.de"
                value={wizardFallbackNodes}
                onChange={event => onFallbackNodesChange(event.target.value)}
              />
            </div>

            {wizardError && <p className="form-error">{wizardError}</p>}

            <div className="button-row">
              <button className="btn-secondary" onClick={() => onStepChange(1)}>{t('wizard_back')}</button>
              <button className="btn-primary" onClick={onRegisterIdentity}>{t('wizard_finish')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
