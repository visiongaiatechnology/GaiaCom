import React from 'react';
import Icon from '../../../ui/Icon';

const SECURITY_FACTS = [
  {
    icon: 'shieldCheck',
    titleKey: 'onboarding_sec_identity_title',
    titleFallback: 'Identität',
    textKey: 'onboarding_sec_identity_desc',
    textFallback: 'Deine Gaia-ID ist dein Netzwerkanker. Kontakte können Schlüsselwechsel erkennen.'
  },
  {
    icon: 'key',
    titleKey: 'onboarding_sec_messages_title',
    titleFallback: 'Nachrichten',
    textKey: 'onboarding_sec_messages_desc',
    textFallback: 'Inhalte werden lokal entschlüsselt. Bearbeitete Nachrichten bekommen neue Signaturen.'
  },
  {
    icon: 'globe',
    titleKey: 'onboarding_sec_network_title',
    titleFallback: 'Netzwerk',
    textKey: 'onboarding_sec_network_desc',
    textFallback: 'Security Center und Abuse Center machen Risiken sichtbar, ohne globale Hintertür.'
  },
  {
    icon: 'fileText',
    titleKey: 'onboarding_sec_transparency_title',
    titleFallback: 'Transparenz',
    textKey: 'onboarding_sec_transparency_desc',
    textFallback: 'Sicherheitsrelevante Ereignisse bleiben nachvollziehbar.'
  }
];

/**
 * Setup wizard step 4 — short, factual explanation of the trust model.
 * No marketing claims and no security status that is not derived from data.
 */
export default function SecurityStep({ t, onBack, onNext }) {
  return (
    <section className="vgt-wizard__step" aria-labelledby="vgt-wizard-security-title">
      <h2 className="vgt-h3" id="vgt-wizard-security-title">
        {t('onboarding_security_title') || 'Was GaiaCom für dich schützt'}
      </h2>
      <p className="vgt-body vgt-body--sm">{t('onboarding_security_desc')}</p>

      <dl className="vgt-wizard__facts">
        {SECURITY_FACTS.map(fact => (
          <div key={fact.titleKey}>
            <dt>
              <span className="vgt-wizard__fact-icon" aria-hidden="true"><Icon name={fact.icon} size={16} /></span>
              {t(fact.titleKey) || fact.titleFallback}
            </dt>
            <dd>{t(fact.textKey) || fact.textFallback}</dd>
          </div>
        ))}
      </dl>

      <div className="vgt-wizard__actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          <Icon name="arrowLeft" size={16} />
          {t('wizard_back') || 'Zurück'}
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          <Icon name="arrowRight" size={16} />
          {t('onboarding_continue') || 'Weiter'}
        </button>
      </div>
    </section>
  );
}
