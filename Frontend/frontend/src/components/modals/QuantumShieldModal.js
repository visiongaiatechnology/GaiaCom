// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

export const QuantumShieldModal = ({
  show,
  onClose,
  t
}) => {
  if (!show) return null;

  const layers = [
    ['cyan', 'quantum_shield_l1_title', 'quantum_shield_l1_desc'],
    ['violet', 'quantum_shield_l2_title', 'quantum_shield_l2_desc'],
    ['success', 'quantum_shield_l3_title', 'quantum_shield_l3_desc'],
    ['warning', 'quantum_shield_l4_title', 'quantum_shield_l4_desc']
  ];

  return (
    <div className="popup-overlay">
      <div className="popup-card glass-panel modal-card-wide">
        <div className="modal-title quantum-shield-title">
          🛡️ {t('quantum_shield_status').trim()}
        </div>
        <div className="quantum-shield-body">
          <p className="quantum-shield-intro">
            {t('quantum_shield_desc')}
          </p>
          <div className="quantum-shield-layer-list">
            {layers.map(([tone, titleKey, descKey]) => (
              <div key={titleKey} className={`quantum-shield-layer quantum-shield-layer-${tone}`}>
                <strong>{t(titleKey)}</strong>
                <p>{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions modal-actions-spaced">
          <button className="btn-primary modal-confirm-btn" onClick={onClose}>
            {t('close') || 'Schließen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuantumShieldModal;
