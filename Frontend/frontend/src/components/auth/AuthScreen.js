// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import LogoMark from '../layout/LogoMark';
import VersionBadge from '../layout/VersionBadge';
import { languageOptions, useTranslation } from '../../utils/i18n';
import { GAIA_COM_BETA_TERMS_EN } from '../../utils/terms';
import gaiacomLogo from '../../gaiacom.png';

export default function AuthScreen({
  isRegister,
  usernameInput,
  passwordInput,
  mnemonic,
  copiedMnemonic,
  authError,
  showRegSuccessPopup,
  derivedKeys,
  serverVersion,
  serverConsensus,
  dropTargetInput,
  dropSenderInput,
  dropMessageInput,
  dropStatus,
  dropError,
  onSubmit,
  onImportRecovery,
  onUsernameChange,
  onPasswordChange,
  onMnemonicChange,
  onDropTargetChange,
  onDropSenderChange,
  onDropMessageChange,
  onSubmitGaiaDrop,
  onGenerateMnemonic,
  onCopyMnemonic,
  onToggleMode,
  onCloseSuccess,
}) {
  const { language, changeLanguage, t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState('auth'); // 'auth', 'drop', or 'recovery'
  const [showTermsPopup, setShowTermsPopup] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [legalAccepted, setLegalAccepted] = React.useState(false);
  const [recoveryFile, setRecoveryFile] = React.useState(null);
  const [recoveryPassword, setRecoveryPassword] = React.useState('');
  const [recoveryLocalPassword, setRecoveryLocalPassword] = React.useState('');
  const [recoveryBusy, setRecoveryBusy] = React.useState(false);
  const [recoveryError, setRecoveryError] = React.useState('');
  const [showCookieBanner, setShowCookieBanner] = React.useState(() => {
    try {
      return localStorage.getItem('gaia_cookie_ack') !== 'sovereign-v1';
    } catch (_) {
      return true;
    }
  });

  const acceptCookieBanner = React.useCallback(() => {
    try {
      localStorage.setItem('gaia_cookie_ack', 'sovereign-v1');
    } catch (_) {}
    setShowCookieBanner(false);
  }, []);

  const handleAuthSubmit = React.useCallback((event) => {
    if (isRegister && !legalAccepted) {
      event.preventDefault();
      return;
    }
    onSubmit(event);
  }, [isRegister, legalAccepted, onSubmit]);

  const handleRecoveryImport = React.useCallback(async () => {
    if (!onImportRecovery) return;
    setRecoveryBusy(true);
    setRecoveryError('');
    try {
      await onImportRecovery(recoveryFile, recoveryPassword, recoveryLocalPassword);
      setRecoveryFile(null);
      setRecoveryPassword('');
      setRecoveryLocalPassword('');
    } catch (err) {
      setRecoveryError(err.message || 'Recovery konnte nicht importiert werden.');
    } finally {
      setRecoveryBusy(false);
    }
  }, [onImportRecovery, recoveryFile, recoveryPassword, recoveryLocalPassword]);

  // Pointer move handler for dynamic landing page gradient positioning
  const handlePointerMove = React.useCallback((event) => {
    const root = event.currentTarget;
    const rect = root.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    root.style.setProperty('--gc-mx', `${x.toFixed(2)}%`);
    root.style.setProperty('--gc-my', `${y.toFixed(2)}%`);
  }, []);

  // Pointer move handler for individual card hover effects
  const handleCardPointerMove = React.useCallback((event) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--x', `${x.toFixed(2)}%`);
    card.style.setProperty('--y', `${y.toFixed(2)}%`);
  }, []);

  // IntersectionObserver for gc-card scroll entry animations
  React.useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.gc-card').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    const cards = document.querySelectorAll('.gc-card');
    cards.forEach((el) => observer.observe(el));

    return () => {
      cards.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Automatically open the login modal if there's an authentication error
  React.useEffect(() => {
    if (authError) {
      setShowAuthModal(true);
    }
  }, [authError]);

  return (
    <div 
      className={`gc-page auth-lang-${language}`} 
      onPointerMove={handlePointerMove}
      style={{ '--gc-mx': '50%', '--gc-my': '30%' }}
    >
      <div className="gc-aurora" aria-hidden="true"></div>
      <div className="gc-stars" aria-hidden="true"></div>

      {/* HEADER NAVBAR */}
      <header className="vgt-omega-header">
        <div className="vgt-glass-container">
          <div className="vgt-branding">
            <LogoMark />
            <VersionBadge version={serverVersion} consensus={serverConsensus} />
          </div>

          <nav className="vgt-desktop-nav">
            <ul>
              <li className="current-menu-item"><a href="#content">{t('auth_tab_login')}</a></li>
              <li>
                <a href="#content" onClick={(e) => { e.preventDefault(); setShowAuthModal(true); }}>
                  {t('auth_landing_nav_beta') || 'Beta Test'}
                </a>
              </li>
              <li className="menu-item-has-children">
                <a href="#content" onClick={(e) => e.preventDefault()}>GaiaCom</a>
                <ul className="sub-menu">
                  <li><a href="https://gaiacom.de/foundation/" target="_blank" rel="noopener noreferrer">Foundation</a></li>
                  <li><a href="https://github.com/visiongaiatechnology/GaiaCom" target="_blank" rel="noopener noreferrer">Github</a></li>
                </ul>
              </li>
              <li className="menu-item-has-children">
                <a href="#content" onClick={(e) => e.preventDefault()}>{t('auth_landing_nav_legal') || 'Rechtliches'}</a>
                <ul className="sub-menu">
                  <li><a href="https://gaiacom.de/impressum/" target="_blank" rel="noopener noreferrer">{t('open_privacy_imprint') || 'Impressum und Datenschutz'}</a></li>
                  <li><a href="https://visiongaiatechnology.de" target="_blank" rel="noopener noreferrer">VGT</a></li>
                </ul>
              </li>
            </ul>
          </nav>

          <div className="vgt-controls">
            <div className="language-selector-row">
              <select
                className="language-dropdown"
                value={language}
                onChange={event => changeLanguage(event.target.value)}
                aria-label="Language"
              >
                {languageOptions.map(option => (
                  <option key={option.code} value={option.code}>
                    {option.flag} {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button 
              type="button" 
              className="gc-btn header-login-btn primary"
              onClick={() => setShowAuthModal(true)}
            >
              {t('auth_btn_login') || 'Anmelden'}
            </button>
            <button 
              type="button"
              className="vgt-menu-toggle"
              onClick={() => setShowMobileMenu(true)}
              aria-label="Menü öffnen"
            >
              <span className="vgt-burger-line"></span>
              <span className="vgt-burger-line"></span>
              <span className="vgt-burger-line"></span>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY MENU */}
      <div className={`vgt-mobile-menu-container lg:hidden ${showMobileMenu ? 'open' : ''}`}>
        <div className="vgt-mobile-inner">
          <button 
            type="button"
            className="vgt-mobile-close-btn"
            onClick={() => setShowMobileMenu(false)}
            aria-label="Menü schließen"
          >
            ✕
          </button>
          <nav className="vgt-mobile-nav">
            <ul>
              <li><a href="#content" onClick={() => { setShowMobileMenu(false); }}>{t('auth_tab_login')}</a></li>
              <li><a href="#content" onClick={() => { setShowMobileMenu(false); setShowAuthModal(true); }}>{t('auth_btn_login')}</a></li>
              <li>
                <a href="#content" onClick={(e) => e.preventDefault()}>GaiaCom</a>
                <ul className="sub-menu">
                  <li><a href="https://gaiacom.de/foundation/" target="_blank" rel="noopener noreferrer">Foundation</a></li>
                  <li><a href="https://github.com/visiongaiatechnology/GaiaCom" target="_blank" rel="noopener noreferrer">Github</a></li>
                </ul>
              </li>
              <li>
                <a href="#content" onClick={(e) => e.preventDefault()}>{t('auth_landing_nav_legal') || 'Rechtliches'}</a>
                <ul className="sub-menu">
                  <li><a href="https://gaiacom.de/impressum/" target="_blank" rel="noopener noreferrer">{t('open_privacy_imprint') || 'Impressum und Datenschutz'}</a></li>
                  <li><a href="https://visiongaiatechnology.de" target="_blank" rel="noopener noreferrer">VGT</a></li>
                </ul>
              </li>
            </ul>
          </nav>
          <div className="vgt-mobile-language">
            <span>{t('language') || 'Sprache'}</span>
            <select
              className="language-dropdown"
              value={language}
              onChange={event => changeLanguage(event.target.value)}
              aria-label="Language"
            >
              {languageOptions.map(option => (
                <option key={option.code} value={option.code}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="vgt-mobile-footer">
            Vision Gaia Technology
          </div>
        </div>
      </div>

      <main className="gc-wrap" id="content">
        {/* HERO SECTION */}
        <section className="gc-hero" aria-label="GaiaCom Hero">
          <div className="gc-hero-copy">
            <div className="gc-kicker">
              <span className="gc-kicker-dot"></span> 
              {t('auth_kicker') || 'Post-Quantum Secure Communication'}
            </div>
            <h1 className="gc-title">
              <span className="gc-gradient">THE END OF</span>
              <span className="gc-subline">E-MAIL AS WE KNOW IT</span>
            </h1>
            <p className="gc-lead" style={{ fontWeight: '800', color: '#fff', fontSize: '1.25rem', lineHeight: 1.5, marginTop: '20px' }}>
              {t('auth_headline')}
            </p>
            <p className="gc-sub-lead" style={{ color: 'var(--gc-soft)', opacity: 0.85, fontSize: '15px', marginTop: '14px', lineHeight: 1.62 }}>
              {t('auth_subline')}
            </p>
            <div className="gc-actions">
              <button className="gc-btn primary" onClick={() => setShowAuthModal(true)}>
                🚀 {t('auth_btn_login') || 'Anmelden / Registrieren'}
              </button>
              <a className="gc-btn" href="#gaiadrop-section">
                💧 {t('auth_tab_drop') || 'GaiaDrop'} nutzen
              </a>
            </div>
            <p className="gc-mini-note">
              {t('auth_beta_notice')}
            </p>
          </div>

          <div className="gc-visual" aria-label="GaiaCom secure network visualization">
            <div className="gc-floating-card">
              <div className="gc-status-row"><span>Quantum resistance</span><strong>ARMED</strong></div>
              <div className="gc-bar"></div>
              <div className="gc-status-row" style={{ marginTop: '12px' }}><span>Server trust</span><strong style={{ color: 'var(--gc-red)' }}>ZERO</strong></div>
            </div>

            <div className="gc-orbit" aria-hidden="true">
              <div className="gc-orbit-line"></div>
              <div className="gc-orbit-line"></div>
              <div className="gc-orbit-line"></div>
              <div className="gc-node"></div>
              <div className="gc-node"></div>
              <div className="gc-node"></div>
            </div>

            <div className="gc-logo-core">
              <img className="gc-logo-img" src={gaiacomLogo} alt="GaiaCom Logo" loading="eager" decoding="async" />
            </div>

            <div className="gc-terminal" aria-label="GaiaCom encryption status terminal">
              <div className="gc-terminal-top"><span>{"LOCAL_DECRYPTION // LIVE"}</span><span className="gc-dots"><span></span><span></span><span></span></span></div>
              <div className="gc-code-line"><span className="n">01</span><span><span className="k">x25519</span>.derive(shared_secret)</span></div>
              <div className="gc-code-line"><span className="n">02</span><span><span className="k">ml_kem_1024</span>.encapsulate(public_key)</span></div>
              <div className="gc-code-line"><span className="n">03</span><span><span className="v">client</span>.encrypt(message_blob)</span></div>
              <div className="gc-code-line"><span className="n">04</span><span><span className="g">federated_storage</span>.publish(ciphertext)</span></div>
              <div className="gc-code-line cursor"><span className="n">05</span><span>server_sees = "static_noise"</span></div>
            </div>
          </div>
        </section>

        {/* WHY GAIACOM FEATURE GRID */}
        <section className="gc-section">
          <div className="gc-section-title">
            <p className="gc-eyebrow">{"01 // Why GaiaCom"}</p>
            <h2>{t('auth_why_gaiacom') || 'Warum GaiaCOM?'}</h2>
            <p>
              {t('auth_why_gaiacom_desc') || 'Die sichere, dezentrale Alternative für Ihre vertrauliche Kommunikation.'}
            </p>
          </div>

          <div className="gc-grid-3">
            <article className="gc-card" onPointerMove={handleCardPointerMove}>
              <div className="gc-icon">
                <svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z"></path><path d="m4 8 8 6 8-6"></path><path d="M8 19h8"></path></svg>
              </div>
              <h3>{t('auth_landing_card1_title') || 'Post-Quanten-Krypto (ML-KEM)'}</h3>
              <p>{t('auth_proof_e2ee_desc')}</p>
              <div className="gc-chip-row">
                <span className="gc-chip">ML-KEM</span>
                <span className="gc-chip">X25519</span>
              </div>
            </article>

            <article className="gc-card" onPointerMove={handleCardPointerMove}>
              <div className="gc-icon">
                <svg viewBox="0 0 24 24"><path d="M12 3 4 7v6c0 5 8 8 8 8s8-3 8-8V7z"></path><path d="m9 12 2 2 4-5"></path></svg>
              </div>
              <h3>{t('auth_landing_card2_title') || '100% Dezentral'}</h3>
              <p>{t('auth_proof_gaiaproof_desc')}</p>
              <div className="gc-chip-row">
                <span className="gc-chip">No Central Server</span>
                <span className="gc-chip">Federated</span>
              </div>
            </article>

            <article className="gc-card" onPointerMove={handleCardPointerMove}>
              <div className="gc-icon">
                <svg viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="M12 5v14"></path><circle cx="12" cy="12" r="9"></circle></svg>
              </div>
              <h3>{t('auth_landing_card3_title') || 'Zero-Knowledge'}</h3>
              <p>{t('auth_proof_gaiavault_desc')}</p>
              <div className="gc-chip-row">
                <span className="gc-chip">Local Keys</span>
                <span className="gc-chip">Self-Managed</span>
              </div>
            </article>
          </div>
        </section>

        {/* HYBRID DEFENSE */}
        <section className="gc-section">
          <div className="gc-section-title">
            <p className="gc-eyebrow">{"02 // Hybrid Defense"}</p>
            <h2>{t('auth_landing_hybrid_title') || 'Heutige Kryptografie plus Schutz gegen morgen.'}</h2>
            <p>{t('auth_landing_hybrid_desc') || 'GaiaCom kombiniert bewährten klassischen Schlüsselaustausch mit Post-Quantum-Key-Encapsulation. Kein blindes Entweder-oder — sondern Defense in Depth.'}</p>
          </div>

          <div className="gc-protocol">
            <article className="gc-code-card">
              <h3>X25519</h3>
              <p>{t('auth_landing_x25519_desc') || 'Bewährter, schneller elliptischer Schlüsselaustausch für heutige Geräte und sichere Sessions.'}</p>
              <div className="gc-code-box">
                <span className="gc-comment">{"// Classical secure channel"}</span><br />
                <span className="gc-token">curve</span> := ecdh.X25519()<br />
                sharedSecret := curve.ECDH(priv, pub)<br />
                sessionKey := HKDF(sharedSecret)
              </div>
            </article>

            <article className="gc-code-card">
              <h3>ML-KEM-1024</h3>
              <p>{t('auth_landing_mlkem_desc') || 'Post-Quantum-Key-Encapsulation für langfristige Vertraulichkeit gegen Harvest-now-decrypt-later-Szenarien.'}</p>
              <div className="gc-code-box">
                <span className="gc-comment">{"// Quantum-resistant encapsulation"}</span><br />
                ss, ct := <span className="gc-token">ML_KEM_1024</span>.Encapsulate(pk)<br />
                hybridKey := HKDF(x25519 || ss)<br />
                blob := AEAD.Encrypt(hybridKey, message)
              </div>
            </article>
          </div>
        </section>

        {/* SECURITY CYCLE */}
        <section className="gc-section">
          <div className="gc-section-title">
            <p className="gc-eyebrow">{"03 // Security Cycle"}</p>
            <h2>{t('auth_landing_cycle_title') || 'Der Server sieht nichts. Das Netzwerk transportiert nur Rauschen.'}</h2>
          </div>
          <div className="gc-flow">
            <article className="gc-step"><div className="gc-step-num">1</div><h3>{t('auth_landing_step1_title') || 'Lokale Verschlüsselung'}</h3><p>{t('auth_landing_step1_desc') || 'Die Nachricht wird auf dem Gerät des Absenders verschlüsselt — bevor sie Netzwerk oder Server erreicht.'}</p></article>
            <article className="gc-step"><div className="gc-step-num">2</div><h3>{t('auth_landing_step2_title') || 'Transport als Blob'}</h3><p>{t('auth_landing_step2_desc') || 'Das Paket reist als kryptografisches Rauschen durch Föderation, Nodes oder dezentrale Speicherlayer.'}</p></article>
            <article className="gc-step"><div className="gc-step-num">3</div><h3>{t('auth_landing_step3_title') || 'Federated Storage'}</h3><p>{t('auth_landing_step3_desc') || 'Keine zentrale Mailbox als Honigtopf. Daten liegen fragmentiert, föderiert oder dezentral verschlüsselt vor.'}</p></article>
            <article className="gc-step"><div className="gc-step-num">4</div><h3>{t('auth_landing_step4_title') || 'Lokale Entschlüsselung'}</h3><p>{t('auth_landing_step4_desc') || 'Nur der private Schlüssel des Empfängers kann den Blob wieder in Inhalt verwandeln.'}</p></article>
          </div>
        </section>

        {/* TRINITY ECOSYSTEM */}
        <section className="gc-section" id="gaiacom-trinity">
          <div className="gc-section-title">
            <p className="gc-eyebrow">{"04 // Trinity Ecosystem"}</p>
            <h2>{t('auth_landing_trinity_title') || 'Eine Protokollidee. Drei Infrastruktur-Level.'}</h2>
          </div>
          <div className="gc-trinity">
            <article className="gc-tier">
              <span className="gc-tier-label">Business</span>
              <h3>GaiaCom Enterprise</h3>
              <p>{t('auth_landing_enterprise_desc') || 'Für Unternehmen, Kanzleien, Mittelstand, Industrie und Private Banking. Geschlossene Kommunikationskreise mit administrativer Kontrolle, Compliance und Support.'}</p>
              <div className="gc-list">
                <div className="gc-list-item">{t('auth_landing_enterprise_list1') || 'Interne Souveränität und User-Verwaltung'}</div>
                <div className="gc-list-item">{t('auth_landing_enterprise_list2') || 'Self-hosted Node oder Managed Sovereign Cluster'}</div>
                <div className="gc-list-item">{t('auth_landing_enterprise_list3') || 'SLA, Support und Premium-Module'}</div>
              </div>
            </article>
            <article className="gc-tier">
              <span className="gc-tier-label">Public</span>
              <h3>GaiaCom Network</h3>
              <p>{t('auth_landing_network_desc') || 'Das offene Netz für digitale Privatsphäre. Keine Plattform für Datenhandel, sondern Infrastruktur für freie und verschlüsselte Kommunikation.'}</p>
              <div className="gc-list">
                <div className="gc-list-item">{t('auth_landing_network_list1') || 'Open Source Client'}</div>
                <div className="gc-list-item">{t('auth_landing_network_list2') || 'Föderierte Nodes'}</div>
                <div className="gc-list-item">{t('auth_landing_network_list3') || 'Kein zentraler Leseschlüssel'}</div>
              </div>
            </article>
            <article className="gc-tier">
              <span className="gc-tier-label">Government</span>
              <h3>GaiaCom Defend</h3>
              <p>{t('auth_landing_defend_desc') || 'Spezialisierte Hochsicherheits-Infrastruktur für Behörden, kritische Infrastrukturen und isolierte Kommunikationssilos.'}</p>
              <div className="gc-list">
                <div className="gc-list-item">{t('auth_landing_defend_list1') || 'Air-gapped und isolierte Deployments'}</div>
                <div className="gc-list-item">{t('auth_landing_defend_list2') || 'White Labeling und Source Code Audit'}</div>
                <div className="gc-list-item">{t('auth_landing_defend_list3') || 'Nationale digitale Souveränität'}</div>
              </div>
            </article>
          </div>
        </section>

        {/* GOVERNANCE & MODELS */}
        <section className="gc-section">
          <div className="gc-model">
            <div className="gc-section-title" style={{ textAlign: 'left', margin: 0, maxWidth: 'none' }}>
              <p className="gc-eyebrow">{"05 // Governance"}</p>
              <h2>{t('auth_landing_gov_title') || 'Open protocol. Commercial execution. Klare juristische Trennung.'}</h2>
              <p>{t('auth_landing_gov_desc') || 'GaiaCom trennt öffentliches Protokoll, offene Clients und kommerzielle Premium-Infrastruktur. Vertrauen entsteht durch Transparenz — Umsatz durch Enterprise-Betrieb, Support, Integrationen und spezialisierte Module.'}</p>
            </div>
            <div className="gc-price-grid">
              <div className="gc-price"><span>Official App</span><strong>3,69 € once</strong><p>{t('auth_landing_price1_desc') || 'Bot-Protection-Fee für AppStore/PlayStore-Verteilung.'}</p></div>
              <div className="gc-price"><span>Source Code</span><strong>0,00 €</strong><p>{t('auth_landing_price2_desc') || 'Open Source für Nutzer, die selbst kompilieren möchten.'}</p></div>
              <div className="gc-price"><span>SME Secure Business</span><strong>24k €/yr</strong><p>{t('auth_landing_price3_desc') || 'Für Mittelstand, Kanzleien und sensible Teams.'}</p></div>
              <div className="gc-price"><span>Enterprise Sovereignty</span><strong>150k €/yr+</strong><p>{t('auth_landing_price4_desc') || 'Für Konzerne, HA-Cluster, LDAP und Godmode Admin.'}</p></div>
            </div>
          </div>
        </section>

        {/* LICENSE */}
        <section className="gc-section">
          <div className="gc-license">
            <article className="gc-license-box"><h3>Client App</h3><strong>AGPLv3</strong><p>{t('auth_landing_license1_desc') || 'Maximale Transparenz für Nutzer, Forks und Community-Audits.'}</p></article>
            <article className="gc-license-box"><h3>Core Node</h3><strong>AGPLv3</strong><p>{t('auth_landing_license2_desc') || 'Copyleft-Schutz gegen Cloud-Theft und geschlossene Protokoll-Forks.'}</p></article>
            <article className="gc-license-box"><h3>Enterprise Modules</h3><strong>AGPLv3</strong><p>{t('auth_landing_license3_desc') || 'LDAP, Audit, SLA und spezialisierte Business-Logik unter offenem Copyleft.'}</p></article>
          </div>
        </section>

        {/* GAIADROP SECTION */}
        <section id="gaiadrop-section" className="gc-section">
          <div className="landing-gaiadrop gc-card" onPointerMove={handleCardPointerMove}>
            <div className="gaiadrop-info">
              <p className="gc-eyebrow">GaiaDrop</p>
              <h2>{t('auth_gaiadrop_secure_exchange') || 'Sicherer Austausch ohne Account'}</h2>
              <p className="auth-copy">{t('public_drop_desc') || 'Senden Sie verschlüsselte Nachrichten oder Dateianhänge direkt an eine GaiaID, ohne ein Konto erstellen zu müssen.'}</p>
              
              <div className="gaiadrop-benefits">
                <div className="benefit-item">
                  <span>✓</span> {t('auth_gaiadrop_benefit_e2ee') || 'Ende-zu-Ende verschlüsselt'}
                </div>
                <div className="benefit-item">
                  <span>✓</span> {t('auth_gaiadrop_benefit_no_login') || 'Kein Login erforderlich'}
                </div>
                <div className="benefit-item">
                  <span>✓</span> {t('auth_gaiadrop_benefit_inbox') || 'Direktempfang im Posteingang des Empfängers'}
                </div>
              </div>
            </div>
            
            <div className="gaiadrop-form-wrapper">
              <form onSubmit={onSubmitGaiaDrop} className="gaia-drop-public-landing">
                <div className="form-group">
                  <label>{t('public_drop_target')}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="name@gaiacom.de"
                    value={dropTargetInput}
                    onChange={event => onDropTargetChange(event.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('public_drop_sender')}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={t('public_drop_sender_placeholder') || 'Dein Name / Alias (optional)'}
                    value={dropSenderInput}
                    onChange={event => onDropSenderChange(event.target.value)}
                    autoComplete="off"
                    maxLength={80}
                  />
                </div>
                <div className="form-group">
                  <label>{t('public_drop_message')}</label>
                  <textarea
                    className="input-field message-field"
                    placeholder={t('public_drop_message_placeholder') || 'Schreibe eine sichere Nachricht...'}
                    value={dropMessageInput}
                    onChange={event => onDropMessageChange(event.target.value)}
                    maxLength={5000}
                    required
                  />
                </div>
                {dropError && <p className="form-error">{dropError}</p>}
                {dropStatus && <p className="form-success">{dropStatus}</p>}
                <button type="submit" className="gc-btn primary btn-drop-send">
                  🚀 {t('public_drop_send') || 'Sicher senden'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* FINAL REGISTRATION BRIEFING */}
        <section className="gc-section">
          <div className="gc-final">
            <p className="gc-eyebrow">GaiaCom Vision Briefing</p>
            <h2>{t('auth_landing_final_title') || 'Kommunikation nach dem Vertrauensmodell.'}</h2>
            <p>
              {t('auth_landing_final_desc') || 'GaiaCom ersetzt nicht einfach E-Mail. GaiaCom stellt die Frage, warum vertrauliche Kommunikation im Jahr der Post-Quantum-Migration noch immer auf zentralen Postfächern, lesbaren Servern und 40 Jahre alten Annahmen basiert.'}
            </p>
            <div className="gc-final-ctas">
              <button type="button" className="gc-btn primary" onClick={() => setShowAuthModal(true)}>
                🚀 {t('auth_btn_login') || 'Anmelden / Registrieren'}
              </button>
            </div>
            <p className="gc-muted-small" style={{ marginTop: '24px' }}>
              {t('auth_landing_final_note') || 'Hinweis: Diese Landingpage beschreibt eine Architekturvision und Produkt-Roadmap. Sicherheitsversprechen müssen vor produktivem Einsatz durch Implementierung, Audits und reale Tests bestätigt werden.'}
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="landing-footer gc-card" onPointerMove={handleCardPointerMove}>
          <div className="footer-gdpr">
            <strong>{t('gdpr_home_title') || '100% DSGVO-konform'}</strong>
            <p>{t('gdpr_home_desc') || 'GaiaCOM minimiert Metadaten, hält private Schlüssel lokal, verschlüsselt Inhalte Ende-zu-Ende und ermöglicht vollständige Account-Löschung.'}</p>
          </div>
          <div className="footer-links">
            <a href="https://gaiacom.de/impressum/" target="_blank" rel="noopener noreferrer">
              {t('open_privacy_imprint') || 'Impressum & Datenschutz'}
            </a>
            <button type="button" className="auth-terms-link" onClick={() => setShowTermsPopup(true)}>
              {t('auth_terms_of_use') || 'Nutzungsbedingungen'}
            </button>
          </div>
          <div className="powered-by">{t('powered_by') || 'Powered by'} {t('vision_gaia_technology') || 'VisionGaiaTechnology'}</div>
        </footer>
      </main>

      {/* AUTH OVERLAY MODAL */}
      {showAuthModal && (
        <div className="popup-overlay auth-modal-overlay">
          <div className="auth-card glass-panel auth-modal-card">
            <button 
              type="button" 
              className="auth-modal-close"
              onClick={() => setShowAuthModal(false)}
              aria-label="Schließen"
            >
              ✕
            </button>
            
            <div className="auth-header">
              <LogoMark compact />
              <p>{t('auth_secure_mail')}</p>
            </div>

            <div className="auth-card-status" aria-label="Security stack">
              <span>E2EE</span>
              <span>{t('ml_kem') || 'ML-KEM'}</span>
              <span>{t('local_keys_label') || 'LOCAL KEYS'}</span>
            </div>

            <div className="auth-tabs">
              <button 
                type="button" 
                className={`auth-tab-btn ${activeTab === 'auth' ? 'active' : ''}`}
                onClick={() => setActiveTab('auth')}
              >
                {t('auth_tab_login')}
              </button>
              <button 
                type="button" 
                className={`auth-tab-btn ${activeTab === 'drop' ? 'active' : ''}`}
                onClick={() => setActiveTab('drop')}
              >
                {t('auth_tab_drop')}
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${activeTab === 'recovery' ? 'active' : ''}`}
                onClick={() => setActiveTab('recovery')}
              >
                {t('auth_recovery_mode') || 'Recovery'}
              </button>
            </div>

            {activeTab === 'auth' ? (
              <>
                <form onSubmit={handleAuthSubmit}>
                  <div className="form-group">
                    <label>{t('auth_username')}</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={t('auth_username_placeholder')}
                      value={usernameInput}
                      onChange={event => onUsernameChange(event.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('auth_password')}</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder={t('auth_password_placeholder')}
                      value={passwordInput}
                      onChange={event => onPasswordChange(event.target.value)}
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('auth_mnemonic')}</label>
                    <textarea
                      className="input-field"
                      placeholder={t('auth_mnemonic_placeholder')}
                      value={mnemonic}
                      onChange={event => onMnemonicChange(event.target.value)}
                      autoComplete="off"
                      required
                    />
                    {isRegister && !mnemonic && (
                      <button type="button" className="btn-secondary compact-btn" onClick={onGenerateMnemonic}>
                        {t('auth_generate_seed')}
                      </button>
                    )}
                    {mnemonic && (
                      <div className="mnemonic-display">
                        {mnemonic}
                        <button type="button" className="btn-action" onClick={onCopyMnemonic}>
                          {copiedMnemonic ? t('auth_copied') : t('auth_copy_seed')}
                        </button>
                      </div>
                    )}
                  </div>

                  {authError && <p className="form-error">{authError}</p>}

                  {isRegister && (
                    <label className="auth-consent-check">
                      <input
                        type="checkbox"
                        checked={legalAccepted}
                        onChange={event => setLegalAccepted(event.target.checked)}
                        required
                      />
                      <span>
                        {t('auth_consent_privacy_terms') || 'Ich habe die Datenschutzbestimmungen und Nutzungsbedingungen gelesen und stimme ihnen zu.'}
                        {' '}
                        <button type="button" className="auth-inline-link" onClick={() => setShowTermsPopup(true)}>
                          {t('auth_terms_of_use_show') || 'Nutzungsbedingungen anzeigen'}
                        </button>
                      </span>
                    </label>
                  )}

                  <button type="submit" className="btn-primary" disabled={isRegister && !legalAccepted}>
                    {isRegister ? t('auth_btn_register') : t('auth_btn_login')}
                  </button>
                </form>

                <button type="button" className="btn-secondary" style={{ marginTop: '10px' }} onClick={onToggleMode}>
                  {isRegister ? t('auth_toggle_login') : t('auth_toggle_register')}
                </button>

                <button type="button" className="auth-recovery-mode-btn" onClick={() => setActiveTab('recovery')}>
                  {t('auth_recovery_mode') || 'Recovery Modus'}
                </button>
              </>
            ) : activeTab === 'drop' ? (
              <form onSubmit={onSubmitGaiaDrop} className="gaia-drop-public">
                <div className="profile-section-title">{t('auth_tab_drop') || 'GaiaDrop'}</div>
                <p className="auth-copy">{t('public_drop_desc')}</p>
                <div className="form-group">
                  <label>{t('public_drop_target')}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="name@gaiacom.de"
                    value={dropTargetInput}
                    onChange={event => onDropTargetChange(event.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('public_drop_sender')}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={t('public_drop_sender_placeholder')}
                    value={dropSenderInput}
                    onChange={event => onDropSenderChange(event.target.value)}
                    autoComplete="off"
                    maxLength={80}
                  />
                </div>
                <div className="form-group">
                  <label>{t('public_drop_message')}</label>
                  <textarea
                    className="input-field"
                    placeholder={t('public_drop_message_placeholder')}
                    value={dropMessageInput}
                    onChange={event => onDropMessageChange(event.target.value)}
                    maxLength={5000}
                    required
                  />
                </div>
                {dropError && <p className="form-error">{dropError}</p>}
                {dropStatus && <p className="form-success">{dropStatus}</p>}
                <button type="submit" className="btn-secondary">
                  {t('public_drop_send')}
                </button>
              </form>
            ) : (
              <div className="auth-recovery-panel">
                <div className="profile-section-title">{t('auth_recovery_import_file') || 'Recovery-Datei importieren'}</div>
                <p>
                  {t('auth_recovery_import_desc') || 'Stelle deine GaiaCom Schluessel aus einer passwortgeschuetzten Backup-Datei wieder her. Danach sind Mnemonic und Nutzername vorausgefuellt.'}
                </p>
                <input
                  type="file"
                  className="input-field"
                  accept=".json,.gaiacom-recovery.json,application/json"
                  onChange={event => setRecoveryFile(event.target.files?.[0] || null)}
                />
                <input
                  type="password"
                  className="input-field"
                  placeholder={t('auth_recovery_file_pwd_placeholder') || 'Recovery-Datei Passwort'}
                  value={recoveryPassword}
                  onChange={event => setRecoveryPassword(event.target.value)}
                  autoComplete="off"
                />
                <input
                  type="password"
                  className="input-field"
                  placeholder={t('auth_recovery_local_pwd_placeholder') || 'Neues lokales Entsperrpasswort min. 12 Zeichen'}
                  value={recoveryLocalPassword}
                  onChange={event => setRecoveryLocalPassword(event.target.value)}
                  autoComplete="new-password"
                />
                {recoveryError && <p className="form-error">{recoveryError}</p>}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRecoveryImport}
                  disabled={recoveryBusy || !recoveryFile || !recoveryPassword || !recoveryLocalPassword}
                >
                  {recoveryBusy ? (t('auth_recovery_importing') || 'Importiere...') : (t('auth_recovery_decrypt') || 'Recovery entschluesseln')}
                </button>
                <button type="button" className="auth-recovery-mode-btn" onClick={() => setActiveTab('auth')}>
                  {t('auth_back_to_login') || 'Zurueck zur Anmeldung'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showRegSuccessPopup && (
        <div className="popup-overlay" style={{ zIndex: 3000 }}>
          <div className="popup-card glass-panel success-card">
            <div className="popup-title">{t('auth_success_title')}</div>
            <div className="popup-text">
              {t('auth_success_text')}
            </div>
            <div className="crypto-value">{derivedKeys?.sign.public}</div>
            <button className="btn-primary" onClick={onCloseSuccess}>{t('auth_success_btn')}</button>
          </div>
        </div>
      )}

      {showTermsPopup && (
        <div className="popup-overlay auth-terms-overlay" style={{ zIndex: 3000 }}>
          <div className="popup-card glass-panel auth-terms-card" role="dialog" aria-modal="true" aria-labelledby="auth-terms-title">
            <div className="popup-title" id="auth-terms-title">{t('auth_terms_title') || 'GaiaCom Beta Terms of Use'}</div>
            <pre className="auth-terms-content">{GAIA_COM_BETA_TERMS_EN}</pre>
            <button className="btn-primary" onClick={() => setShowTermsPopup(false)}>{t('auth_terms_close') || 'Close'}</button>
          </div>
        </div>
      )}

      {showCookieBanner && (
        <div className="gaia-cookie-banner glass-panel" role="status" aria-live="polite">
          <div>
            <strong>{t('auth_cookie_title') || 'GaiaCOM bleibt souverän.'}</strong>
            <span>{t('auth_cookie_desc') || 'Wir verwenden nur technisch notwendige lokale Speicherfunktionen für Sprache, Session und Sicherheit. Kein Tracking, keine Werbe-Cookies, keine Drittanbieter-Profile.'}</span>
          </div>
          <button type="button" className="btn-primary compact-btn" onClick={acceptCookieBanner}>
            {t('auth_cookie_accept') || 'Verstanden'}
          </button>
        </div>
      )}
    </div>
  );
}
