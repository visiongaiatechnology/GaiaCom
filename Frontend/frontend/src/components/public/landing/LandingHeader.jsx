import React from 'react';
import LogoMark from '../../layout/LogoMark';
import VersionBadge from '../../layout/VersionBadge';
import Icon from '../../ui/Icon';
import useDialogA11y from '../../common/useDialogA11y';
import { languageOptions } from '../../../utils/i18n';

const NAV_ITEMS = [
  { href: '#architektur', key: 'lp_nav_architecture', fallback: 'Architektur' },
  { href: '#protokoll', key: 'lp_nav_protocol', fallback: 'Protokoll' },
  { href: '#oberflaechen', key: 'lp_nav_surfaces', fallback: 'Oberflächen' },
  { href: '#gaiadrop', key: null, fallback: 'GaiaDrop' },
  { href: '#editionen', key: 'lp_nav_editions', fallback: 'Editionen' }
];

export default function LandingHeader({
  t,
  language,
  changeLanguage,
  serverVersion,
  serverConsensus,
  onOpenAuth,
  onOpenTerms
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Mobile navigation sheet is a modal dialog: trap focus, Escape closes,
  // focus returns to the burger button.
  const sheetRef = useDialogA11y(mobileOpen, { onClose: () => setMobileOpen(false) });

  const renderLanguageSelect = (idSuffix) => (
    <label className="vgt-lang" htmlFor={`vgt-lang-${idSuffix}`}>
      <span className="vgt-sr-only">{t('language') || 'Sprache'}</span>
      <select
        id={`vgt-lang-${idSuffix}`}
        className="vgt-lang__select"
        value={language}
        onChange={(event) => changeLanguage(event.target.value)}
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={14} className="vgt-lang__chevron" />
    </label>
  );

  return (
    <header className="vgt-landing-header">
      <div className="vgt-landing-header__bar vgt-glass vgt-glass--quiet">
        <a className="vgt-landing-header__brand" href="#top" aria-label={t('lp_nav_home_aria') || 'GaiaCom Startseite'}>
          <LogoMark />
          <VersionBadge version={serverVersion} consensus={serverConsensus} />
        </a>

        <nav className="vgt-landing-nav" aria-label={t('lp_nav_main_aria') || 'Hauptnavigation'}>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.key ? (t(item.key) || item.fallback) : item.fallback}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="vgt-landing-header__actions">
          {renderLanguageSelect('desktop')}
          <button type="button" className="btn-ghost" onClick={onOpenTerms}>
            {t('auth_terms_of_use') || 'Nutzungsbedingungen'}
          </button>
          <button type="button" className="btn-primary" onClick={() => onOpenAuth('auth')}>
            {t('auth_btn_login') || 'Anmelden'}
            <Icon name="arrowRight" size={16} />
          </button>
          <button
            type="button"
            className="btn-icon vgt-landing-header__burger"
            onClick={() => setMobileOpen(true)}
            aria-label={t('lp_nav_menu_open') || 'Menü öffnen'}
            aria-expanded={mobileOpen}
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="vgt-landing-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t('lp_nav_main_aria') || 'Navigation'}
          ref={sheetRef}
        >
          <button
            type="button"
            className="vgt-landing-sheet__scrim"
            aria-label={t('lp_nav_menu_close') || 'Menü schließen'}
            onClick={() => setMobileOpen(false)}
          />
          <div className="vgt-landing-sheet__panel vgt-glass vgt-glass--floating">
            <div className="vgt-landing-sheet__head">
              <span className="vgt-label">{t('lp_nav_main_aria') || 'Navigation'}</span>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setMobileOpen(false)}
                aria-label={t('lp_nav_menu_close') || 'Menü schließen'}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <nav aria-label={t('lp_nav_main_aria') || 'Mobile Hauptnavigation'}>
              <ul className="vgt-landing-sheet__nav">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} onClick={() => setMobileOpen(false)}>
                      {item.key ? (t(item.key) || item.fallback) : item.fallback}
                      <Icon name="chevronRight" size={16} />
                    </a>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={onOpenTerms}>
                    {t('auth_terms_of_use') || 'Nutzungsbedingungen'}
                    <Icon name="chevronRight" size={16} />
                  </button>
                </li>
              </ul>
            </nav>
            <div className="vgt-landing-sheet__foot">
              {renderLanguageSelect('mobile')}
              <button type="button" className="btn-primary" onClick={() => { setMobileOpen(false); onOpenAuth('auth'); }}>
                {t('auth_btn_login') || 'Anmelden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
