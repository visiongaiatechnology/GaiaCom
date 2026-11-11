import React from 'react';
import Icon from '../../ui/Icon';
import useDialogA11y from '../../common/useDialogA11y';
import { GAIA_COM_BETA_TERMS_EN } from '../../../utils/terms';

export function TermsDialog({ t, onClose }) {
  const titleId = 'vgt-terms-title';
  const dialogRef = useDialogA11y(true, { onClose });

  return (
    <div className="vgt-overlay" role="presentation">
      <div
        ref={dialogRef}
        className="vgt-dialog vgt-dialog--wide vgt-glass--modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="vgt-dialog__head">
          <h2 className="vgt-h3" id={titleId}>
            {t('auth_terms_title') || 'GaiaCom Beta – Nutzungsbedingungen'}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('close') || 'Schließen'}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="vgt-dialog__scroll">
          <pre className="vgt-terms">{GAIA_COM_BETA_TERMS_EN}</pre>
        </div>
        <footer className="vgt-dialog__foot">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('auth_terms_close') || 'Schließen'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function RegistrationSuccess({ t, onClose, derivedKeys }) {
  const dialogRef = useDialogA11y(true, { onClose });
  return (
    <div className="vgt-overlay" role="presentation">
      <div ref={dialogRef} className="vgt-dialog vgt-dialog--success vgt-glass--modal" role="dialog" aria-modal="true" aria-labelledby="vgt-reg-success">
        <span className="vgt-dialog__seal" aria-hidden="true">
          <Icon name="shieldCheck" size={26} />
        </span>
        <h2 className="vgt-h3" id="vgt-reg-success">{t('auth_success_title') || 'Konto erstellt'}</h2>
        <p className="vgt-body vgt-body--sm">{t('auth_success_text')}</p>
        {derivedKeys?.sign?.public && (
          <div className="vgt-dialog__key">
            <span className="vgt-label">{t('lp_legal_signature') || 'Signaturschlüssel (öffentlich)'}</span>
            <code className="vgt-mono">{derivedKeys.sign.public}</code>
          </div>
        )}
        <button type="button" className="btn-primary" onClick={onClose}>
          {t('auth_success_btn') || 'Weiter'}
        </button>
      </div>
    </div>
  );
}

export function CookieBanner({ t, onAccept }) {
  return (
    <div className="vgt-cookie vgt-glass" role="status" aria-live="polite">
      <div className="vgt-cookie__copy">
        <strong>{t('auth_cookie_title') || 'GaiaCom bleibt souverän.'}</strong>
        <span>
          {t('auth_cookie_desc') || 'Wir verwenden nur technisch notwendige lokale Speicherfunktionen für Sprache, Session und Sicherheit. Kein Tracking, keine Werbe-Cookies, keine Drittanbieter-Profile.'}
        </span>
      </div>
      <button type="button" className="btn-primary" onClick={onAccept}>
        {t('auth_cookie_accept') || 'Verstanden'}
      </button>
    </div>
  );
}
