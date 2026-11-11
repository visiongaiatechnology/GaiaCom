import NavigationSidebar from '../../layout/NavigationSidebar';
import React from 'react';
import { displayGaiaID } from '../../../utils/gaiaAddress';

/*
 * Navigation rail host: forwards the exact NavigationSidebar prop set (moved verbatim).
 */
export default function AppRail({theme, ui, auth, data, derived, language, changeLanguage, t}) {
  const { isLightMode, setIsLightMode } = theme;
  const {
    activeIdentity, contacts, currentMenu, identities, setActiveProfileSection, setCurrentMenu,
    setMobileMenuOpen, setPublicChannelCreatorOpen, setShowQuantumShieldModal,
  } = ui;
  const { handleLock, handleLogout, serverConsensus, serverVersion, setShowWizard } = auth;
  const { setIsComposing, setSelectedMail } = data.emails;
  const { activeChatContact, activeRoom, rooms, setActiveChatContact, setActiveRoom } = data.chat;
  const {
    formatBadgeCount, unreadChatsTotal, unreadDropsCount, unreadEmailsCount, unreadRoomsTotal,
    unreadSmtpEmailsCount,
  } = derived;

  return (
    <NavigationSidebar
        setActiveProfileSection={setActiveProfileSection}
        activeIdentity={activeIdentity}
        unreadDropsCount={unreadDropsCount}
        displayGaiaID={displayGaiaID}
        currentMenu={currentMenu}
        setCurrentMenu={setCurrentMenu}
        setIsComposing={setIsComposing}
        setSelectedMail={setSelectedMail}
        unreadEmailsCount={unreadEmailsCount}
        unreadSmtpEmailsCount={unreadSmtpEmailsCount}
        unreadChatsTotal={unreadChatsTotal}
        unreadRoomsTotal={unreadRoomsTotal}
        contacts={contacts}
        activeChatContact={activeChatContact}
        setActiveChatContact={setActiveChatContact}
        rooms={rooms}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        setPublicChannelCreatorOpen={setPublicChannelCreatorOpen}
        identities={identities}
        setShowWizard={setShowWizard}
        isLightMode={isLightMode}
        setIsLightMode={setIsLightMode}
        language={language}
        changeLanguage={changeLanguage}
        handleLock={handleLock}
        handleLogout={handleLogout}
        setShowQuantumShieldModal={setShowQuantumShieldModal}
        serverVersion={serverVersion}
        serverConsensus={serverConsensus}
        setMobileMenuOpen={setMobileMenuOpen}
        t={t}
        formatBadgeCount={formatBadgeCount}
      />
  );
}
