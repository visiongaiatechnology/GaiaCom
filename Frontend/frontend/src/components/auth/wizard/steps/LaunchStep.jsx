import React from 'react';
import Icon from '../../../ui/Icon';

const LAUNCH_TARGETS = [
  {
    icon: 'inbox',
    titleKey: 'onboarding_inbox_title',
    titleFallback: 'Posteingang',
    textKey: 'onboarding_inbox_desc',
    textFallback: 'Mails lesen und erste Nachricht verfassen.'
  },
  {
    icon: 'chat',
    titleKey: 'onboarding_contacts_title',
    titleFallback: 'Kontakte',
    textKey: 'onboarding_contacts_desc',
    textFallback: 'Ersten Kontakt prüfen oder Chat starten.'
  },
  {
    icon: 'radio',
    titleKey: 'onboarding_channels_title',
    titleFallback: 'Channels',
    textKey: 'onboarding_channels_desc',
    textFallback: 'Öffentliche Frequenzen entdecken.'
  },
  {
    icon: 'shieldCheck',
    titleKey: 'onboarding_security_title_card',
    titleFallback: 'Security Center',
    textKey: 'onboarding_security_desc_card',
    textFallback: 'GaiaShield Status ansehen.'
  }
];

/**
 * Setup wizard step 5 — final summary of the available destinations.
 * Informational only; the actual destination routing happens after setup.
 */
export default function LaunchStep({ t, onBack, onFinish }) {
  return (
    <section className="vgt-wizard__step" aria-labelledby="vgt-wizard-launch-title">
      <h2 className="vgt-h3" id="vgt-wizard-launch-title">
        {t('onboarding_launch_title') || 'Bereit. Was willst du zuerst tun?'}
      </h2>
      <p className="vgt-body vgt-body--sm">{t('onboarding_launch_desc')}</p>

      <ul className="vgt-wizard__launch">
        {LAUNCH_TARGETS.map(target => (
          <li key={target.titleKey}>
            <span className="vgt-wizard__launch-icon" aria-hidden="true"><Icon name={target.icon} size={18} /></span>
            <span className="vgt-wizard__launch-copy">
              <strong>{t(target.titleKey) || target.titleFallback}</strong>
              <small>{t(target.textKey) || target.textFallback}</small>
            </span>
          </li>
        ))}
      </ul>

      <div className="vgt-wizard__actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          <Icon name="arrowLeft" size={16} />
          {t('wizard_back') || 'Zurück'}
        </button>
        <button type="button" className="btn-primary" onClick={onFinish}>
          <Icon name="check" size={16} />
          {t('onboarding_complete_setup') || 'Setup abschließen'}
        </button>
      </div>
    </section>
  );
}
