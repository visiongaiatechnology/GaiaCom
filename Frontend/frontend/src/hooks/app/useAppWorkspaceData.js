import useDrive from '../useDrive';
import useGaiaDrop from '../useGaiaDrop';
import useChat from '../useChat';
import useEmails from '../useEmails';
import usePublicChannels from '../usePublicChannels';
import { usePresence } from '../usePresence';
import { useMessageMeta } from '../useMessageMeta';
import { useUnreadMarkers } from '../useUnreadMarkers';
import { useChatNotifications, useChatNotificationPrimer } from '../useChatNotifications';
import { useInactivityLock } from '../useInactivityLock';
import { useKeyChangeDetection } from '../useKeyChangeDetection';
import { useContactActions } from '../../utils/useContactActions';

/* Workspace data hooks (drive/drop/mail/chat/channels) + presence/notifications/locks/markers (moved verbatim). */
export default function useAppWorkspaceData({ auth, ui, theme, prefs, markers, account, t, resetRef }) {
  const { user, derivedKeys, deviceKeyVault, isLocked, handleLock } = auth;
  const {
    activeIdentity, contacts, setContacts, currentMenu, triggerAlert, showConfirm,
    showConfirmThreeButtons, setPresenceMap, setIdentities, setActiveIdentity
  } = ui;
  const { notificationPreferences } = theme;
  const { inactivityLockMinutes } = prefs;
  const {
    contactProfile, setContactProfile, keyChangeWarning, setKeyChangeWarning, setKeyChangeConfirmInput,
    chatKeyCheckRef, knownChatNotificationIdsRef, chatNotificationsPrimedRef,
    setActiveDirectUnreadMarker, setActiveGroupUnreadMarker,
    directUnreadSnapshotKeyRef, groupUnreadSnapshotKeyRef
  } = markers;
  const { verifyRecipientsAndRun } = account;

  // 2. GaiaDrive Hook
  const {
    driveUnlocked,
    drivePasswordInput, setDrivePasswordInput,
    driveError,
    driveRecords,
    selectedDriveRecord, setSelectedDriveRecord,
    draftTitle, setDraftTitle,
    draftCategory, setDraftCategory,
    draftBody, setDraftBody,
    driveUploadProgress,
    handleUnlockDrive,
    handleLockDrive,
    handleAddNote,
    handleAddFile,
    handleDownloadFile,
    handleCloudUpload,
    prepareDriveRecordForChatShare,
    handleCloudDownload,
    handleDeleteRecord
  } = useDrive({ user, triggerAlert });

  // 3. GaiaDrop Hook
  const {
    dropTargetInput, setDropTargetInput,
    dropSenderInput, setDropSenderInput,
    dropMessageInput, setDropMessageInput,
    dropStatus,
    dropError,
    gaiaDropInbox,
    gaiaDropLoading,
    selectedDrop, setSelectedDrop,
    handleSubmitPublicGaiaDrop,
    loadGaiaDropInbox,
    handleSelectDrop,
    handleDeleteDrop
  } = useGaiaDrop({
    activeIdentity,
    derivedKeys,
    triggerAlert,
    showConfirm,
    t
  });

  // 4. Emails Hook
  const {
    inboxEmails, setInboxEmails,
    setSentEmails,
    selectedMail, setSelectedMail,
    selectedMailProof,
    isComposing, setIsComposing,
    composeTo, setComposeTo,
    composeSubject, setComposeSubject,
    composeBody, setComposeBody,
    setComposeReplyTo,
    composeScheduledFor, setComposeScheduledFor,
    isSmtpMode, setIsSmtpMode,
    composeError,
    uploadProgress,
    uploadFile,
    pollEmails,
    handleSendMail,
    handleReplyMail,
    handleFileUpload,
    handleReportMail,
    handleExportDisclosurePackage,
    markMessagesAsRead,

    // New mailbox state exports
    allMails,
    mailThreads,
    mailboxFolder, setMailboxFolder,
    mailboxSearch, setMailboxSearch,
    mailboxLabel, setMailboxLabel,
    labelsList,
    draftsList,
    filterRules,
    mailSettings,
    isSavingDraft,
    updateMailboxState,
    snoozeMail,
    saveLabel,
    saveFilterRule,
    saveSettings,
    activeDraftIdRef
  } = useEmails({
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    contacts,
    setContacts,
    user,
    triggerAlert,
    showConfirm,
    t,
    notificationPreferences,
    setChatMessages: (chats) => setChatMessages(chats),
    verifyRecipientsAndRun
  });

  // 5. Chat Hook
  const {
    rooms, setRooms,
    activeRoom, setActiveRoom,
    channels, setChannels,
    activeChannel, setActiveChannel,
    showCreateGroupModal, setShowCreateGroupModal,
    showJoinGroupModal, setShowJoinGroupModal,
    showCreateChannelModal, setShowCreateChannelModal,
    showGroupSettingsModal, setShowGroupSettingsModal,
    groupNameInput, setGroupNameInput,
    groupDescriptionInput, setGroupDescriptionInput,
    groupAvatarInput, setGroupAvatarInput,
    isCrisisRoomInput, setIsCrisisRoomInput,
    editGroupName, setEditGroupName,
    editGroupDescription, setEditGroupDescription,
    editGroupAvatar, setEditGroupAvatar,
    editGroupIsCrisis, setEditGroupIsCrisis,
    editGroupIsPrivate, setEditGroupIsPrivate,
    editGroupReadOnly, setEditGroupReadOnly,
    editGroupSlowModeSeconds, setEditGroupSlowModeSeconds,
    editGroupTopSecret, setEditGroupTopSecret,
    joinGroupHashInput, setJoinGroupHashInput,
    newChannelNameInput, setNewChannelNameInput,

    chatMessages, setChatMessages,
    activeChatContact, setActiveChatContact,
    activeDirectTopSecret,
    setDirectTopSecretEnabled,
    chatInputText, setChatInputText,
    showEmojiPicker, setShowEmojiPicker,
    messageReplyTarget, setMessageReplyTarget,
    fetchRooms,
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleCreateChannel,
    handleUpdateMemberRole,
    handleOpenGroupSettings,
    handleUpdateGroupSettings,
    handleDeleteGroup,
    handleSendChatMessage,
    handleSendGroupMessage,
    handleDeleteChatMessage,
    handleEditChatMessage,
    handleClearDirectChat,
    handleClearGroupChannel,
    uploadProgress: chatUploadProgress,
    uploadChatFile,
    toggleBlockContact,
    slowModeCooldowns,
    pinnedMessageIds,
    joinRequests,
    moderationLogs,
    publicRoomsSearchResult,
    handleToggleMessagePin,
    handleKickMember,
    handleTransferOwnership,
    handleGetJoinRequests,
    handleModerateJoinRequest,
    handleGetModerationLogs,
    handleSearchPublicRooms,
    handleCreateRoomInviteLink,
    handleJoinViaInviteLink,
    handleCreateJoinRequest
  } = useChat({
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    contacts,
    setContacts,
    user,
    triggerAlert,
    showConfirm,
    showConfirmThreeButtons,
    t,
    pollEmails,
    verifyRecipientsAndRun
  });

  // Contact actions (extracted from App.js)
  const {
    showAddContact, setShowAddContact,
    discoverGaiaId, setDiscoverGaiaId,
    discoveredContact,
    discoverError,
    handleDiscoverSubmit,
    addDiscoveredContact,
    openContactProfile,
    handleToggleContactBlock,
    handleReportContactAbuse
  } = useContactActions({
    user, contacts, setContacts,
    activeIdentity,
    activeChatContact, setActiveChatContact,
    contactProfile, setContactProfile,
    triggerAlert, showConfirm, t
  });

  // Message metadata (pin, save, react) - extracted from App.js
  const {
    messageMeta: _messageMeta,
    toggleMessagePin: toggleMessagePinFromMeta,
    toggleMessageSaved,
    reactToMessage
  } = useMessageMeta({
    user, activeIdentity, chatMessages, pollEmails, triggerAlert, t
  });
  // Use messageMeta from hook (overrides the useState placeholder above)
  // eslint-disable-next-line no-unused-vars
  const messageMeta = _messageMeta;
  // handleToggleMessagePin from useChat handles group pinning; toggleMessagePinFromMeta handles direct chat
  // Both are passed to components depending on context
  const toggleMessagePin = toggleMessagePinFromMeta;



  const {
    publicChannels,
    activePublicChannel,
    setActivePublicChannel,
    publicChannelPosts,
    publicChannelsError,
    publicChannelsLoading,
    publicChannelPostsLoading,
    refreshPublicChannels,
    createChannel: createPublicChannel,
    updateChannel: updatePublicChannel,
    toggleSubscription: togglePublicChannelSubscription,
    createPost: createPublicChannelPost,
    togglePostReaction: togglePublicChannelPostReaction,
    createPostComment: createPublicChannelPostComment,
    togglePostPin: togglePublicChannelPostPin,
    updateChannelComments: updatePublicChannelComments,
    reportChannel,
    deleteChannel,
    verifyChannel,
    discoverResults,
    discoverLoading,
    handleBlockChannel,
    handleUnblockChannel,
    handleDiscoverChannels,
    handleDeleteComment,
    handleModerateComment
  } = usePublicChannels({
    activeIdentity,
    user,
    triggerAlert,
    enabled: currentMenu === 'public_channels'
  });

  // --- Extracted hooks (presence, notifications, locks, key-change detection) ---
  usePresence({ activeIdentity, user, contacts, setPresenceMap });

  useChatNotificationPrimer({ user, activeIdentity, knownChatNotificationIdsRef, chatNotificationsPrimedRef });
  useChatNotifications({
    user, activeIdentity, chatMessages, contacts,
    currentMenu, activeChatContact, activeRoom, activeChannel,
    rooms, channels,
    notificationPreferences,
    knownChatNotificationIdsRef, chatNotificationsPrimedRef
  });

  useInactivityLock({ user, derivedKeys, isLocked, inactivityLockMinutes, handleLock, triggerAlert, t });

  useKeyChangeDetection({
    currentMenu, activeChatContact, contacts, setContacts,
    keyChangeWarning, setKeyChangeWarning, setKeyChangeConfirmInput,
    setActiveChatContact, chatKeyCheckRef,
    user, triggerAlert, t
  });


  // Presence handled by usePresence hook (see hook call above)







  // Unread markers handled by useUnreadMarkers hook
  useUnreadMarkers({
    currentMenu, activeChatContact, activeIdentity, chatMessages,
    activeRoom, activeChannel,
    setActiveDirectUnreadMarker, setActiveGroupUnreadMarker,
    directUnreadSnapshotKeyRef, groupUnreadSnapshotKeyRef,
    markMessagesAsRead
  });

  // clearAllData dispatch target: identical reset body, registered during render.
  resetRef.current = () => {
    setInboxEmails([]);
    setSentEmails([]);
    setChatMessages([]);
    setRooms([]);
    setActiveRoom(null);
    setChannels([]);
    setActiveChannel(null);
    setActiveIdentity(null);
    setIdentities([]);
    setSelectedMail(null);
  };

  return {
    drive: { driveUnlocked, drivePasswordInput, setDrivePasswordInput, driveError, driveRecords, selectedDriveRecord, setSelectedDriveRecord, draftTitle, setDraftTitle, draftCategory, setDraftCategory, draftBody, setDraftBody, driveUploadProgress, handleUnlockDrive, handleLockDrive, handleAddNote, handleAddFile, handleDownloadFile, handleCloudUpload, prepareDriveRecordForChatShare, handleCloudDownload, handleDeleteRecord },
    drop: { dropTargetInput, setDropTargetInput, dropSenderInput, setDropSenderInput, dropMessageInput, setDropMessageInput, dropStatus, dropError, gaiaDropInbox, gaiaDropLoading, selectedDrop, setSelectedDrop, handleSubmitPublicGaiaDrop, loadGaiaDropInbox, handleSelectDrop, handleDeleteDrop },
    emails: { inboxEmails, setInboxEmails, setSentEmails, selectedMail, setSelectedMail, selectedMailProof, isComposing, setIsComposing, composeTo, setComposeTo, composeSubject, setComposeSubject, composeBody, setComposeBody, setComposeReplyTo, composeScheduledFor, setComposeScheduledFor, isSmtpMode, setIsSmtpMode, composeError, uploadProgress, uploadFile, pollEmails, handleSendMail, handleReplyMail, handleFileUpload, handleReportMail, handleExportDisclosurePackage, markMessagesAsRead, allMails, mailThreads, mailboxFolder, setMailboxFolder, mailboxSearch, setMailboxSearch, mailboxLabel, setMailboxLabel, labelsList, draftsList, filterRules, mailSettings, isSavingDraft, updateMailboxState, snoozeMail, saveLabel, saveFilterRule, saveSettings, activeDraftIdRef },
    chat: { rooms, setRooms, activeRoom, setActiveRoom, channels, setChannels, activeChannel, setActiveChannel, showCreateGroupModal, setShowCreateGroupModal, showJoinGroupModal, setShowJoinGroupModal, showCreateChannelModal, setShowCreateChannelModal, showGroupSettingsModal, setShowGroupSettingsModal, groupNameInput, setGroupNameInput, groupDescriptionInput, setGroupDescriptionInput, groupAvatarInput, setGroupAvatarInput, isCrisisRoomInput, setIsCrisisRoomInput, editGroupName, setEditGroupName, editGroupDescription, setEditGroupDescription, editGroupAvatar, setEditGroupAvatar, editGroupIsCrisis, setEditGroupIsCrisis, editGroupIsPrivate, setEditGroupIsPrivate, editGroupReadOnly, setEditGroupReadOnly, editGroupSlowModeSeconds, setEditGroupSlowModeSeconds, editGroupTopSecret, setEditGroupTopSecret, joinGroupHashInput, setJoinGroupHashInput, newChannelNameInput, setNewChannelNameInput, chatMessages, setChatMessages, activeChatContact, setActiveChatContact, activeDirectTopSecret, setDirectTopSecretEnabled, chatInputText, setChatInputText, showEmojiPicker, setShowEmojiPicker, messageReplyTarget, setMessageReplyTarget, fetchRooms, handleCreateRoom, handleJoinRoom, handleLeaveRoom, handleCreateChannel, handleUpdateMemberRole, handleOpenGroupSettings, handleUpdateGroupSettings, handleDeleteGroup, handleSendChatMessage, handleSendGroupMessage, handleDeleteChatMessage, handleEditChatMessage, handleClearDirectChat, handleClearGroupChannel, chatUploadProgress, uploadChatFile, toggleBlockContact, slowModeCooldowns, pinnedMessageIds, joinRequests, moderationLogs, publicRoomsSearchResult, handleToggleMessagePin, handleKickMember, handleTransferOwnership, handleGetJoinRequests, handleModerateJoinRequest, handleGetModerationLogs, handleSearchPublicRooms, handleCreateRoomInviteLink, handleJoinViaInviteLink, handleCreateJoinRequest },
    contactActions: { showAddContact, setShowAddContact, discoverGaiaId, setDiscoverGaiaId, discoveredContact, discoverError, handleDiscoverSubmit, addDiscoveredContact, openContactProfile, handleToggleContactBlock, handleReportContactAbuse },
    publicChannels: { publicChannels, activePublicChannel, setActivePublicChannel, publicChannelPosts, publicChannelsError, publicChannelsLoading, publicChannelPostsLoading, refreshPublicChannels, createPublicChannel, updatePublicChannel, togglePublicChannelSubscription, createPublicChannelPost, togglePublicChannelPostReaction, createPublicChannelPostComment, togglePublicChannelPostPin, updatePublicChannelComments, reportChannel, deleteChannel, verifyChannel, discoverResults, discoverLoading, handleBlockChannel, handleUnblockChannel, handleDiscoverChannels, handleDeleteComment, handleModerateComment },
    messageMeta: { value: messageMeta, toggleMessagePin, toggleMessageSaved, reactToMessage },
  };
}
