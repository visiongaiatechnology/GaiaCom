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
  return (
    <aside className="navigation-sidebar">
      <div className="nav-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <LogoMark compact />
          <button type="button" className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>x</button>
        </div>
        <div className="identity-section">
          <div className="identity-pill">
            <span>{activeIdentity ? (activeIdentity.DisplayName || activeIdentity.displayName || t('active_identity') || 'Aktive Identität') : 'Keine Identität'}</span>
            <small>{activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : (t('setup_profile') || 'Im Profil einrichten')}</small>
          </div>
        </div>
      </div>

      <nav className="nav-menu">
        <button className={`nav-btn ${currentMenu === 'inbox' ? 'active' : ''}`} onClick={() => { setCurrentMenu('inbox'); setIsComposing(false); setSelectedMail(null); }}>
          <Icons.Inbox /> {t('posteingang')}
          {unreadEmailsCount > 0 && <span className="unread-badge">{formatBadgeCount(unreadEmailsCount)}</span>}
        </button>
        <button className={`nav-btn ${currentMenu === 'smtp_inbox' ? 'active' : ''}`} onClick={() => { setCurrentMenu('smtp_inbox'); setIsComposing(false); setSelectedMail(null); }}>
          <Icons.Inbox /> {t('smtp_inbox_title') || 'SMTP Empfang'}
          {unreadSmtpEmailsCount > 0 && <span className="unread-badge smtp-badge">{formatBadgeCount(unreadSmtpEmailsCount)}</span>}
        </button>
        <button className={`nav-btn ${currentMenu === 'sent' ? 'active' : ''}`} onClick={() => { setCurrentMenu('sent'); setIsComposing(false); setSelectedMail(null); }}>
          <Icons.Sent /> {t('gesendet')}
        </button>
        <button className={`nav-btn ${currentMenu === 'chat' ? 'active' : ''}`} onClick={() => { setCurrentMenu('chat'); setIsComposing(false); setSelectedMail(null); if (contacts.length > 0 && !activeChatContact) { setActiveChatContact(contacts[0]); } }}>
          <Icons.Chat /> {t('quanten_chat')}
          {unreadChatsTotal > 0 && <span className="unread-badge">{formatBadgeCount(unreadChatsTotal)}</span>}
        </button>
        <button className={`nav-btn ${currentMenu === 'groups' ? 'active' : ''}`} onClick={() => { setCurrentMenu('groups'); setIsComposing(false); setSelectedMail(null); if (rooms.length > 0 && !activeRoom) { setActiveRoom(rooms[0]); } }}>
          <Icons.Groups /> {t('gruppen_chats')}
          {unreadRoomsTotal > 0 && <span className="unread-badge">{formatBadgeCount(unreadRoomsTotal)}</span>}
        </button>
        <button className={`nav-btn ${currentMenu === 'contacts' ? 'active' : ''}`} onClick={() => { setCurrentMenu('contacts'); setIsComposing(false); setSelectedMail(null); }}>
          <Icons.Contacts /> {t('adressbuch')}
        </button>
        <button className={`nav-btn ${currentMenu === 'profile' ? 'active' : ''}`} onClick={() => { setCurrentMenu('profile'); setIsComposing(false); setSelectedMail(null); if (setActiveProfileSection) { setActiveProfileSection((typeof window !== 'undefined' && window.innerWidth > 992) ? 'edit' : null); } }}>
          <Icons.Profile /> {t('mein_profil')}
        </button>
        <button className={`nav-btn ${currentMenu === 'vault' ? 'active' : ''}`} onClick={() => { setCurrentMenu('vault'); setIsComposing(false); setSelectedMail(null); }}>
          <Icons.Lock /> GaiaVault
        </button>
        <button className={`nav-btn ${currentMenu === 'gaiadrop' ? 'active' : ''}`} onClick={() => { setCurrentMenu('gaiadrop'); setIsComposing(false); setSelectedMail(null); }}>
          <Icons.Inbox /> GaiaDrop
          {unreadDropsCount > 0 && <span className="unread-badge">{formatBadgeCount(unreadDropsCount)}</span>}
        </button>
        {identities.length === 0 && (
          <button className="nav-btn" onClick={() => setShowWizard(true)}>
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
          <Icons.LogOut /> {t('logout')}
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
        Powered by <a href="https://visiongaiatechnology.de" target="_blank" rel="noopener noreferrer" className="branding-link">VisionGaiaTechnology</a>
      </div>
    </aside>
  );
};

export default NavigationSidebar;
