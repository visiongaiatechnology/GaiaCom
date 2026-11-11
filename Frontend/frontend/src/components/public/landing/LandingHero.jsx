import React from 'react';
import Icon from '../../ui/Icon';
import AegisSeal from './AegisSeal';

/**
 * Renders a translated title where |text between pipes| receives the accent
 * gradient. Translators keep the pipe markers so word order stays natural in
 * every language.
 */
export function EmphasisTitle({ text, id }) {
  const parts = String(text || '').split('|');
  return (
    <h1 className="vgt-hero__title" id={id}>
      {parts.map((part, index) => (
        index % 2 === 1
          ? <span className="vgt-title-em" key={index}>{part}</span>
          : <React.Fragment key={index}>{part}</React.Fragment>
      ))}
    </h1>
  );
}

export default function LandingHero({ t, onOpenAuth }) {
  return (
    <section className="vgt-hero" id="top" aria-labelledby="vgt-hero-title">
      <div className="vgt-hero__copy vgt-enter">
        <p className="vgt-eyebrow">{t('lp_hero_eyebrow') || 'Sovereign Communication Infrastructure'}</p>
        <EmphasisTitle
          id="vgt-hero-title"
          text={t('lp_hero_title') || 'Kommunikation, die |niemandem vertrauen| muss.'}
        />
        <p className="vgt-hero__lead">
          {t('lp_hero_lead') || 'Chat, Mail, Räume und Dateien in einem souveränen Netz. Jede Nachricht verlässt dein Gerät als Chiffrat — mit hybrider Post-Quanten-Verschlüsselung und ohne zentralen Leseschlüssel.'}
        </p>
        <div className="vgt-hero__actions">
          <button type="button" className="btn-primary vgt-hero__cta" onClick={() => onOpenAuth('auth')}>
            {t('lp_cta_open') || 'Zugang eröffnen'}
            <Icon name="arrowRight" size={17} />
          </button>
          <a className="btn-secondary vgt-hero__cta" href="#gaiadrop">
            <Icon name="send" size={16} />
            {t('auth_tab_drop') || 'GaiaDrop ohne Konto'}
          </a>
        </div>
        <dl className="vgt-hero__facts">
          <div>
            <dt>{t('lp_hero_fact_envelope') || 'Envelope'}</dt>
            <dd>Dual-PQC</dd>
          </div>
          <div>
            <dt>{t('lp_hero_fact_trust') || 'Serververtrauen'}</dt>
            <dd>{t('lp_hero_fact_none') || 'Keines'}</dd>
          </div>
          <div>
            <dt>{t('lp_hero_fact_keys') || 'Schlüssel'}</dt>
            <dd>{t('lp_hero_fact_local') || 'Nur lokal'}</dd>
          </div>
          <div>
            <dt>{t('sc_col_status') || 'Status'}</dt>
            <dd>Beta 3.0.2</dd>
          </div>
        </dl>
        <p className="vgt-hero__note">
          {t('auth_beta_notice') || 'Beta-Testphase: GaiaCom wird aktiv getestet. Sichere wichtige Seeds und prüfe vertrauliche Workflows sorgfältig.'}
        </p>
      </div>

      <div className="vgt-hero__visual vgt-enter vgt-enter--fade">
        <AegisSeal />
      </div>
    </section>
  );
}
