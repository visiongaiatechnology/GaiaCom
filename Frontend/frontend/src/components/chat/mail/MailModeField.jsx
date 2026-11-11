import React from 'react';
import Icon from '../../ui/Icon';

/**
 * Compact segmented mode selector for GaiaCOM vs SMTP transmission mode.
 * Styled matching the Astraea / GaiaCOM Mockup 3 specification.
 */
export default function MailModeField({ isSmtpMode, setIsSmtpMode, t }) {
  return (
    <div className="vgt-mail-mode-bar" role="group" aria-label={t('transmission_mode') || 'Übertragungsmodus'}>
      <span className="vgt-mail-mode-label">{t('transmission_mode') || 'Modus'}:</span>
      <div className="vgt-mail-mode-segmented">
        <button
          type="button"
          className={`vgt-mail-mode-btn ${!isSmtpMode ? 'is-active is-gaia' : ''}`}
          onClick={() => setIsSmtpMode(false)}
          title="Ende-zu-Ende über das GaiaCOM-Netz (ML-KEM + HQC)"
        >
          <Icon name="shieldCheck" size={14} />
          <span>GaiaCOM (E2EE)</span>
        </button>
        <button
          type="button"
          className={`vgt-mail-mode-btn ${isSmtpMode ? 'is-active is-smtp' : ''}`}
          onClick={() => setIsSmtpMode(true)}
          title="Klassische E-Mail über Legacy-SMTP-Bridge"
        >
          <Icon name="mail" size={14} />
          <span>Legacy-SMTP</span>
        </button>
      </div>
      <span className="vgt-mail-mode-hint">
        {isSmtpMode
          ? (t('mode_smtp_desc') || 'Klassische SMTP-E-Mail (nicht Ende-zu-Ende)')
          : (t('mode_gaia_desc') || 'PQC Post-Quantum Ende-zu-Ende verschlüsselt')}
      </span>
    </div>
  );
}
