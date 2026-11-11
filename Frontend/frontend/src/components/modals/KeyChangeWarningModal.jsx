import React from 'react';
import Icon from '../ui/Icon';
import DialogShell from './DialogShell';

/**
 * Security-critical key-change warning. Same confirmation contract: the user has
 * to retype the last six characters of the new fingerprint before the change is
 * resumed, and cancelling runs `warning.cancelFn`.
 */
export const KeyChangeWarningModal = ({ warning, confirmInput, setConfirmInput, displayGaiaID, t }) => {
  if (!warning) return null;

  const suffix = String(warning.newKey).slice(-6);
  const confirmed = confirmInput.toLowerCase() === suffix.toLowerCase();

  return (
    <DialogShell
      id="key-change-warning"
      eyebrow="Sicherheitshinweis"
      title={t('key_change_warn_title') || 'Sicherheitskritischer Schlüsselwechsel'}
      onClose={warning.cancelFn}
      closeLabel={t('abbrechen') || 'Abbrechen'}
      size="sm"
      className="vgt-dialog--critical"
      footer={
        <div className="vgt-dialog__actions">
          <button type="button" className="btn-secondary" onClick={warning.cancelFn}>
            {t('abbrechen') || 'Abbrechen'}
          </button>
          <button type="button" className="btn-danger" onClick={warning.resumeFn} disabled={!confirmed}>
            <Icon name="alertTriangle" size={15} />
            {t('bestaetigen') || 'Bestätigen'}
          </button>
        </div>
      }
    >
      <div className="vgt-notice vgt-notice--danger" role="alert">
        <Icon name="shieldAlert" size={18} />
        <div>
          <strong>{warning.displayName}</strong>
          <span>
            {t('key_change_warning_msg') || 'Der Identitätsschlüssel für den Kontakt'}{' '}
            <span className="vgt-id">{displayGaiaID(warning.gaiaID)}</span>{' '}
            {t('key_change_warning_changed') || 'hat sich geändert. Dies kann ein Anzeichen für einen Man-in-the-Middle-Angriff sein.'}
          </span>
        </div>
      </div>

      <dl className="vgt-fingerprints">
        <div>
          <dt className="vgt-label">{t('old_fingerprint') || 'Alter Fingerprint'}</dt>
          <dd className="vgt-mono">{`${String(warning.oldKey).slice(0, 16)}…${String(warning.oldKey).slice(-16)}`}</dd>
        </div>
        <div>
          <dt className="vgt-label">{t('new_fingerprint') || 'Neuer Fingerprint'}</dt>
          <dd className="vgt-mono vgt-danger-text">{`${String(warning.newKey).slice(0, 16)}…${String(warning.newKey).slice(-16)}`}</dd>
        </div>
      </dl>

      <p className="vgt-caption">
        {t('verify_new_fingerprint_hint') || 'Verifiziere den neuen Fingerprint über einen alternativen sicheren Kanal.'}
      </p>

      <div className="vgt-field">
        <label className="vgt-label" htmlFor="key-change-confirm">
          {t('enter_fingerprint_chars_confirm') || 'Zur Bestätigung die letzten Zeichen des neuen Fingerprints eingeben'} ({suffix})
        </label>
        <input
          id="key-change-confirm"
          type="text"
          className="input-field vgt-mono"
          placeholder={suffix}
          value={confirmInput}
          onChange={event => setConfirmInput(event.target.value)}
          maxLength={6}
          autoComplete="off"
          spellCheck="false"
          aria-invalid={!confirmed}
        />
        <span className={`vgt-caption${confirmed ? ' vgt-success-text' : ''}`}>
          {confirmed ? 'Fingerprint bestätigt' : 'Bestätigung ausstehend'}
        </span>
      </div>
    </DialogShell>
  );
};

export default KeyChangeWarningModal;
