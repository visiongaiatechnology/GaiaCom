import AppMainContent from '../AppMainContent';
import React from 'react';
import { displayGaiaID } from '../../../utils/gaiaAddress';

/*
 * Content pane host: forwards the exact AppMainContent prop set (moved verbatim) including the
 * scheduled-send props composeScheduledFor / setComposeScheduledFor (pre-existing wiring gap fixed).
 */
export default function AppContentPane({theme, ui, prefs, markers, auth, account, data, derived, boot, identity, t}) {
  const { notificationPreferences, setNotificationPreferences } = theme;
  const {
    activeIdentity, activeProfileSection, contacts, currentMenu, deferredPrompt, handleInstallApp,
    mailListCollapsed, presenceMap, publicChannelCreatorOpen, setActiveProfileSection, setCurrentMenu,
    setMailListCollapsed, setMobileMenuOpen, setPublicChannelCreatorOpen, showConfirm, triggerAlert,
  } = ui;
  const { cryptoSessionMinutes, inactivityLockMinutes, setCryptoSessionMinutes, setInactivityLockMinutes } = prefs;
  const { activeDirectUnreadMarker, activeGroupUnreadMarker, fileInputRef } = markers;
  const { derivedKeys, deviceKeyVault, mnemonic, setDeviceKeyVault, user } = auth;
  const {
    areKeysUnlocked, confirmPasswordInput, currentPasswordInput, handleAvatarFileChange,
    handleChangePassword, handleDeleteAccount, handleExportRecoveryBackup, handleRemoveUnlockPin,
    handleRemoveWebAuthnUnlock, handleSetUnlockPin, handleSetWebAuthnUnlock, handleUnlockProfileKeys,
    handleUpdatePrivacySettings, newPasswordInput, passwordChangeError, pinUnlockEnabled, profileAvatar,
    profileBio, profileDisplayName, profilePasswordInput, profileRealName, profileUnlockError,
    profileWebsite, saveProfile, setAreKeysUnlocked, setConfirmPasswordInput, setCurrentPasswordInput,
    setNewPasswordInput, setProfileAvatar, setProfileBio, setProfileDisplayName, setProfilePasswordInput,
    setProfileRealName, setProfileWebsite, webAuthnUnlockEnabled,
  } = account.profile;
  const { getSenderRoles = () => [] } = identity || {};
  const {
    draftBody, draftCategory, draftTitle, driveError, drivePasswordInput, driveRecords, driveUnlocked,
    driveUploadProgress, handleAddFile, handleAddNote, handleCloudDownload, handleCloudUpload,
    handleDeleteRecord, handleDownloadFile, handleLockDrive, handleUnlockDrive, selectedDriveRecord,
    setDraftBody, setDraftCategory, setDraftTitle, setDrivePasswordInput, setSelectedDriveRecord,
  } = data.drive;
  const { gaiaDropInbox, gaiaDropLoading, handleDeleteDrop, loadGaiaDropInbox, selectedDrop, setSelectedDrop } = data.drop;
  const {
    composeBody, composeError, composeScheduledFor, composeSubject, composeTo,
    filterRules, handleExportDisclosurePackage, handleFileUpload, handleReplyMail, handleReportMail,
    handleSendMail, inboxEmails, isComposing, isSavingDraft, isSmtpMode, labelsList, mailSettings,
    mailboxLabel, mailboxSearch, saveFilterRule, saveLabel, saveSettings, selectedMail,
    selectedMailProof, setComposeBody, setComposeReplyTo, setComposeScheduledFor, setComposeSubject, setComposeTo,
    setInboxEmails, setIsComposing, setIsSmtpMode, setMailboxLabel, setMailboxSearch,
    setSelectedMail, setSentEmails, snoozeMail, updateMailboxState, uploadFile, uploadProgress,
  } = data.emails;
  const {
    activeChannel, activeChatContact, activeDirectTopSecret, activeRoom, channels, chatInputText,
    chatMessages, chatUploadProgress, fetchRooms, handleClearDirectChat, handleClearGroupChannel,
    handleCreateJoinRequest, handleCreateRoomInviteLink, handleDeleteChatMessage, handleEditChatMessage,
    handleGetJoinRequests, handleGetModerationLogs, handleJoinViaInviteLink, handleKickMember,
    handleLeaveRoom, handleModerateJoinRequest, handleOpenGroupSettings, handleSearchPublicRooms,
    handleSendChatMessage, handleSendGroupMessage, handleToggleMessagePin, handleTransferOwnership,
    handleUpdateMemberRole, joinRequests, messageReplyTarget, moderationLogs, pinnedMessageIds,
    publicRoomsSearchResult, rooms, setActiveChannel, setActiveChatContact, setActiveRoom,
    setChatInputText, setDirectTopSecretEnabled, setMessageReplyTarget, setShowCreateChannelModal,
    setShowCreateGroupModal, setShowEmojiPicker, showEmojiPicker, slowModeCooldowns, toggleBlockContact,
    uploadChatFile,
  } = data.chat;
  const contactActions = data.contactActions;
  const { openContactProfile } = contactActions;

  // Address-book → mail handoff: start a real compose and move the workspace to
  // the mail context, so the contacts surface cannot stay mounted underneath the
  // composer (the "two panes at once" bug).
  const handleComposeContact = React.useCallback((contact) => {
    const address = displayGaiaID(contact?.gaiaID || contact?.GaiaID || '');
    if (!address) return;
    setComposeTo(address);
    setComposeSubject('');
    setComposeBody('');
    setComposeReplyTo(null);
    setSelectedMail(null);
    setIsComposing(true);
    setCurrentMenu('inbox');
  }, [displayGaiaID, setComposeTo, setComposeSubject, setComposeBody, setComposeReplyTo, setSelectedMail, setIsComposing, setCurrentMenu]);
  const { messageMeta, reactToMessage, toggleMessagePin, toggleMessageSaved } = data.messageMeta;
  const {
    activePublicChannel, createPublicChannel, createPublicChannelPost, createPublicChannelPostComment,
    deleteChannel, discoverLoading, discoverResults, handleBlockChannel, handleDeleteComment,
    handleDiscoverChannels, handleModerateComment, handleUnblockChannel, publicChannelPosts,
    publicChannelPostsLoading, publicChannels, publicChannelsError, reportChannel,
    setActivePublicChannel, togglePublicChannelPostPin, togglePublicChannelPostReaction,
    togglePublicChannelSubscription, updatePublicChannel, updatePublicChannelComments, verifyChannel,
  } = data.publicChannels;
  const { formatBadgeCount, getUnreadChatCount, getUnreadRoomCount } = derived;
  const { hasActiveContent } = boot;

  // POST-CORE task-37: the legacy `chatInputRef={fileInputRef}` pass-through from
  // baseline App.jsx (baseline App.jsx:1632) was a dead prop — it carried the
  // file-upload ref under a chat-composer name and no consumer ever read it.
  // Removed here; file upload keeps fileInputRef for its own input element.
  return (
    <AppMainContent
        serverVersion={auth?.serverVersion}
        serverConsensus={auth?.serverConsensus}
        chatUploadProgress={chatUploadProgress}
        uploadChatFile={uploadChatFile}
        toggleBlockContact={toggleBlockContact}
        slowModeCooldowns={slowModeCooldowns}
        pinnedMessageIds={pinnedMessageIds}
        onToggleMessagePin={handleToggleMessagePin}
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
        hasActiveContent={hasActiveContent}
        currentMenu={currentMenu}
        setMobileMenuOpen={setMobileMenuOpen}
        t={t}
        mailListCollapsed={mailListCollapsed}
        setMailListCollapsed={setMailListCollapsed}
        rooms={rooms}
        contacts={contacts}
        chatMessages={chatMessages}
        publicChannels={publicChannels}
        inboxEmails={inboxEmails}
        gaiaDropInbox={gaiaDropInbox}
        activeIdentity={activeIdentity}
        setCurrentMenu={setCurrentMenu}
        setActiveChatContact={setActiveChatContact}
        setActiveRoom={setActiveRoom}
        setShowCreateGroupModal={setShowCreateGroupModal}
        displayGaiaID={displayGaiaID}
        deferredPrompt={deferredPrompt}
        handleInstallApp={handleInstallApp}
        activeChatContact={activeChatContact}
        activeDirectTopSecret={activeDirectTopSecret}
        setDirectTopSecretEnabled={setDirectTopSecretEnabled}
        presenceMap={presenceMap}
        chatInputText={chatInputText}
        setChatInputText={setChatInputText}
        handleSendChatMessage={handleSendChatMessage}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        handleDeleteChatMessage={handleDeleteChatMessage}
        handleEditChatMessage={handleEditChatMessage}
        setInboxEmails={setInboxEmails}
        setSentEmails={setSentEmails}
        handleClearDirectChat={handleClearDirectChat}
        openContactProfile={openContactProfile}
        contactActions={contactActions}
        onComposeContact={handleComposeContact}
        messageMeta={messageMeta}
        toggleMessagePin={toggleMessagePin}
        toggleMessageSaved={toggleMessageSaved}
        reactToMessage={reactToMessage}
        activeDirectUnreadMarker={activeDirectUnreadMarker}
        messageReplyTarget={messageReplyTarget}
        setMessageReplyTarget={setMessageReplyTarget}
        getSenderRoles={getSenderRoles}
        activeRoom={activeRoom}
        channels={channels}
        activeChannel={activeChannel}
        setActiveChannel={setActiveChannel}
        handleSendGroupMessage={handleSendGroupMessage}
        handleUpdateMemberRole={handleUpdateMemberRole}
        handleLeaveRoom={handleLeaveRoom}
        setShowCreateChannelModal={setShowCreateChannelModal}
        triggerAlert={triggerAlert}
        handleOpenGroupSettings={handleOpenGroupSettings}
        handleClearGroupChannel={handleClearGroupChannel}
        activeGroupUnreadMarker={activeGroupUnreadMarker}
        activePublicChannel={activePublicChannel}
        setActivePublicChannel={setActivePublicChannel}
        publicChannelCreatorOpen={publicChannelCreatorOpen}
        setPublicChannelCreatorOpen={setPublicChannelCreatorOpen}
        publicChannelPosts={publicChannelPosts}
        publicChannelsError={publicChannelsError}
        publicChannelPostsLoading={publicChannelPostsLoading}
        createPublicChannel={createPublicChannel}
        updatePublicChannel={updatePublicChannel}
        togglePublicChannelSubscription={togglePublicChannelSubscription}
        createPublicChannelPost={createPublicChannelPost}
        togglePublicChannelPostReaction={togglePublicChannelPostReaction}
        createPublicChannelPostComment={createPublicChannelPostComment}
        togglePublicChannelPostPin={togglePublicChannelPostPin}
        updatePublicChannelComments={updatePublicChannelComments}
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
        isComposing={isComposing}
        isSmtpMode={isSmtpMode}
        setIsSmtpMode={setIsSmtpMode}
        composeTo={composeTo}
        setComposeTo={setComposeTo}
        composeSubject={composeSubject}
        setComposeSubject={setComposeSubject}
        composeBody={composeBody}
        setComposeBody={setComposeBody}
        composeScheduledFor={composeScheduledFor}
        setComposeScheduledFor={setComposeScheduledFor}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        uploadFile={uploadFile}
        uploadProgress={uploadProgress}
        composeError={composeError}
        handleSendMail={handleSendMail}
        setIsComposing={setIsComposing}
        selectedMail={selectedMail}
        selectedMailProof={selectedMailProof}
        handleReplyMail={handleReplyMail}
        handleExportDisclosurePackage={handleExportDisclosurePackage}
        handleReportMail={handleReportMail}
        setSelectedMail={setSelectedMail}
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
        deviceKeyVault={deviceKeyVault}
        setDeviceKeyVault={setDeviceKeyVault}
        setAreKeysUnlocked={setAreKeysUnlocked}
        activeProfileSection={activeProfileSection}
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
        notificationPreferences={notificationPreferences}
        setNotificationPreferences={setNotificationPreferences}
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
        gaiaDropInbox={gaiaDropInbox}
        selectedDrop={selectedDrop}
        setSelectedDrop={setSelectedDrop}
        loadGaiaDropInbox={loadGaiaDropInbox}
        gaiaDropLoading={gaiaDropLoading}
        handleDeleteDrop={handleDeleteDrop}
        getUnreadChatCount={getUnreadChatCount}
        getUnreadRoomCount={getUnreadRoomCount}
        formatBadgeCount={formatBadgeCount}
        fetchRooms={fetchRooms}
        mailboxSearch={mailboxSearch}
        setMailboxSearch={setMailboxSearch}
        mailboxLabel={mailboxLabel}
        setMailboxLabel={setMailboxLabel}
        labelsList={labelsList}
        filterRules={filterRules}
        mailSettings={mailSettings}
        isSavingDraft={isSavingDraft}
        updateMailboxState={updateMailboxState}
        snoozeMail={snoozeMail}
        saveLabel={saveLabel}
        saveFilterRule={saveFilterRule}
        saveSettings={saveSettings}
      />
  );
}
