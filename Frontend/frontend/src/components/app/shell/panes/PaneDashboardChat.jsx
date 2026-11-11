import React, { Suspense, lazy } from 'react';
const DashboardPane = lazy(() => import('../../../aurora/DashboardHome'));
const ChatPane = lazy(() => import('../../../chat/ChatPane'));
import PaneFallback from '../PaneFallback';

/**
 * PaneDashboardChat — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneDashboardChat(props) {
  const {
    serverVersion,
    serverConsensus,
    activeChatContact,
    activeDirectTopSecret,
    activeDirectUnreadMarker,
    activeIdentity,
    chatInputText,
    chatMessages,
    chatUploadProgress,
    contacts,
    currentMenu,
    deferredPrompt,
    derivedKeys,
    displayGaiaID,
    driveRecords,
    gaiaDropInbox,
    getSenderRoles,
    handleClearDirectChat,
    handleDeleteChatMessage,
    handleEditChatMessage,
    handleInstallApp,
    handleSendChatMessage,
    inboxEmails,
    messageMeta,
    messageReplyTarget,
    openContactProfile,
    prepareDriveRecordForChatShare,
    presenceMap,
    publicChannels,
    reactToMessage,
    rooms,
    setActiveChatContact,
    setActiveRoom,
    setChatInputText,
    setCurrentMenu,
    setDirectTopSecretEnabled,
    setInboxEmails,
    setMessageReplyTarget,
    setMobileMenuOpen,
    setSentEmails,
    setShowCreateGroupModal,
    setShowEmojiPicker,
    showEmojiPicker,
    t,
    toggleBlockContact,
    toggleMessagePin,
    toggleMessageSaved,
    triggerAlert,
    uploadChatFile,
    uploadProgress,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'dashboard' && (
          <DashboardPane
            rooms={rooms}
            contacts={contacts}
            chatMessages={chatMessages}
            inboxEmails={inboxEmails}
            publicChannels={publicChannels}
            gaiaDropInbox={gaiaDropInbox}
            activeIdentity={activeIdentity}
            setCurrentMenu={setCurrentMenu}
            setActiveChatContact={setActiveChatContact}
            setActiveRoom={setActiveRoom}
            setShowCreateGroupModal={setShowCreateGroupModal}
            displayGaiaID={displayGaiaID}
            deferredPrompt={deferredPrompt}
            handleInstallApp={handleInstallApp}
            serverVersion={serverVersion}
            serverConsensus={serverConsensus}
            keysUnlocked={Boolean(derivedKeys)}
            t={t}
          />
        )}

        {/* CHAT MODE */}
        {currentMenu === 'chat' && (
          <ChatPane
            activeChatContact={activeChatContact}
            activeDirectTopSecret={activeDirectTopSecret}
            setDirectTopSecretEnabled={setDirectTopSecretEnabled}
            contactPresence={presenceMap?.[(activeChatContact?.gaiaID || '').toLowerCase()]}
            chatMessages={chatMessages}
            activeIdentity={activeIdentity}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            handleSendChatMessage={handleSendChatMessage}
            setMobileMenuOpen={setMobileMenuOpen}
            setActiveChatContact={setActiveChatContact}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            handleDeleteChatMessage={(msgId) => handleDeleteChatMessage(msgId, setInboxEmails, setSentEmails)}
            handleEditChatMessage={handleEditChatMessage}
            handleClearDirectChat={handleClearDirectChat}
            openContactProfile={openContactProfile}
            messageMeta={messageMeta}
            onToggleMessagePin={toggleMessagePin}
            onToggleMessageSaved={toggleMessageSaved}
            onReactToMessage={reactToMessage}
            messageReplyTarget={messageReplyTarget}
            setMessageReplyTarget={setMessageReplyTarget}
            t={t}
            displayGaiaID={displayGaiaID}
            getSenderRoles={getSenderRoles}
            unreadMarker={activeDirectUnreadMarker}
            uploadProgress={chatUploadProgress}
            uploadChatFile={uploadChatFile}
            driveRecords={driveRecords}
            prepareDriveRecordForChatShare={prepareDriveRecordForChatShare}
            toggleBlockContact={toggleBlockContact}
            triggerAlert={triggerAlert}
          />
        )}
        </Suspense>
    </>
  );
}
