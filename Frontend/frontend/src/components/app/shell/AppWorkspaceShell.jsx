import AppContentPane from './AppContentPane';
import AppListPane from './AppListPane';
import AppOverlayLayer from './AppOverlayLayer';
import AppRail from './AppRail';
import AuroraTopBar from '../../aurora/AuroraTopBar';
import AuroraStatusBar from '../../aurora/AuroraStatusBar';
import FirstRunOnboarding from '../../onboarding/FirstRunOnboarding';
import LogoMark from '../../layout/LogoMark';
import MobileNavigationDock from '../../layout/MobileNavigationDock';
import React from 'react';
import { displayGaiaID } from '../../../utils/gaiaAddress';

/*
 * Workspace shell composition: boot/veil/onboarding chrome, app-container state classes and the
 * rail/list/content/overlay children. The exact JSX of the previous App.jsx return is kept.
 */
export default function AppWorkspaceShell({theme, ui, prefs, markers, auth, account, data, derived, boot, identity, language, changeLanguage, t}) {
  const { isLightMode } = theme;
  const {
    activeIdentity, contacts, currentMenu, mobileMenuOpen, setCurrentMenu, setMobileMenuOpen,
    setPublicChannelCreatorOpen,
  } = ui;
  const { showBootSequence } = markers;
  const { profileAvatar, profileDisplayName, saveProfileData } = account.profile;
  const { showTransition, transitionText } = account;
  const { setIsComposing, setSelectedMail } = data.emails;
  const { rooms, setActiveChatContact, setActiveRoom } = data.chat;
  const { formatBadgeCount, unreadChatsTotal, unreadEmailsCount, unreadRoomsTotal } = derived;
  const { closeFirstRunOnboarding, hasActiveContent, openOnboardingDestination, showFirstRunOnboarding } = boot;
  const isGsn = ui.currentMenu === 'gsn';
  const contentWide = ui.mailListCollapsed || ui.currentMenu === 'dashboard' ||
    ui.currentMenu === 'network_health' || ui.currentMenu === 'abuse_center' ||
    ui.currentMenu === 'security_center' || isGsn;

  return (
    <>
      {showBootSequence && (
        <div className="vgt-boot" aria-hidden="true">
          <div className="vgt-boot__inner">
            <LogoMark size={40} />
            <p className="vgt-boot__caption">
              {t('startup_boot') || 'GaiaCom wird initialisiert'}
            </p>
          </div>
        </div>
      )}

      {showTransition && (
        <div className="vgt-switch-veil" aria-hidden="true">
          <div className="vgt-switch-veil__inner">
            <LogoMark size={36} />
            <p className="vgt-switch-veil__text">{transitionText}</p>
          </div>
        </div>
      )}

      {showFirstRunOnboarding && !showTransition && (
        <FirstRunOnboarding
          activeIdentity={activeIdentity}
          displayGaiaID={displayGaiaID}
          profileDisplayName={profileDisplayName}
          profileAvatar={profileAvatar}
          onProfileSave={(profileData) => saveProfileData(profileData, { silent: true })}
          onComplete={closeFirstRunOnboarding}
          onSkip={closeFirstRunOnboarding}
          onOpenInbox={() => openOnboardingDestination('inbox')}
          onOpenChat={() => openOnboardingDestination('chat')}
          onOpenChannels={() => openOnboardingDestination('public_channels', () => setPublicChannelCreatorOpen(false))}
          onOpenSecurity={() => openOnboardingDestination('security_center')}
        />
      )}

      <a className="vgt-skip-link" href="#vgt-workspace-main">
        {t('skip_to_content') || 'Zum Arbeitsbereich springen'}
      </a>

      <div className={`app-container ${isLightMode ? 'light-mode' : 'dark-mode'} ${hasActiveContent ? 'has-active-content mobile-content-active' : ''} ${contentWide ? 'mail-list-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <AuroraTopBar
          currentMenu={currentMenu}
          setCurrentMenu={setCurrentMenu}
          activeIdentity={activeIdentity}
          displayGaiaID={displayGaiaID}
          serverVersion={auth?.serverVersion}
          serverConsensus={auth?.serverConsensus}
          isComposing={data?.emails?.isComposing}
          profileAvatar={profileAvatar}
          unreadCount={unreadEmailsCount + unreadChatsTotal + unreadRoomsTotal}
          onLockVault={auth?.handleLock}
          onLogout={auth?.handleLogout}
        />
        {/* COLUMN 1: NAVIGATION SIDEBAR */}
            <AppRail theme={theme} ui={ui} auth={auth} data={data} derived={derived} language={language} changeLanguage={changeLanguage} t={t} />

      {/* COLUMN 2: LIST PANE */}
      {!contentWide && (
                <AppListPane ui={ui} auth={auth} data={data} derived={derived} t={t} />
      )}

            <AppContentPane theme={theme} ui={ui} prefs={prefs} markers={markers} auth={auth} account={account} data={data} derived={derived} boot={boot} identity={identity} t={t} />

            <AppOverlayLayer ui={ui} markers={markers} auth={auth} data={data} t={t} />
      <MobileNavigationDock
        currentMenu={currentMenu}
        setCurrentMenu={setCurrentMenu}
        setIsComposing={setIsComposing}
        setSelectedMail={setSelectedMail}
        setActiveChatContact={setActiveChatContact}
        setActiveRoom={setActiveRoom}
        setMobileMenuOpen={setMobileMenuOpen}
        contacts={contacts}
        rooms={rooms}
        unreadEmailsCount={unreadEmailsCount}
        unreadChatsTotal={unreadChatsTotal}
        unreadRoomsTotal={unreadRoomsTotal}
        formatBadgeCount={formatBadgeCount}
        t={t}
      />
      <AuroraStatusBar serverVersion={auth?.serverVersion} serverConsensus={auth?.serverConsensus} />
      </div>
    </>
  );
}
