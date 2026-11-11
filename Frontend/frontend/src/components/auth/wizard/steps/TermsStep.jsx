import React from 'react';
import Icon from '../../../ui/Icon';

const CHECK_LABEL_KEYS = {
  terms_read: ['wizard_check_terms_read', 'Ich habe die Beta-Nutzungsbedingungen gelesen.'],
  is_beta: ['wizard_check_is_beta', 'Ich verstehe, dass GaiaCom Beta-Software ist.'],
  no_uptime_guarantee: ['wizard_check_no_uptime', 'Ich verstehe, dass keine Verfügbarkeitsgarantie besteht.'],
  smtp_security_scope: ['wizard_check_smtp_security', 'Ich verstehe, dass SMTP-Nachrichten nicht den vollen GaiaCom-Sicherheitsumfang bieten.'],
  credentials_responsibility: ['wizard_check_credentials', 'Ich bin für die sichere Aufbewahrung meiner Zugangsdaten selbst verantwortlich.'],
  no_illegal_purposes: ['wizard_check_no_illegal', 'Ich werde GaiaCom nicht für rechtswidrige Zwecke verwenden.']
};

/**
 * Setup wizard step 1 — beta terms and mandatory consent.
 *
 * Security-relevant: `onNext` stays disabled until every consent checkbox is
 * checked. The state and `allChecked` computation remain owned by SetupWizard.
 */
export default function TermsStep({ t, checkedItems, setCheckedItems, allChecked, onNext }) {
  return (
    <section className="vgt-wizard__step" aria-labelledby="vgt-wizard-terms-title">
      <h2 className="vgt-h3" id="vgt-wizard-terms-title">
        {t('wizard_terms_title') || 'Nutzungsbedingungen und Beta-Testvereinbarung'}
      </h2>
      <p className="vgt-body vgt-body--sm">
        Lies die Vereinbarung und bestätige jeden Punkt. Ohne alle Bestätigungen kann die
        Einrichtung nicht fortgesetzt werden.
      </p>

      <div className="vgt-wizard__terms gaia-scrollbar" tabIndex={0} role="region" aria-label="Nutzungsbedingungen">
        {t('wizard_terms_text')}
      </div>

      <ul className="vgt-wizard__checks">
        {Object.keys(checkedItems).map(key => {
          const [labelKey, fallback] = CHECK_LABEL_KEYS[key] || [key, key];
          return (
            <li key={key}>
              <label className="vgt-consent">
                <input
                  type="checkbox"
                  checked={checkedItems[key]}
                  onChange={event => setCheckedItems(previous => ({ ...previous, [key]: event.target.checked }))}
                />
                <span>{t(labelKey) || fallback}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="vgt-wizard__actions">
        <button type="button" className="btn-primary" disabled={!allChecked} onClick={onNext}>
          <Icon name="arrowRight" size={16} />
          {t('wizard_next') || 'Weiter'}
        </button>
      </div>
    </section>
  );
}
