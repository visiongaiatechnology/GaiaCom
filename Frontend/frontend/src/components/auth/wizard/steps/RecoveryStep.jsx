import React from 'react';
import Icon from '../../../ui/Icon';

/**
 * Setup wizard step 2 — recovery seed.
 *
 * Security-critical: `onNext` stays disabled until the user confirms that the
 * seed was stored. The mnemonic itself is only displayed, never re-generated,
 * copied or persisted here.
 */
export default function RecoveryStep({
  t,
  mnemonic,
  copiedMnemonic,
  onCopiedMnemonicChange,
  onBack,
  onNext
}) {
  return (
    <section className="vgt-wizard__step" aria-labelledby="vgt-wizard-recovery-title">
      <h2 className="vgt-h3" id="vgt-wizard-recovery-title">
        {t('wizard_title1') || 'Wiederherstellungs-Schlüssel sichern'}
      </h2>
      <p className="vgt-body vgt-body--sm">{t('wizard_desc1')}</p>

      <div className="vgt-wizard__mnemonic" role="group" aria-label="Wiederherstellungs-Seed">
        {mnemonic}
      </div>

      <label className="vgt-consent">
        <input
          type="checkbox"
          checked={copiedMnemonic}
          onChange={event => onCopiedMnemonicChange(event.target.checked)}
        />
        <span>{t('wizard_check1') || 'Ich habe meinen Seed sicher gespeichert.'}</span>
      </label>

      <div className="vgt-wizard__actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          <Icon name="arrowLeft" size={16} />
          {t('wizard_back') || 'Zurück'}
        </button>
        <button type="button" className="btn-primary" disabled={!copiedMnemonic} onClick={onNext}>
          <Icon name="arrowRight" size={16} />
          {t('wizard_next') || 'Weiter'}
        </button>
      </div>
    </section>
  );
}
