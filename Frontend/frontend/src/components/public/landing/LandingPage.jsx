import React from 'react';
import LandingHeader from './LandingHeader';
import LandingHero from './LandingHero';
import LandingTrust from './LandingTrust';
import LandingFlow from './LandingFlow';
import LandingSurfaces from './LandingSurfaces';
import LandingProtocol from './LandingProtocol';
import LandingDrop from './LandingDrop';
import LandingEditions from './LandingEditions';
import LandingFooter from './LandingFooter';
import Icon from '../../ui/Icon';

function Emphasized({ text }) {
  const parts = String(text).split('|');
  return parts.map((part, index) => (
    index % 2 === 1
      ? <span className="vgt-title-em" key={index}>{part}</span>
      : <React.Fragment key={index}>{part}</React.Fragment>
  ));
}

export default function LandingPage({
  t,
  language,
  changeLanguage,
  serverVersion,
  serverConsensus,
  onOpenAuth,
  onOpenTerms,
  dropTargetInput,
  dropSenderInput,
  dropMessageInput,
  dropStatus,
  dropError,
  onDropTargetChange,
  onDropSenderChange,
  onDropMessageChange,
  onSubmitGaiaDrop
}) {
  return (
    <div className="vgt-landing">
      <div className="vgt-aurora" aria-hidden="true">
        <div className="vgt-aurora__image" />
        <div className="vgt-aurora__veil" />
        <div className="vgt-aurora__glow vgt-aurora__glow--teal" />
        <div className="vgt-aurora__glow vgt-aurora__glow--violet" />
        <div className="vgt-aurora__arch" />
        <div className="vgt-aurora__stars" />
      </div>

      <a className="vgt-skip-link" href="#vgt-main">
        {t('skip_to_content') || 'Zum Inhalt springen'}</a>

      <LandingHeader
        t={t}
        language={language}
        changeLanguage={changeLanguage}
        serverVersion={serverVersion}
        serverConsensus={serverConsensus}
        onOpenAuth={onOpenAuth}
        onOpenTerms={onOpenTerms}
      />

      <main className="vgt-landing__main" id="vgt-main">
        <LandingHero t={t} onOpenAuth={onOpenAuth} />
        <LandingTrust />
        <LandingFlow />
        <LandingSurfaces t={t} onOpenAuth={onOpenAuth} />
        <LandingProtocol />
        <LandingDrop
          t={t}
          dropTargetInput={dropTargetInput}
          dropSenderInput={dropSenderInput}
          dropMessageInput={dropMessageInput}
          dropStatus={dropStatus}
          dropError={dropError}
          onDropTargetChange={onDropTargetChange}
          onDropSenderChange={onDropSenderChange}
          onDropMessageChange={onDropMessageChange}
          onSubmitGaiaDrop={onSubmitGaiaDrop}
        />
        <LandingEditions onOpenAuth={onOpenAuth} />

        <section className="vgt-final" aria-labelledby="vgt-final-title">
          <div className="vgt-final__inner">
            <p className="vgt-eyebrow">{t('lp_final_eyebrow') || 'Zugang'}</p>
            <h2 className="vgt-h1" id="vgt-final-title">
              <Emphasized text={t('lp_final_title') || 'Ein Kommunikationsraum, der |dir| gehört.'} />
            </h2>
            <p className="vgt-body">
              {t('lp_final_body') || 'Erstelle deine Identität, sichere deinen Seed und kommuniziere über ein Netz, das Inhalte nicht lesen kann.'}
            </p>
            <div className="vgt-final__actions">
              <button type="button" className="btn-primary" onClick={() => onOpenAuth('auth')}>
                {t('lp_cta_open') || 'Zugang eröffnen'}
                <Icon name="arrowRight" size={16} />
              </button>
              <a className="btn-secondary" href="#gaiadrop">
                <Icon name="send" size={16} />
                {t('lp_final_cta_drop') || 'Ohne Konto senden'}
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter t={t} onOpenTerms={onOpenTerms} />
    </div>
  );
}
