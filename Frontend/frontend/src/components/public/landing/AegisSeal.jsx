import React from 'react';
import Icon from '../../ui/Icon';
import { useTranslation } from '../../../utils/i18n';

const SUITE_LAYERS = [
  { key: 'x25519', layer: 'L1', name: 'X25519', roleKey: 'lp_aegis_role_x25519', tone: 'titan' },
  { key: 'mlkem', layer: 'L2', name: 'ML-KEM-1024', roleKey: 'lp_aegis_role_mlkem', tone: 'sage' },
  { key: 'hqc', layer: 'L3', name: 'HQC-256', roleKey: 'lp_aegis_role_hqc', tone: 'bronze' }
];

/**
 * Aegis Seal — the product's signature spatial element.
 *
 * Three layers represent the three negotiated secrets that are combined into
 * one envelope. The 3D effect is pure CSS (perspective + translateZ + pointer
 * reactive tilt); there is no WebGL/three.js dependency, no ambient loop, and
 * it fully disables itself for reduced motion / coarse pointers.
 */
export default function AegisSeal() {
  const { t } = useTranslation();
  const stageRef = React.useRef(null);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof window === 'undefined') return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia?.('(pointer: coarse)');
    if (reduceMotion?.matches || coarsePointer?.matches) return undefined;

    let frame = 0;
    const handleMove = (event) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      const rotY = Math.max(-7, Math.min(7, px * 14));
      const rotX = Math.max(-7, Math.min(7, -py * 14));
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        stage.style.setProperty('--vgt-tilt-x', `${rotX.toFixed(2)}deg`);
        stage.style.setProperty('--vgt-tilt-y', `${rotY.toFixed(2)}deg`);
      });
    };
    const handleLeave = () => {
      stage.style.setProperty('--vgt-tilt-x', '0deg');
      stage.style.setProperty('--vgt-tilt-y', '0deg');
    };

    stage.addEventListener('pointermove', handleMove);
    stage.addEventListener('pointerleave', handleLeave);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      stage.removeEventListener('pointermove', handleMove);
      stage.removeEventListener('pointerleave', handleLeave);
    };
  }, []);

  return (
    <div className="vgt-seal" aria-label={t('lp_aegis_aria') || 'Drei Schlüsselsecrets werden zu einem Envelope kombiniert'}>
      <div className="vgt-seal__frame">
        <div className="vgt-spatial vgt-seal__stage" ref={stageRef}>
          <div className="vgt-seal__halo" aria-hidden="true" />
          <div className="vgt-spatial__layer vgt-spatial__layer--1">
            <div className="vgt-seal__ring vgt-seal__ring--outer" aria-hidden="true" />
          </div>
          <div className="vgt-spatial__layer vgt-spatial__layer--2">
            <div className="vgt-seal__ring vgt-seal__ring--mid" aria-hidden="true" />
          </div>
          <div className="vgt-spatial__layer vgt-spatial__layer--3">
            <div className="vgt-seal__ring vgt-seal__ring--inner" aria-hidden="true" />
          </div>
          <div className="vgt-seal__core" aria-hidden="true">
            <Icon name="mail" size={34} strokeWidth={1.4} />
          </div>
        </div>
      </div>

      <ul className="vgt-seal__legend">
        {SUITE_LAYERS.map((item) => (
          <li className={`vgt-seal__legend-item vgt-seal__legend-item--${item.tone}`} key={item.key}>
            <span className="vgt-seal__legend-marker" aria-hidden="true" />
            <span className="vgt-seal__legend-layer">{item.layer}</span>
            <span className="vgt-seal__legend-name">{item.name}</span>
            <span className="vgt-seal__legend-role">{t(item.roleKey)}</span>
          </li>
        ))}
      </ul>

      <p className="vgt-seal__caption">
        {t('lp_aegis_caption') || 'Ein Envelope. Drei Secrets. Kombiniert auf deinem Gerät — der Server sieht nur Chiffrat.'}
      </p>
    </div>
  );
}
