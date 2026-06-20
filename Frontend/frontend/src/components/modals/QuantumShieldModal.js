import React from 'react';

export const QuantumShieldModal = ({
  show,
  onClose,
  t
}) => {
  if (!show) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '600px', textAlign: 'left' }}>
        <div className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '15px' }}>
          🛡️ {t('quantum_shield_status').trim()}
        </div>
        <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '12px' }}>
            {t('quantum_shield_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '15px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--accent-cyan)' }}>
              <strong>{t('quantum_shield_l1_title')}</strong>
              <p style={{ fontSize: '0.8rem', marginTop: '2px', color: 'var(--text-muted)' }}>
                {t('quantum_shield_l1_desc')}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--accent-violet)' }}>
              <strong>{t('quantum_shield_l2_title')}</strong>
              <p style={{ fontSize: '0.8rem', marginTop: '2px', color: 'var(--text-muted)' }}>
                {t('quantum_shield_l2_desc')}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--success)' }}>
              <strong>{t('quantum_shield_l3_title')}</strong>
              <p style={{ fontSize: '0.8rem', marginTop: '2px', color: 'var(--text-muted)' }}>
                {t('quantum_shield_l3_desc')}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--warning)' }}>
              <strong>{t('quantum_shield_l4_title')}</strong>
              <p style={{ fontSize: '0.8rem', marginTop: '2px', color: 'var(--text-muted)' }}>
                {t('quantum_shield_l4_desc')}
              </p>
            </div>
          </div>
        </div>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={onClose}>
            {t('close') || 'Schließen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuantumShieldModal;
