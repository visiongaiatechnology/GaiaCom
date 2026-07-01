// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { Suspense, lazy } from 'react';
import ChatPane from '../chat/ChatPane';
import GroupChatPane from '../chat/GroupChatPane';

const NetworkHealthDashboard = lazy(() => import('../public/NetworkHealthDashboard'));
const DashboardPane = lazy(() => import('../chat/DashboardPane'));
const PublicChannelsPane = lazy(() => import('../chat/PublicChannelsPane'));
const ComposerPane = lazy(() => import('../chat/ComposerPane'));
const ReaderPane = lazy(() => import('../chat/ReaderPane'));
const ProfilePane = lazy(() => import('../chat/ProfilePane'));
const DrivePane = lazy(() => import('../chat/DrivePane'));
const DropPane = lazy(() => import('../chat/DropPane'));
const AbuseCenter = lazy(() => import('../chat/AbuseCenter'));
const SecurityCenter = lazy(() => import('../chat/SecurityCenter'));
const GsnPane = lazy(() => import('../chat/GsnPane'));

function PaneFallback() {
  return (
    <div className="empty-reader-pane">
      <h2>GaiaCOM</h2>
      <p style={{ maxWidth: '380px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Lade Modul...
      </p>
    </div>
  );
}

export default function AppMainContent(props) {
  const {
    hasActiveContent,
    currentMenu,
    setMobileMenuOpen,
    t,
    mailListCollapsed,
    setMailListCollapsed,
    rooms,
    contacts,
    chatMessages,
    publicChannels = [],
    inboxEmails,
    activeIdentity,
    setCurrentMenu,
    setActiveChatContact,
    setActiveRoom,
    setShowCreateGroupModal,
    displayGaiaID,
    deferredPrompt,
    handleInstallApp,
    activeChatContact,
    activeDirectTopSecret,
    setDirectTopSecretEnabled,
    presenceMap,
    chatInputText,
    setChatInputText,
    handleSendChatMessage,
    showEmojiPicker,
    setShowEmojiPicker,
    handleDeleteChatMessage,
    handleEditChatMessage,
    setInboxEmails,
    setSentEmails,
    handleClearDirectChat,
    openContactProfile,
    messageMeta,
    toggleMessagePin,
    toggleMessageSaved,
    reactToMessage,
    activeDirectUnreadMarker,
    messageReplyTarget,
    setMessageReplyTarget,
    getSenderRoles,
    activeRoom,
    channels,
    activeChannel,
    setActiveChannel,
    handleSendGroupMessage,
    chatUploadProgress,
    uploadChatFile,
    toggleBlockContact,
    handleUpdateMemberRole,
    handleLeaveRoom,
    setShowCreateChannelModal,
    triggerAlert,
    handleOpenGroupSettings,
    handleClearGroupChannel,
    activeGroupUnreadMarker,
    activePublicChannel,
    setActivePublicChannel,
    publicChannelCreatorOpen,
    setPublicChannelCreatorOpen,
    publicChannelPosts,
    publicChannelsError,
    publicChannelPostsLoading,
    createPublicChannel,
    updatePublicChannel,
    togglePublicChannelSubscription,
    createPublicChannelPost,
    togglePublicChannelPostReaction,
    createPublicChannelPostComment,
    togglePublicChannelPostPin,
    updatePublicChannelComments,
    reportChannel,
    deleteChannel,
    verifyChannel,
    discoverResults,
    discoverLoading,
    handleBlockChannel,
    handleUnblockChannel,
    handleDiscoverChannels,
    handleDeleteComment,
    handleModerateComment,
    showConfirm,
    isComposing,
    isSmtpMode,
    setIsSmtpMode,
    composeTo,
    setComposeTo,
    composeSubject,
    setComposeSubject,
    composeBody,
    setComposeBody,
    fileInputRef,
    handleFileUpload,
    uploadFile,
    uploadProgress,
    composeError,
    handleSendMail,
    setIsComposing,
    selectedMail,
    selectedMailProof,
    handleReplyMail,
    handleExportDisclosurePackage,
    handleReportMail,
    setSelectedMail,
    profileAvatar,
    setProfileAvatar,
    profileDisplayName,
    setProfileDisplayName,
    profileRealName,
    setProfileRealName,
    profileWebsite,
    setProfileWebsite,
    profileBio,
    setProfileBio,
    saveProfile,
    handleAvatarFileChange,
    currentPasswordInput,
    setCurrentPasswordInput,
    newPasswordInput,
    setNewPasswordInput,
    confirmPasswordInput,
    setConfirmPasswordInput,
    passwordChangeError,
    handleChangePassword,
    areKeysUnlocked,
    profilePasswordInput,
    setProfilePasswordInput,
    handleUnlockProfileKeys,
    profileUnlockError,
    derivedKeys,
    mnemonic,
    setAreKeysUnlocked,
    activeProfileSection,
    setActiveProfileSection,
    cryptoSessionMinutes,
    setCryptoSessionMinutes,
    inactivityLockMinutes,
    setInactivityLockMinutes,
    pinUnlockEnabled,
    handleSetUnlockPin,
    handleRemoveUnlockPin,
    webAuthnUnlockEnabled,
    handleSetWebAuthnUnlock,
    handleRemoveWebAuthnUnlock,
    handleDeleteAccount,
    handleExportRecoveryBackup,
    user,
    handleUpdatePrivacySettings,
    driveUnlocked,
    drivePasswordInput,
    setDrivePasswordInput,
    driveError,
    driveRecords,
    selectedDriveRecord,
    setSelectedDriveRecord,
    draftTitle,
    setDraftTitle,
    draftCategory,
    setDraftCategory,
    draftBody,
    setDraftBody,
    driveUploadProgress,
    handleUnlockDrive,
    handleAddNote,
    handleAddFile,
    handleDownloadFile,
    handleCloudUpload,
    prepareDriveRecordForChatShare,
    handleCloudDownload,
    handleDeleteRecord,
    handleLockDrive,
    gaiaDropInbox,
    gaiaDropLoading,
    gaiaDropError,
    selectedDrop,
    setSelectedDrop,
    loadGaiaDropInbox,
    handleDeleteDrop,
    labelsList,
    filterRules,
    mailSettings,
    isSavingDraft,
    saveFilterRule,
    saveSettings,
    fetchRooms,
    updateMailboxState,
    snoozeMail,
    saveLabel,
    slowModeCooldowns,
    pinnedMessageIds,
    handleKickMember,
    handleTransferOwnership,
    handleGetJoinRequests,
    handleModerateJoinRequest,
    handleGetModerationLogs,
    handleSearchPublicRooms,
    handleCreateRoomInviteLink,
    handleJoinViaInviteLink,
    handleCreateJoinRequest,
    joinRequests,
    moderationLogs,
    publicRoomsSearchResult
  } = props;
  const readerHiddenMenus = new Set([
    'dashboard',
    'chat',
    'profile',
    'groups',
    'vault',
    'gaiadrop',
    'network_health',
    'public_channels',
    'abuse_center',
    'security_center',
    'gsn'
  ]);
  const shouldRenderReader = !isComposing && !readerHiddenMenus.has(currentMenu);

  return (
    <>
      {/* COLUMN 3: READER / COMPOSER / PROFILE / CHAT PANE */}
      <main className={`mail-content-pane nebula-content-frame nebula-view-${currentMenu}`} style={{ position: 'relative' }}>
        <div className="nebula-content-chrome" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        {hasActiveContent && currentMenu !== 'chat' && currentMenu !== 'groups' && currentMenu !== 'public_channels' && currentMenu !== 'gaiadrop' && currentMenu !== 'vault' && currentMenu !== 'gsn' && (
          <button
            type="button"
            className="mobile-floating-menu mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
          >
            {t('menu') || 'Menu'}
          </button>
        )}
        {mailListCollapsed && (
          <button 
            className="mail-list-expand-handle"
            onClick={() => setMailListCollapsed(false)}
            title="Liste ausklappen"
            style={{
              position: 'absolute',
              left: '0',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '60px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderLeft: 'none',
              borderRadius: '0 8px 8px 0',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              fontSize: '0.8rem',
              boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            &gt;
          </button>
        )}

        {/* DASHBOARD MODE */}
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'dashboard' && (
          <DashboardPane
            rooms={rooms}
            contacts={contacts}
            chatMessages={chatMessages}
            inboxEmails={inboxEmails}
            activeIdentity={activeIdentity}
            setCurrentMenu={setCurrentMenu}
            setActiveChatContact={setActiveChatContact}
            setActiveRoom={setActiveRoom}
            setShowCreateGroupModal={setShowCreateGroupModal}
            displayGaiaID={displayGaiaID}
            deferredPrompt={deferredPrompt}
            handleInstallApp={handleInstallApp}
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

        {/* GROUP CHAT */}
        {currentMenu === 'groups' && (
          <GroupChatPane
            activeRoom={activeRoom}
            channels={channels}
            activeChannel={activeChannel}
            setActiveChannel={setActiveChannel}
            chatMessages={chatMessages}
            activeIdentity={activeIdentity}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            handleSendGroupMessage={handleSendGroupMessage}
            handleUpdateMemberRole={handleUpdateMemberRole}
            handleLeaveRoom={handleLeaveRoom}
            setShowCreateChannelModal={setShowCreateChannelModal}
            triggerAlert={triggerAlert}
            displayGaiaID={displayGaiaID}
            t={t}
            openContactProfile={openContactProfile}
            handleOpenGroupSettings={handleOpenGroupSettings}
            handleDeleteChatMessage={(msgId) => handleDeleteChatMessage(msgId, setInboxEmails, setSentEmails)}
            handleClearGroupChannel={handleClearGroupChannel}
            setActiveRoom={setActiveRoom}
            setMobileMenuOpen={setMobileMenuOpen}
            messageMeta={messageMeta}
            onToggleMessagePin={toggleMessagePin}
            onToggleMessageSaved={toggleMessageSaved}
            onReactToMessage={reactToMessage}
            unreadMarker={activeGroupUnreadMarker}
            messageReplyTarget={messageReplyTarget}
            setMessageReplyTarget={setMessageReplyTarget}
            getSenderRoles={getSenderRoles}
            contacts={contacts}
            fetchRooms={fetchRooms}
            slowModeCooldowns={slowModeCooldowns}
            pinnedMessageIds={pinnedMessageIds}
            handleKickMember={handleKickMember}
            handleTransferOwnership={handleTransferOwnership}
            handleGetJoinRequests={handleGetJoinRequests}
            handleModerateJoinRequest={handleModerateJoinRequest}
            handleGetModerationLogs={handleGetModerationLogs}
            handleSearchPublicRooms={handleSearchPublicRooms}
            handleCreateRoomInviteLink={handleCreateRoomInviteLink}
            handleJoinViaInviteLink={handleJoinViaInviteLink}
            handleCreateJoinRequest={handleCreateJoinRequest}
            joinRequests={joinRequests}
            moderationLogs={moderationLogs}
            publicRoomsSearchResult={publicRoomsSearchResult}
          />
        )}

        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'public_channels' && (
          <PublicChannelsPane
            activeIdentity={activeIdentity}
            activePublicChannel={activePublicChannel}
            setActivePublicChannel={setActivePublicChannel}
            creatorOpen={publicChannelCreatorOpen}
            setCreatorOpen={setPublicChannelCreatorOpen}
            publicChannelPosts={publicChannelPosts}
            publicChannelsError={publicChannelsError}
            publicChannelPostsLoading={publicChannelPostsLoading}
            createChannel={createPublicChannel}
            updateChannel={updatePublicChannel}
            toggleSubscription={togglePublicChannelSubscription}
            createPost={createPublicChannelPost}
            togglePostReaction={togglePublicChannelPostReaction}
            createPostComment={createPublicChannelPostComment}
            togglePostPin={togglePublicChannelPostPin}
            updateChannelComments={updatePublicChannelComments}
            reportChannel={reportChannel}
            deleteChannel={deleteChannel}
            verifyChannel={verifyChannel}
            discoverResults={discoverResults}
            discoverLoading={discoverLoading}
            handleBlockChannel={handleBlockChannel}
            handleUnblockChannel={handleUnblockChannel}
            handleDiscoverChannels={handleDiscoverChannels}
            handleDeleteComment={handleDeleteComment}
            handleModerateComment={handleModerateComment}
            showConfirm={showConfirm}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
            contacts={contacts}
          />
        )}
        </Suspense>

        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'network_health' && (
          <NetworkHealthDashboard embedded />
        )}
        </Suspense>

        {/* COMPOSER MODE */}
        <Suspense fallback={<PaneFallback />}>
        {isComposing && currentMenu !== 'chat' && currentMenu !== 'profile' && currentMenu !== 'groups' && currentMenu !== 'public_channels' && currentMenu !== 'network_health' && (
          <ComposerPane
            isSmtpMode={isSmtpMode}
            setIsSmtpMode={setIsSmtpMode}
            composeTo={composeTo}
            setComposeTo={setComposeTo}
            composeSubject={composeSubject}
            setComposeSubject={setComposeSubject}
            composeBody={composeBody}
            setComposeBody={setComposeBody}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            uploadFile={uploadFile}
            uploadProgress={uploadProgress}
            composeError={composeError}
            handleSendMail={handleSendMail}
            setIsComposing={setIsComposing}
            contacts={contacts}
            mailSettings={mailSettings}
            isSavingDraft={isSavingDraft}
            t={t}
          />
        )}
        </Suspense>

        {/* READER MODE */}
        <Suspense fallback={<PaneFallback />}>
        {shouldRenderReader && (
          <ReaderPane
            selectedMail={selectedMail}
            selectedMailProof={selectedMailProof}
            activeIdentity={activeIdentity}
            contacts={contacts}
            handleReplyMail={handleReplyMail}
            handleExportDisclosurePackage={handleExportDisclosurePackage}
            handleReportMail={handleReportMail}
            setSelectedMail={setSelectedMail}
            isComposing={isComposing}
            currentMenu={currentMenu}
            openContactProfile={openContactProfile}
            t={t}
            updateMailboxState={updateMailboxState}
            snoozeMail={snoozeMail}
            labelsList={labelsList}
            saveLabel={saveLabel}
          />
        )}
        </Suspense>

        {/* PROFILE MODE */}
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'profile' && (
          <ProfilePane
            activeIdentity={activeIdentity}
            displayGaiaID={displayGaiaID}
            profileAvatar={profileAvatar}
            setProfileAvatar={setProfileAvatar}
            profileDisplayName={profileDisplayName}
            setProfileDisplayName={setProfileDisplayName}
            profileRealName={profileRealName}
            setProfileRealName={setProfileRealName}
            profileWebsite={profileWebsite}
            setProfileWebsite={setProfileWebsite}
            profileBio={profileBio}
            setProfileBio={setProfileBio}
            saveProfile={saveProfile}
            handleAvatarFileChange={handleAvatarFileChange}
            currentPasswordInput={currentPasswordInput}
            setCurrentPasswordInput={setCurrentPasswordInput}
            newPasswordInput={newPasswordInput}
            setNewPasswordInput={setNewPasswordInput}
            confirmPasswordInput={confirmPasswordInput}
            setConfirmPasswordInput={setConfirmPasswordInput}
            passwordChangeError={passwordChangeError}
            handleChangePassword={handleChangePassword}
            areKeysUnlocked={areKeysUnlocked}
            profilePasswordInput={profilePasswordInput}
            setProfilePasswordInput={setProfilePasswordInput}
            handleUnlockProfileKeys={handleUnlockProfileKeys}
            profileUnlockError={profileUnlockError}
            derivedKeys={derivedKeys}
            mnemonic={mnemonic}
            setAreKeysUnlocked={setAreKeysUnlocked}
            setCurrentMenu={setCurrentMenu}
            t={t}
            activeSection={activeProfileSection}
            setActiveProfileSection={setActiveProfileSection}
            cryptoSessionMinutes={cryptoSessionMinutes}
            setCryptoSessionMinutes={setCryptoSessionMinutes}
            inactivityLockMinutes={inactivityLockMinutes}
            setInactivityLockMinutes={setInactivityLockMinutes}
            pinUnlockEnabled={pinUnlockEnabled}
            handleSetUnlockPin={handleSetUnlockPin}
            handleRemoveUnlockPin={handleRemoveUnlockPin}
            webAuthnUnlockEnabled={webAuthnUnlockEnabled}
            handleSetWebAuthnUnlock={handleSetWebAuthnUnlock}
            handleRemoveWebAuthnUnlock={handleRemoveWebAuthnUnlock}
            handleDeleteAccount={handleDeleteAccount}
            handleExportRecoveryBackup={handleExportRecoveryBackup}
            user={user}
            handleUpdatePrivacySettings={handleUpdatePrivacySettings}
            mailSettings={mailSettings}
            saveSettings={saveSettings}
            filterRules={filterRules}
            saveFilterRule={saveFilterRule}
            labelsList={labelsList}
          />
        )}
        </Suspense>

        {/* GAIADRIVE MODE */}
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'vault' && (
          <DrivePane
            driveUnlocked={driveUnlocked}
            drivePasswordInput={drivePasswordInput}
            setDrivePasswordInput={setDrivePasswordInput}
            driveError={driveError}
            driveRecords={driveRecords}
            selectedDriveRecord={selectedDriveRecord}
            setSelectedDriveRecord={setSelectedDriveRecord}
            draftTitle={draftTitle}
            setDraftTitle={setDraftTitle}
            draftCategory={draftCategory}
            setDraftCategory={setDraftCategory}
            draftBody={draftBody}
            setDraftBody={setDraftBody}
            driveUploadProgress={driveUploadProgress}
            handleUnlockDrive={handleUnlockDrive}
            handleLockDrive={handleLockDrive}
            handleAddNote={handleAddNote}
            handleAddFile={handleAddFile}
            handleDownloadFile={handleDownloadFile}
            handleCloudUpload={handleCloudUpload}
            handleCloudDownload={handleCloudDownload}
            handleDeleteRecord={handleDeleteRecord}
            t={t}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
        </Suspense>

        {/* GAIADROP MODE */}
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'gaiadrop' && (
          <DropPane
            gaiaDropInbox={gaiaDropInbox}
            gaiaDropLoading={gaiaDropLoading}
            gaiaDropError={gaiaDropError}
            selectedDrop={selectedDrop}
            setSelectedDrop={setSelectedDrop}
            loadGaiaDropInbox={loadGaiaDropInbox}
            activeIdentity={activeIdentity}
            displayGaiaID={displayGaiaID}
            handleDeleteDrop={handleDeleteDrop}
            t={t}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
        </Suspense>

        {/* ABUSE CENTER */}
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'abuse_center' && (
          <AbuseCenter
            activeIdentity={activeIdentity}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
            t={t}
          />
        )}
        </Suspense>

        {/* SECURITY CENTER */}
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'security_center' && (
          <SecurityCenter
            activeIdentity={activeIdentity}
            derivedKeys={derivedKeys}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
            t={t}
          />
        )}
        </Suspense>

        {/* GSN SOCIAL LAYER */}
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
      </main>
    </>
  );
}
