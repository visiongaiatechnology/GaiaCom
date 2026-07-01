// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import LogoMark from './LogoMark';
import VersionBadge from './VersionBadge';
import Icons from '../common/Icons';
import { languageOptions } from '../../utils/i18n';

export const NavigationSidebar = ({
  activeIdentity,
  unreadDropsCount,
  displayGaiaID,
  currentMenu,
  setCurrentMenu,
  setIsComposing,
  setSelectedMail,
  unreadEmailsCount,
  unreadSmtpEmailsCount,
  unreadChatsTotal,
  unreadRoomsTotal,
  contacts,
  activeChatContact,
  setActiveChatContact,
  rooms,
  activeRoom,
  setActiveRoom,
  setPublicChannelCreatorOpen,
  identities,
  setShowWizard,
  isLightMode,
  setIsLightMode,
  language,
  changeLanguage,
  handleLock,
  handleLogout,
  setShowQuantumShieldModal,
  serverVersion,
  serverConsensus,
  setMobileMenuOpen,
  t,
  formatBadgeCount,
  setActiveProfileSection
}) => {
  const [gaiaMailOpen, setGaiaMailOpen] = React.useState(false);
  const [smtpMailOpen, setSmtpMailOpen] = React.useState(false);

  const isGaiaMailActive = ['inbox', 'drafts', 'sent', 'starred', 'important', 'snoozed', 'archive', 'spam', 'trash'].includes(currentMenu);
  const isSmtpMailActive = ['smtp_inbox', 'smtp_drafts', 'smtp_sent', 'smtp_starred', 'smtp_important', 'smtp_snoozed', 'smtp_archive', 'smtp_spam', 'smtp_trash'].includes(currentMenu);

  React.useEffect(() => {
    if (isGaiaMailActive) setGaiaMailOpen(true);
  }, [isGaiaMailActive]);

  React.useEffect(() => {
    if (isSmtpMailActive) setSmtpMailOpen(true);
  }, [isSmtpMailActive]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const selectMenu = (menu, afterSelect) => {
    setCurrentMenu(menu);
    setIsComposing(false);
    setSelectedMail(null);
    if (afterSelect) {
      afterSelect();
    }
    closeMobileMenu();
  };

  return (
    <aside className="navigation-sidebar gaia-scrollbar">
      <div className="nav-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <LogoMark />
          <button type="button" className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>x</button>
        </div>
        <div className="identity-section" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', background: 'rgba(0, 242, 254, 0.02)', marginBottom: '14px' }}>
          <div className="identity-card-header" style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
            {t('session_secure') || 'STATUS: SECURE'}
          </div>
          <div className="identity-card-name" style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeIdentity ? `@${activeIdentity.DisplayName || activeIdentity.displayName}`.replace('@@', '@') : '@Gast'}
          </div>
          <div className="identity-card-status" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)', display: 'inline-block' }}></span>
            <span>{t('encrypted') || 'Verschlüsselt'}</span>
          </div>
        </div>
      </div>

      <nav className="nav-menu">
        <button className={`nav-btn ${currentMenu === 'dashboard' ? 'active' : ''}`} onClick={() => selectMenu('dashboard')}>
          <Icons.Activity /> {t('dashboard') || 'Dashboard'}
        </button>
        {/* GaiaMail Dropdown */}
        <div className="nav-dropdown-wrapper">
          <button 
            type="button"
            className={`nav-btn nav-dropdown-toggle ${isGaiaMailActive ? 'active' : ''}`}
            onClick={() => setGaiaMailOpen(!gaiaMailOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icons.Inbox />
              <span>GaiaMail</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              {unreadEmailsCount > 0 && <span className="unread-badge">{formatBadgeCount(unreadEmailsCount)}</span>}
              <span style={{ fontSize: '0.7rem' }}>{gaiaMailOpen ? '▼' : '▶'}</span>
            </div>
          </button>
          {gaiaMailOpen && (
            <div className="nav-dropdown-sub">
              <button className={`nav-sub-btn ${currentMenu === 'inbox' ? 'active' : ''}`} onClick={() => selectMenu('inbox')}>
                📥 {t('posteingang') || 'Inbox'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'drafts' ? 'active' : ''}`} onClick={() => selectMenu('drafts')}>
                📝 {t('entwuerfe') || 'Drafts'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'sent' ? 'active' : ''}`} onClick={() => selectMenu('sent')}>
                📤 {t('gesendet') || 'Sent'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'starred' ? 'active' : ''}`} onClick={() => selectMenu('starred')}>
                ★ {t('markiert') || 'Starred'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'important' ? 'active' : ''}`} onClick={() => selectMenu('important')}>
                🏷️ {t('wichtig') || 'Important'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'snoozed' ? 'active' : ''}`} onClick={() => selectMenu('snoozed')}>
                ⏱ {t('snoozed') || 'Snoozed'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'archive' ? 'active' : ''}`} onClick={() => selectMenu('archive')}>
                📁 {t('archiv') || 'Archive'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'spam' ? 'active' : ''}`} onClick={() => selectMenu('spam')}>
                ⚠️ {t('spam') || 'Spam'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'trash' ? 'active' : ''}`} onClick={() => selectMenu('trash')}>
                🗑️ {t('papierkorb') || 'Trash'}
              </button>
            </div>
          )}
        </div>

        {/* SMTP Mail Dropdown */}
        <div className="nav-dropdown-wrapper">
          <button 
            type="button"
            className={`nav-btn nav-dropdown-toggle ${isSmtpMailActive ? 'active' : ''}`}
            onClick={() => setSmtpMailOpen(!smtpMailOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icons.Inbox />
              <span>SMTP Mail</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              {unreadSmtpEmailsCount > 0 && <span className="unread-badge smtp-badge">{formatBadgeCount(unreadSmtpEmailsCount)}</span>}
              <span style={{ fontSize: '0.7rem' }}>{smtpMailOpen ? '▼' : '▶'}</span>
            </div>
          </button>
          {smtpMailOpen && (
            <div className="nav-dropdown-sub">
              <button className={`nav-sub-btn ${currentMenu === 'smtp_inbox' ? 'active' : ''}`} onClick={() => selectMenu('smtp_inbox')}>
                📥 {t('posteingang') || 'Inbox'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'smtp_drafts' ? 'active' : ''}`} onClick={() => selectMenu('smtp_drafts')}>
                📝 {t('entwuerfe') || 'Drafts'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'smtp_sent' ? 'active' : ''}`} onClick={() => selectMenu('smtp_sent')}>
                📤 {t('gesendet') || 'Sent'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'smtp_starred' ? 'active' : ''}`} onClick={() => selectMenu('smtp_starred')}>
                ★ {t('markiert') || 'Starred'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'smtp_important' ? 'active' : ''}`} onClick={() => selectMenu('smtp_important')}>
                🏷️ {t('wichtig') || 'Important'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'smtp_snoozed' ? 'active' : ''}`} onClick={() => selectMenu('smtp_snoozed')}>
                ⏱ {t('snoozed') || 'Snoozed'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'smtp_archive' ? 'active' : ''}`} onClick={() => selectMenu('smtp_archive')}>
                📁 {t('archiv') || 'Archive'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'smtp_spam' ? 'active' : ''}`} onClick={() => selectMenu('smtp_spam')}>
                ⚠️ {t('spam') || 'Spam'}
              </button>
              <button className={`nav-sub-btn ${currentMenu === 'smtp_trash' ? 'active' : ''}`} onClick={() => selectMenu('smtp_trash')}>
                🗑️ {t('papierkorb') || 'Trash'}
              </button>
            </div>
          )}
        </div>
        <button className={`nav-btn ${currentMenu === 'chat' ? 'active' : ''}`} onClick={() => selectMenu('chat', () => { if (contacts.length > 0 && !activeChatContact) { setActiveChatContact(contacts[0]); } })}>
          <Icons.Chat /> {t('quanten_chat')}
          {unreadChatsTotal > 0 && <span className="unread-badge">{formatBadgeCount(unreadChatsTotal)}</span>}
        </button>
        <button className={`nav-btn ${currentMenu === 'groups' ? 'active' : ''}`} onClick={() => selectMenu('groups', () => { if (rooms.length > 0 && !activeRoom) { setActiveRoom(rooms[0]); } })}>
          <Icons.Groups /> {t('gruppen_chats')}
          {unreadRoomsTotal > 0 && <span className="unread-badge">{formatBadgeCount(unreadRoomsTotal)}</span>}
        </button>
        <button className={`nav-btn ${currentMenu === 'public_channels' ? 'active' : ''}`} onClick={() => selectMenu('public_channels', () => { if (setPublicChannelCreatorOpen) { setPublicChannelCreatorOpen(false); } })}>
          <Icons.Broadcast /> Channels
        </button>
        <button className={`nav-btn ${currentMenu === 'gsn' ? 'active' : ''}`} onClick={() => selectMenu('gsn')}>
          <Icons.Activity /> GSN Social
        </button>
        <button className={`nav-btn ${currentMenu === 'network_health' ? 'active' : ''}`} onClick={() => selectMenu('network_health')}>
          <Icons.Activity /> Network Health
        </button>
        <button className={`nav-btn ${currentMenu === 'security_center' ? 'active' : ''}`} onClick={() => selectMenu('security_center')}>
          <Icons.Shield /> Security Center
        </button>
        <button className={`nav-btn ${currentMenu === 'abuse_center' ? 'active' : ''}`} onClick={() => selectMenu('abuse_center')}>
          <Icons.Alert /> {t('abuse_center_title') || 'Abuse Center'}
        </button>
        <button className={`nav-btn ${currentMenu === 'contacts' ? 'active' : ''}`} onClick={() => selectMenu('contacts')}>
          <Icons.Contacts /> {t('adressbuch')}
        </button>
        <button className={`nav-btn ${currentMenu === 'profile' ? 'active' : ''}`} onClick={() => selectMenu('profile', () => { if (setActiveProfileSection) { setActiveProfileSection((typeof window !== 'undefined' && window.innerWidth > 992) ? 'edit' : null); } })}>
          <Icons.Profile /> {t('mein_profil')}
        </button>
        <button className={`nav-btn ${currentMenu === 'vault' ? 'active' : ''}`} onClick={() => selectMenu('vault')}>
          <Icons.Lock /> {t('gaiadrive') || 'GaiaDrive'}
        </button>
        <button className={`nav-btn ${currentMenu === 'gaiadrop' ? 'active' : ''}`} onClick={() => selectMenu('gaiadrop')}>
          <Icons.Inbox /> {t('drop_title') || 'GaiaDrop'}
          {unreadDropsCount > 0 && <span className="unread-badge">{formatBadgeCount(unreadDropsCount)}</span>}
        </button>
        {identities.length === 0 && (
          <button className="nav-btn" onClick={() => { setShowWizard(true); closeMobileMenu(); }}>
            <Icons.Identities /> {t('identitaets_assistent')}
          </button>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <button className="theme-toggle-btn" onClick={() => setIsLightMode(!isLightMode)} style={{ width: '100%' }}>
            {isLightMode ? (t('dunkler_modus') || 'Dunkler Modus').trim() : (t('heller_modus') || 'Heller Modus').trim()}
          </button>
          <div className="language-selector-row">
            <select
              className="language-dropdown sidebar-language-dropdown"
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
        </div>
        
        <button className="nav-btn" style={{ marginTop: '10px', color: 'var(--warning)' }} onClick={handleLock}>
          <Icons.Lock /> {t('sperren')}
        </button>
        
        <button className="nav-btn" style={{ marginTop: '10px', color: 'var(--danger)' }} onClick={handleLogout}>
          <Icons.LogOut /> {t('system_verlassen') || 'System verlassen'}
        </button>
      </nav>

      {/* Quantum Shield status widget */}
      <div className="quantum-gauge" style={{ cursor: 'pointer' }} onClick={() => setShowQuantumShieldModal(true)}>
        <div className="gauge-header">{(t('quantum_shield_status') || 'Quantum Shield Status').trim()}</div>
        <div className="gauge-bar">
          <div className="gauge-fill"></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span>{t('post_quantum_e2e')}</span>
          <span style={{ color: 'var(--success)' }}>{t('aktiviert')}</span>
        </div>
      </div>

      <div className="branding-footer">
        <VersionBadge version={serverVersion} consensus={serverConsensus} />
        {t('powered_by') || 'Powered by'} <a href="https://visiongaiatechnology.de" target="_blank" rel="noopener noreferrer" className="branding-link">{t('vision_gaia_technology') || 'VisionGaiaTechnology'}</a>
      </div>
    </aside>
  );
};

export default NavigationSidebar;
