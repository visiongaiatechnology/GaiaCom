import React from 'react';
import Icon from '../../ui/Icon';

export default function LandingFooter({ t, onOpenTerms }) {
  const year = new Date().getFullYear();
  const tr = t || ((key) => key);

  return (
    <footer className="vgt-landing-footer">
      <div className="vgt-landing-footer__top">
        <div className="vgt-landing-footer__brand">
          <p className="vgt-eyebrow">Vision Gaia Technology</p>
          <p className="vgt-h4">{tr('lp_footer_tagline') || 'Souveräne Kommunikationsinfrastruktur.'}</p>
          <p className="vgt-caption vgt-landing-footer__disclaimer">
            {tr('auth_landing_final_note') || 'Hinweis: Diese Seite beschreibt Architektur und Roadmap. Sicherheitsversprechen müssen vor produktivem Einsatz durch Implementierung, Audits und reale Tests bestätigt werden.'}
          </p>
        </div>

        <nav className="vgt-landing-footer__nav" aria-label={tr('lp_footer_nav_aria') || 'Fußzeilen-Navigation'}>
          <div>
            <p className="vgt-label">{tr('lp_footer_product') || 'Produkt'}</p>
            <a href="#architektur">{tr('lp_footer_security') || 'Sicherheitsmodell'}</a>
            <a href="#protokoll">{tr('tab_logs') || 'Protokoll'}</a>
            <a href="#oberflaechen">{tr('lp_footer_surfaces') || 'Oberflächen'}</a>
            <a href="#editionen">{tr('lp_footer_editions') || 'Editionen'}</a>
          </div>
          <div>
            <p className="vgt-label">{tr('auth_landing_nav_legal') || 'Rechtliches'}</p>
            <a href="https://gaiacom.de/impressum/" target="_blank" rel="noopener noreferrer">
              {tr('open_privacy_imprint') || 'Impressum & Datenschutz'}
            </a>
            <button type="button" onClick={onOpenTerms}>
              {tr('auth_terms_of_use') || 'Nutzungsbedingungen'}
            </button>
            <a href="https://visiongaiatechnology.de" target="_blank" rel="noopener noreferrer">
              {tr('vision_gaia_technology') || 'VisionGaiaTechnology'}
            </a>
          </div>
        </nav>
      </div>

      <div className="vgt-landing-footer__bottom">
        <span>© {year} Vision Gaia Technology · GaiaCom 3 · Sovereign Beta 3.0.2</span>
        <span className="vgt-landing-footer__badge">
          <Icon name="shieldCheck" size={14} /> {tr('lp_footer_badge') || 'Post-Quantum E2EE · Föderiert'}
        </span>
      </div>
    </footer>
  );
}
