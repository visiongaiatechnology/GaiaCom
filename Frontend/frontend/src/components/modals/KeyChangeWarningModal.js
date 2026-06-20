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
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '520px', borderColor: 'var(--danger)', textAlign: 'left' }}>
        <div className="popup-icon" style={{ color: 'var(--danger)', background: 'var(--danger-glow)', margin: '0 0 20px 0' }}>⚠️</div>
        <div className="popup-title" style={{ color: 'var(--danger)', fontSize: '1.3rem' }}>
          {t('key_change_warn_title') || 'Sicherheitskritischer Schlüsselwechsel!'}
        </div>
        
        <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '15px' }}>
          <p style={{ marginBottom: '10px' }}>
            {t('key_change_warn_desc', { name: warning.displayName, gaiaId: displayGaiaID(warning.gaiaID) }) || (
              <>
                Der Identitätsschlüssel für den Kontakt <strong>{warning.displayName}</strong> ({displayGaiaID(warning.gaiaID)}) hat sich geändert. Dies kann ein Anzeichen für einen Man-in-the-Middle-Angriff sein!
              </>
            )}
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            <div>
              <strong style={{ color: 'var(--text-muted)' }}>{t('old_fingerprint') || 'ALTER FINGERPRINT:'}</strong><br/>
              <span style={{ color: 'var(--text-secondary)' }}>{warning.oldKey.slice(0, 16)}...{warning.oldKey.slice(-16)}</span>
            </div>
            <div>
              <strong style={{ color: 'var(--accent-cyan)' }}>{t('new_fingerprint') || 'NEUER FINGERPRINT:'}</strong><br/>
              <span style={{ color: 'var(--accent-cyan)' }}>{warning.newKey.slice(0, 16)}...{warning.newKey.slice(-16)}</span>
            </div>
          </div>
          
          <p style={{ marginTop: '12px', fontWeight: 600, color: 'var(--warning)' }}>
            {t('verify_new_fingerprint_hint') || 'Verifiziere den neuen Fingerprint über einen alternativen sicheren Kanal.'}
          </p>
        </div>
        
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ color: 'var(--danger)' }}>
            {t('enter_fingerprint_chars_confirm', { chars: warning.newKey.slice(-6) }) || `Gib die letzten 6 Zeichen des neuen Schlüssels zur Bestätigung ein (${warning.newKey.slice(-6)}):`}
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. a1b2c3"
            value={confirmInput}
            onChange={e => setConfirmInput(e.target.value)}
            style={{ borderColor: 'var(--danger)' }}
            maxLength={6}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-secondary" 
            onClick={warning.cancelFn}
            style={{ flex: 1, marginTop: 0 }}
          >
            {t('abbrechen') || 'Abbrechen'}
          </button>
          <button 
            className="btn-primary" 
            onClick={warning.resumeFn}
            disabled={confirmInput.toLowerCase() !== warning.newKey.slice(-6).toLowerCase()}
            style={{ flex: 1, background: 'var(--danger)', boxShadow: '0 4px 20px var(--danger-glow)', marginTop: 0 }}
          >
            {t('bestaetigen') || 'Bestätigen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyChangeWarningModal;
