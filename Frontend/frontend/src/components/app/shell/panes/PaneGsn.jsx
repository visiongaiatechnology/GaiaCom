import React, { Suspense, lazy } from 'react';
const GsnPane = lazy(() => import('../../../chat/GsnPane'));
import PaneFallback from '../PaneFallback';

/**
 * PaneGsn — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneGsn(props) {
  const {
    activeChatContact,
    activeIdentity,
    chatInputText,
    chatMessages,
    contacts,
    currentMenu,
    derivedKeys,
    handleSendChatMessage,
    publicChannels,
    rooms,
    setActiveChatContact,
    setActivePublicChannel,
    setActiveRoom,
    setChatInputText,
    setCurrentMenu,
    setMobileMenuOpen,
    showConfirm,
    t,
    triggerAlert,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'gsn' && (
          <GsnPane
            activeIdentity={activeIdentity}
            derivedKeys={derivedKeys}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
            t={t}
            showConfirm={showConfirm}
            rooms={rooms}
            contacts={contacts}
            publicChannels={publicChannels}
            setCurrentMenu={setCurrentMenu}
            activeChatContact={activeChatContact}
            setActiveChatContact={setActiveChatContact}
            chatMessages={chatMessages}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            handleSendChatMessage={handleSendChatMessage}
            setActiveRoom={setActiveRoom}
            setActivePublicChannel={setActivePublicChannel}
          />
        )}
        </Suspense>
    </>
  );
}
