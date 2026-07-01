// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
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
  onRegisterIdentity,
  onFinish
}) {
  const { t } = useTranslation();

  const [checkedItems, setCheckedItems] = React.useState({
    terms_read: false,
    is_beta: false,
    no_uptime_guarantee: false,
    smtp_security_scope: false,
    credentials_responsibility: false,
    no_illegal_purposes: false
  });

  const allChecked = Object.values(checkedItems).every(v => v === true);

  return (
    <div className="wizard-overlay">
      <div className="wizard-card glass-panel">
        <LogoMark compact />
        <div className="wizard-steps">
          <div className={`wizard-step ${wizardStep === 1 ? 'active' : ''}`}>{t('wizard_step_terms') || 'Nutzungsbedingungen'}</div>
          <div className={`wizard-step ${wizardStep === 2 ? 'active' : ''}`}>{t('wizard_step1') || 'Wiederherstellung'}</div>
          <div className={`wizard-step ${wizardStep === 3 ? 'active' : ''}`}>{t('wizard_step2') || 'Profil'}</div>
          <div className={`wizard-step ${wizardStep === 4 ? 'active' : ''}`}>{t('onboarding_step_security') || 'Schutz'}</div>
          <div className={`wizard-step ${wizardStep === 5 ? 'active' : ''}`}>{t('onboarding_step_launch') || 'Start'}</div>
        </div>

        {wizardStep === 1 ? (
          <div>
            <div className="wizard-title" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
              {t('wizard_terms_title') || 'Nutzungsbedingungen und Beta-Testvereinbarung für GaiaCom (Beta-Phase)'}
            </div>
            
            <div className="terms-scrollbox gaia-scrollbar" style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              padding: '14px',
              background: 'rgba(4, 10, 18, 0.45)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              lineHeight: '1.45',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              whiteSpace: 'pre-wrap',
              textAlign: 'left'
            }}>
              {t('wizard_terms_text')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', textAlign: 'left' }}>
              {Object.keys(checkedItems).map(key => {
                let label = '';
                if (key === 'terms_read') label = t('wizard_check_terms_read') || 'Ich habe die Beta-Nutzungsbedingungen gelesen.';
                else if (key === 'is_beta') label = t('wizard_check_is_beta') || 'Ich verstehe, dass GaiaCom Beta-Software ist.';
                else if (key === 'no_uptime_guarantee') label = t('wizard_check_no_uptime') || 'Ich verstehe, dass keine Verfügbarkeitsgarantie besteht.';
                else if (key === 'smtp_security_scope') label = t('wizard_check_smtp_security') || 'Ich verstehe, dass SMTP-Nachrichten nicht den vollen GaiaCom-Sicherheitsumfang bieten.';
                else if (key === 'credentials_responsibility') label = t('wizard_check_credentials') || 'Ich bin für die sichere Aufbewahrung meiner Zugangsdaten selbst verantwortlich.';
                else if (key === 'no_illegal_purposes') label = t('wizard_check_no_illegal') || 'Ich werde GaiaCom nicht für rechtswidrige Zwecke verwenden.';
                
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={checkedItems[key]}
                      style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--accent-cyan)' }}
                      onChange={e => setCheckedItems(prev => ({ ...prev, [key]: e.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>

            <button className="btn-primary" disabled={!allChecked} onClick={() => onStepChange(2)}>
              {t('wizard_next') || 'Weiter'}
            </button>
          </div>
        ) : wizardStep === 2 ? (
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
            <div className="button-row" style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => onStepChange(1)}>{t('wizard_back') || 'Zurück'}</button>
              <button className="btn-primary" disabled={!copiedMnemonic} onClick={() => onStepChange(3)}>
                {t('wizard_next') || 'Weiter'}
              </button>
            </div>
          </div>
        ) : wizardStep === 3 ? (
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
              <label>{t('wizard_server_domain') || 'Server Node Domain'}</label>
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
              <button className="btn-secondary" onClick={() => onStepChange(2)}>{t('wizard_back')}</button>
              <button className="btn-primary" onClick={onRegisterIdentity}>{t('wizard_finish')}</button>
            </div>
          </div>
        ) : wizardStep === 4 ? (
          <div>
            <div className="wizard-title">{t('onboarding_security_title') || 'Was GaiaCom gerade fuer dich schuetzt.'}</div>
            <p className="wizard-description">
              {t('onboarding_security_desc') || 'GaiaCom trennt Identitaet, Schluessel, Nachrichten und Netzwerkstatus. Das Setup ist jetzt vollstaendig in einem Assistenten.'}
            </p>
            <div className="wizard-onboarding-grid">
              <article>
                <strong>{t('onboarding_sec_identity_title') || 'Identitaet'}</strong>
                <span>{t('onboarding_sec_identity_desc') || 'Deine Gaia-ID ist dein Netzwerkanker. Kontakte koennen Schluesselwechsel erkennen.'}</span>
              </article>
              <article>
                <strong>{t('onboarding_sec_messages_title') || 'Nachrichten'}</strong>
                <span>{t('onboarding_sec_messages_desc') || 'Inhalte werden lokal entschluesselt. Bearbeitete Nachrichten bekommen neue Signaturen.'}</span>
              </article>
              <article>
                <strong>{t('onboarding_sec_network_title') || 'Netzwerk'}</strong>
                <span>{t('onboarding_sec_network_desc') || 'Security Center und Abuse Center machen Risiken sichtbar, ohne globale Hintertuer.'}</span>
              </article>
              <article>
                <strong>{t('onboarding_sec_transparency_title') || 'Transparenz'}</strong>
                <span>{t('onboarding_sec_transparency_desc') || 'Sicherheitsrelevante Ereignisse bleiben nachvollziehbar.'}</span>
              </article>
            </div>
            <div className="button-row">
              <button className="btn-secondary" onClick={() => onStepChange(3)}>{t('wizard_back') || 'Zurueck'}</button>
              <button className="btn-primary" onClick={() => onStepChange(5)}>{t('onboarding_continue') || 'Weiter'}</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="wizard-title">{t('onboarding_launch_title') || 'Bereit. Was willst du zuerst tun?'}</div>
            <p className="wizard-description">
              {t('onboarding_launch_desc') || 'Deine Adresse ist angelegt. Du kannst jetzt in GaiaCom starten und spaeter jederzeit Profil, Passport und Security Center erweitern.'}
            </p>
            <div className="wizard-launch-grid">
              <div><strong>{t('onboarding_inbox_title') || 'Posteingang'}</strong><span>{t('onboarding_inbox_desc') || 'Mails lesen und erste Nachricht verfassen.'}</span></div>
              <div><strong>{t('onboarding_contacts_title') || 'Kontakte'}</strong><span>{t('onboarding_contacts_desc') || 'Ersten Kontakt pruefen oder Chat starten.'}</span></div>
              <div><strong>{t('onboarding_channels_title') || 'Channels'}</strong><span>{t('onboarding_channels_desc') || 'Oeffentliche Frequenzen entdecken.'}</span></div>
              <div><strong>{t('onboarding_security_title_card') || 'Security Center'}</strong><span>{t('onboarding_security_desc_card') || 'GaiaShield Status ansehen.'}</span></div>
            </div>
            <div className="button-row">
              <button className="btn-secondary" onClick={() => onStepChange(4)}>{t('wizard_back') || 'Zurueck'}</button>
              <button className="btn-primary" onClick={onFinish}>{t('onboarding_complete_setup') || 'Setup abschliessen'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
