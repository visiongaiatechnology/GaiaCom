// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

export const KeyChangeWarningModal = ({
  warning,
  confirmInput,
  setConfirmInput,
  displayGaiaID,
  t
}) => {
  if (!warning) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-card glass-panel key-change-warning-card">
        <div className="popup-icon key-change-warning-icon">⚠️</div>
        <div className="popup-title key-change-warning-title">
          {t('key_change_warn_title') || 'Sicherheitskritischer Schlüsselwechsel!'}
        </div>

        <div className="key-change-warning-body">
          <p className="key-change-warning-copy">
            {t('key_change_warning_msg') || 'Der Identitätsschlüssel für den Kontakt'} <strong>{warning.displayName}</strong> ({displayGaiaID(warning.gaiaID)}) {t('key_change_warning_changed') || 'hat sich geändert. Dies kann ein Anzeichen für einen Man-in-the-Middle-Angriff sein!'}
          </p>

          <div className="key-change-fingerprint-grid">
            <div>
              <strong className="key-change-fingerprint-label-muted">{t('old_fingerprint') || 'ALTER FINGERPRINT:'}</strong><br />
              <span className="key-change-fingerprint-old">{warning.oldKey.slice(0, 16)}...{warning.oldKey.slice(-16)}</span>
            </div>
            <div>
              <strong className="key-change-fingerprint-label-new">{t('new_fingerprint') || 'NEUER FINGERPRINT:'}</strong><br />
              <span className="key-change-fingerprint-new">{warning.newKey.slice(0, 16)}...{warning.newKey.slice(-16)}</span>
            </div>
          </div>

          <p className="key-change-warning-hint">
            {t('verify_new_fingerprint_hint') || 'Verifiziere den neuen Fingerprint über einen alternativen sicheren Kanal.'}
          </p>
        </div>

        <div className="form-group key-change-confirm-group">
          <label className="key-change-confirm-label">
            {t('enter_fingerprint_chars_confirm') || 'Gib die angeforderten Fingerprint-Zeichen zur Bestätigung ein.'} ({warning.newKey.slice(-6)}):
          </label>
          <input
            type="text"
            className="input-field key-change-confirm-input"
            placeholder="e.g. a1b2c3"
            value={confirmInput}
            onChange={e => setConfirmInput(e.target.value)}
            maxLength={6}
          />
        </div>

        <div className="key-change-actions">
          <button
            className="btn-secondary key-change-action-btn"
            onClick={warning.cancelFn}
          >
            {t('abbrechen') || 'Abbrechen'}
          </button>
          <button
            className="btn-primary btn-danger key-change-action-btn"
            onClick={warning.resumeFn}
            disabled={confirmInput.toLowerCase() !== warning.newKey.slice(-6).toLowerCase()}
          >
            {t('bestaetigen') || 'Bestätigen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyChangeWarningModal;
