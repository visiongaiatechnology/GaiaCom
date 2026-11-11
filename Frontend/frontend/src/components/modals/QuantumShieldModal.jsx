import React from 'react';
import Icon from '../ui/Icon';
import DialogShell from './DialogShell';

const LAYERS = [
  { tone: 'pigment', icon: 'key', title: 'quantum_shield_l1_title', desc: 'quantum_shield_l1_desc' },
  { tone: 'titan', icon: 'lock', title: 'quantum_shield_l2_title', desc: 'quantum_shield_l2_desc' },
  { tone: 'success', icon: 'shieldCheck', title: 'quantum_shield_l3_title', desc: 'quantum_shield_l3_desc' },
  { tone: 'bronze', icon: 'seal', title: 'quantum_shield_l4_title', desc: 'quantum_shield_l4_desc' }
];

/**
 * Static explanation of the layered shield model. This dialog describes the
 * architecture; it does not report a live security state (that lives in the
 * Security Center and is server-backed).
 */
export const QuantumShieldModal = ({ show, onClose, t }) => {
  if (!show) return null;

  return (
    <DialogShell
      id="quantum-shield"
      eyebrow="GaiaShield"
      title={(t('quantum_shield_status') || 'Quantum Shield Status').trim()}
      description={t('quantum_shield_desc')}
      onClose={onClose}
      closeLabel={t('close') || 'Schließen'}
      size="sm"
      footer={
        <div className="vgt-dialog__actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t('close') || 'Schließen'}
          </button>
        </div>
      }
    >
      <ol className="vgt-shield-layers">
        {LAYERS.map(layer => (
          <li key={layer.title} className={`vgt-shield-layer vgt-shield-layer--${layer.tone}`}>
            <span className="vgt-shield-layer__icon" aria-hidden="true">
              <Icon name={layer.icon} size={17} />
            </span>
            <div>
              <strong>{t(layer.title)}</strong>
              <p className="vgt-body vgt-body--sm">{t(layer.desc)}</p>
            </div>
          </li>
        ))}
      </ol>
    </DialogShell>
  );
};

export default QuantumShieldModal;
