import React from 'react';
import ShellRail from './shell/ShellRail';

/**
 * NavigationSidebar — workspace navigation rail (VGT GLASS 2100).
 *
 * This file is the behavioural contract: it keeps every prop and callback the
 * previous sidebar consumed, all selection side effects, the mail-group
 * auto-open effects and the mobile-close behaviour. The visual composition
 * lives in `./shell/ShellRail`.
 */

const GAIA_MAIL_MENUS = [
  'inbox', 'drafts', 'sent', 'starred', 'important', 'snoozed', 'archive', 'spam', 'trash'
];
const SMTP_MAIL_MENUS = [
  'smtp_inbox', 'smtp_drafts', 'smtp_sent', 'smtp_starred', 'smtp_important',
  'smtp_snoozed', 'smtp_archive', 'smtp_spam', 'smtp_trash'
];

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

  const isGaiaMailActive = GAIA_MAIL_MENUS.includes(currentMenu);
  const isSmtpMailActive = SMTP_MAIL_MENUS.includes(currentMenu);

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
    <aside
      className="navigation-sidebar vgt-glass vgt-glass--quiet"
      aria-label={(t && t('menu')) || 'Hauptnavigation'}
    >
      <ShellRail
        t={t}
        formatBadgeCount={formatBadgeCount}
        currentMenu={currentMenu}
        activeIdentity={activeIdentity}
        identities={identities}
        displayGaiaID={displayGaiaID}
        unreadDropsCount={unreadDropsCount}
        unreadEmailsCount={unreadEmailsCount}
        unreadSmtpEmailsCount={unreadSmtpEmailsCount}
        unreadChatsTotal={unreadChatsTotal}
        unreadRoomsTotal={unreadRoomsTotal}
        gaiaMailOpen={gaiaMailOpen}
        smtpMailOpen={smtpMailOpen}
        onToggleGaiaMail={() => setGaiaMailOpen((open) => !open)}
        onToggleSmtpMail={() => setSmtpMailOpen((open) => !open)}
        onSelectFolder={(menu) => selectMenu(menu)}
        onDashboard={() => selectMenu('dashboard')}
        onChat={() => selectMenu('chat', () => {
          if (contacts.length > 0 && !activeChatContact) {
            setActiveChatContact(contacts[0]);
          }
        })}
        onGroups={() => selectMenu('groups', () => {
          if (rooms.length > 0 && !activeRoom) {
            setActiveRoom(rooms[0]);
          }
        })}
        onChannels={() => selectMenu('public_channels', () => {
          if (setPublicChannelCreatorOpen) {
            setPublicChannelCreatorOpen(false);
          }
        })}
        onGsn={() => selectMenu('gsn')}
        onNetworkHealth={() => selectMenu('network_health')}
        onSecurityCenter={() => selectMenu('security_center')}
        onAbuseCenter={() => selectMenu('abuse_center')}
        onContacts={() => selectMenu('contacts')}
        onVault={() => selectMenu('vault')}
        onGaiaDrop={() => selectMenu('gaiadrop')}
        onProfile={() => selectMenu('profile', () => {
          if (setActiveProfileSection) {
            setActiveProfileSection(
              (typeof window !== 'undefined' && window.innerWidth > 992) ? 'edit' : null
            );
          }
        })}
        onOpenIdentityAssistant={() => {
          setShowWizard(true);
          closeMobileMenu();
        }}
        onClose={closeMobileMenu}
        onOpenSecurityDetails={() => setShowQuantumShieldModal(true)}
        isLightMode={isLightMode}
        onToggleTheme={() => setIsLightMode(!isLightMode)}
        language={language}
        changeLanguage={changeLanguage}
        onLock={handleLock}
        onLogout={handleLogout}
        serverVersion={serverVersion}
        serverConsensus={serverConsensus}
      />
    </aside>
  );
};

export default NavigationSidebar;
