import React from 'react';
import Icon from '../../ui/Icon';
import { useTranslation } from '../../../utils/i18n';

const TRUST_ITEMS = [
  { icon: 'shieldCheck', titleKey: 'lp_trust_item1_title', bodyKey: 'lp_trust_item1_body' },
  { icon: 'lock', titleKey: 'lp_trust_item2_title', bodyKey: 'lp_trust_item2_body' },
  { icon: 'key', titleKey: 'lp_trust_item3_title', bodyKey: 'lp_trust_item3_body' },
  { icon: 'globe', titleKey: 'lp_trust_item4_title', bodyKey: 'lp_trust_item4_body' }
];

export default function LandingTrust() {
  const { t } = useTranslation();
  return (
    <section className="vgt-trust" id="architektur" aria-labelledby="vgt-trust-title">
      <div className="vgt-section-head">
        <p className="vgt-eyebrow">{t('lp_trust_eyebrow') || 'Sicherheitsmodell'}</p>
        <h2 className="vgt-h2" id="vgt-trust-title">
          {t('lp_trust_title') || 'Vertrauen wird nicht versprochen. Es wird rechnerisch ersetzt.'}
        </h2>
        <p className="vgt-body">
          {t('lp_trust_intro') || 'Vier Eigenschaften tragen das GaiaCom-Modell. Sie sind Architektur, keine Marketing-Zahlen — deshalb stehen hier keine erfundenen Prozentwerte.'}
        </p>
      </div>

      <ul className="vgt-trust__grid">
        {TRUST_ITEMS.map((item) => (
          <li className="vgt-trust__item" key={item.titleKey}>
            <span className="vgt-trust__icon" aria-hidden="true">
              <Icon name={item.icon} size={22} />
            </span>
            <h3 className="vgt-h4">{t(item.titleKey)}</h3>
            <p className="vgt-body vgt-body--sm">{t(item.bodyKey)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
