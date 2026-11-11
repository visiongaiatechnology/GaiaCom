import React from 'react';
import { useTranslation } from '../../../utils/i18n';

/**
 * The four message-path steps reuse the already translated auth_landing_step*
 * keys, so the lifecycle stays identical in every language.
 */
const STEPS = [
  { index: '01', titleKey: 'auth_landing_step1_title', bodyKey: 'auth_landing_step1_desc' },
  { index: '02', titleKey: 'auth_landing_step2_title', bodyKey: 'auth_landing_step2_desc' },
  { index: '03', titleKey: 'auth_landing_step3_title', bodyKey: 'auth_landing_step3_desc' },
  { index: '04', titleKey: 'auth_landing_step4_title', bodyKey: 'auth_landing_step4_desc' }
];

export default function LandingFlow() {
  const { t } = useTranslation();
  return (
    <section className="vgt-flow" aria-labelledby="vgt-flow-title">
      <div className="vgt-section-head">
        <p className="vgt-eyebrow">{t('lp_flow_eyebrow') || 'Nachrichtenpfad'}</p>
        <h2 className="vgt-h2" id="vgt-flow-title">
          {t('lp_flow_title') || 'Wie eine Nachricht reist — und wo sie unlesbar wird.'}
        </h2>
      </div>

      <ol className="vgt-flow__rail">
        {STEPS.map((step) => (
          <li className="vgt-flow__step" key={step.index}>
            <span className="vgt-flow__index vgt-numeric" aria-hidden="true">{step.index}</span>
            <div className="vgt-flow__body">
              <h3 className="vgt-h4">{t(step.titleKey)}</h3>
              <p className="vgt-body vgt-body--sm">{t(step.bodyKey)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
