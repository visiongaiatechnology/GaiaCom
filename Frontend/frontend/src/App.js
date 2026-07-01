// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from './api';
import AppFeedbackModals from './components/app/AppFeedbackModals';
import AppMainContent from './components/app/AppMainContent';
import AppModalLayer from './components/app/AppModalLayer';
import AuthScreen from './components/auth/AuthScreen';
import UnlockScreen from './components/auth/UnlockScreen';
import SetupWizard from './components/auth/SetupWizard';
import FirstRunOnboarding from './components/onboarding/FirstRunOnboarding';
import { parseToGaiaID, displayGaiaID } from './utils/gaiaAddress';
import { useTranslation } from './utils/i18n';
import NavigationSidebar from './components/layout/NavigationSidebar';
import ListPane from './components/layout/ListPane';
import gaiacomLogo from './gaiacom.png';

// Utilities & Hooks
import { buildInitialKeyHistory, appendKeyHistory } from './utils/keyHistory';
import useGaiaAuth from './hooks/useGaiaAuth';
import useDrive from './hooks/useDrive';
import useGaiaDrop from './hooks/useGaiaDrop';
import useChat from './hooks/useChat';
import useEmails from './hooks/useEmails';
import usePublicChannels from './hooks/usePublicChannels';
// Extracted hooks
import { mergeContactRecords } from './utils/contacts';
import { usePresence } from './hooks/usePresence';
import { useMessageMeta } from './hooks/useMessageMeta';
import { useUnreadMarkers } from './hooks/useUnreadMarkers';
import { useChatNotifications, useChatNotificationPrimer } from './hooks/useChatNotifications';
import { useInactivityLock } from './hooks/useInactivityLock';
import { useKeyChangeDetection } from './hooks/useKeyChangeDetection';
import { useProfileActions } from './utils/useProfileActions';
import { useContactActions } from './utils/useContactActions';
import { safeStorageJson } from './utils/safeJson';

// Security invariant checked by adversarial tests:
// untrusted: !!(env.Untrusted || env.untrusted || isLegacySmtp)

// mergeContactRecords is now in ./utils/contacts.js

export default function App() {
  const { language, changeLanguage, t } = useTranslation();
  // Theme Switching
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('gaia_theme') === 'light');

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
      localStorage.setItem('gaia_theme', 'light');
    } else {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('gaia_theme', 'dark');
    }
  }, [isLightMode]);

  // Mail List Collapsible State
  const [mailListCollapsed, setMailListCollapsed] = useState(false);

  // Quantum shield explanation popup state
  const [showQuantumShieldModal, setShowQuantumShieldModal] = useState(false);

  // Mobile menu control state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Custom Alerts/Popups States
  const [alertConfig, setAlertConfig] = useState(null); // { title, text, type }
  const [confirmConfig, setConfirmConfig] = useState(null);

  const triggerAlert = useCallback((title, text, type = 'success') => {
    setAlertConfig({ title, text, type });
  }, []);

  const showConfirm = useCallback((title, text, onConfirm, onCancel = null, confirmText = null, cancelText = null, danger = false) => {
    setConfirmConfig({
      showThreeButtons: false,
      title,
      text,
      onConfirm,
      onCancel,
      confirmText: confirmText || t('bestaetigen') || 'Bestätigen',
      cancelText: cancelText || t('abbrechen') || 'Abbrechen',
      danger
    });
  }, [t]);

  const showConfirmThreeButtons = useCallback((title, text, onConfirm, onConfirmAlternative, confirmText, confirmAlternativeText, cancelText, onCancel = null) => {
    setConfirmConfig({
      showThreeButtons: true,
      title,
      text,
      onConfirm,
      onConfirmAlternative,
      confirmText,
      confirmAlternativeText,
      cancelText,
      onCancel
    });
  }, []);

  // Core navigation & data
  const [currentMenu, setCurrentMenu] = useState('dashboard'); // 'dashboard', 'inbox', 'smtp_inbox', 'sent', 'groups', 'chat', 'contacts', 'profile'
  const [activeProfileSection, setActiveProfileSection] = useState(() => (typeof window !== 'undefined' && window.innerWidth > 992) ? 'edit' : null);
  const [publicChannelCreatorOpen, setPublicChannelCreatorOpen] = useState(false);
  const [identities, setIdentities] = useState([]);
  const [activeIdentity, setActiveIdentity] = useState(null);
  const [activeIdentityRoles, setActiveIdentityRoles] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA installation choice:', outcome);
    setDeferredPrompt(null);
  };
  const [cryptoSessionMinutes, setCryptoSessionMinutesState] = useState(() => {
    const stored = Number(localStorage.getItem('gaia_crypto_session_minutes') || '0');
    return Number.isFinite(stored) && stored >= 0 ? stored : 0;
  });
  const [inactivityLockMinutes, setInactivityLockMinutesState] = useState(() => {
    const stored = Number(localStorage.getItem('gaia_inactivity_lock_minutes') || '15');
    return Number.isFinite(stored) && stored >= 0 ? stored : 15;
  });

  const setCryptoSessionMinutes = useCallback((minutes) => {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    setCryptoSessionMinutesState(safeMinutes);
    localStorage.setItem('gaia_crypto_session_minutes', String(safeMinutes));
    if (safeMinutes === 0) {
      sessionStorage.removeItem('gaia_crypto_session');
    }
  }, []);

  const setInactivityLockMinutes = useCallback((minutes) => {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    setInactivityLockMinutesState(safeMinutes);
    localStorage.setItem('gaia_inactivity_lock_minutes', String(safeMinutes));
  }, []);

  // User Profile hook state will be initialized after useGaiaAuth (see below)
  // Placeholder state for messageMeta and unread markers

  // messageMeta state is managed by useMessageMeta hook (declared after useGaiaAuth)
  const [activeDirectUnreadMarker, setActiveDirectUnreadMarker] = useState(null);
  const [activeGroupUnreadMarker, setActiveGroupUnreadMarker] = useState(null);
  const [showBootSequence, setShowBootSequence] = useState(false);
  const [showFirstRunOnboarding, setShowFirstRunOnboarding] = useState(false);
  const directUnreadSnapshotKeyRef = useRef('');
  const groupUnreadSnapshotKeyRef = useRef('');
  const chatKeyCheckRef = useRef('');
  const knownChatNotificationIdsRef = useRef(new Set());
  const chatNotificationsPrimedRef = useRef(false);
  const bootSequenceSeenRef = useRef('');
  const onboardingSeenKeyRef = useRef('');

  // Contact modal & key-change state
  const [contactProfile, setContactProfile] = useState(null);
  const [keyChangeWarning, setKeyChangeWarning] = useState(null);
  const [keyChangeConfirmInput, setKeyChangeConfirmInput] = useState('');

  const fileInputRef = useRef(null);

  async function fetchIdentities() {
    if (!user) return;
    try {
      const list = await api.getMyIdentities();
      setIdentities(list || []);
      if (list && list.length > 0) {
        const cached = localStorage.getItem(`active_identity_${user.id}`);
        const found = list.find(id => id.GaiaID === cached || id.ID === cached);
        setActiveIdentity(found || list[0]);
      } else {
        setActiveIdentity(null);
        setShowWizard(true);
      }
    } catch (_) {}
  }

  useEffect(() => {
    if (!activeIdentity) {
      setActiveIdentityRoles([]);
      return;
    }
    const fetchActiveRoles = async () => {
      try {
        const res = await api.getGovernanceRoles();
        if (res && res.roles) {
          setActiveIdentityRoles(res.roles);
        } else {
          setActiveIdentityRoles([]);
        }
      } catch (_) {
        setActiveIdentityRoles([]);
      }
    };
    fetchActiveRoles();
  }, [activeIdentity]);

  const getSenderRoles = useCallback((senderGaiaOrID) => {
    if (!senderGaiaOrID) return [];
    const parsed = parseToGaiaID(senderGaiaOrID);
    
    if (activeIdentity && parseToGaiaID(activeIdentity.GaiaID) === parsed) {
      return activeIdentityRoles;
    }
    
    const contact = contacts.find(c => parseToGaiaID(c.gaiaID) === parsed);
    if (contact?.trustPassport?.roles) {
      return contact.trustPassport.roles;
    }
    
    return [];
  }, [activeIdentity, activeIdentityRoles, contacts]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const clearAllData = useCallback(() => {
    setInboxEmails([]);
    setSentEmails([]);
    setChatMessages([]);
    // messageMeta reset is handled by useMessageMeta hook when user changes
    setRooms([]);
    setActiveRoom(null);
    setChannels([]);
    setActiveChannel(null);
    setActiveIdentity(null);
    setIdentities([]);
    setSelectedMail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1. Auth Hook
  const {
    user, setUser,
    mnemonic, setMnemonic,
    derivedKeys, setDerivedKeys,
    isRegister, setIsRegister,
    usernameInput, setUsernameInput,
    passwordInput, setPasswordInput,
    authError, setAuthError,
    showRegSuccessPopup, setShowRegSuccessPopup,
    isLocked,
    unlockPassword, setUnlockPassword,
    unlockError,
    tempUserId,
    showWizard, setShowWizard,
    wizardStep, setWizardStep,
    copiedMnemonic, setCopiedMnemonic,
    wizardGaiaUsername, setWizardGaiaUsername,
    wizardDomain, setWizardDomain,
    wizardCustomDomain, setWizardCustomDomain,
    wizardFallbackNodes, setWizardFallbackNodes,
    wizardError,
    availableNodes,
    serverVersion,
    serverConsensus,
    handleWizardRegisterIdentity,
    handleGenerateMnemonic,
    handleAuthSubmit,
    handleUnlock,
    handleLogout,
    handleLock,
    writeCryptoSession
  } = useGaiaAuth({
    triggerAlert,
    fetchIdentities: () => fetchIdentities(),
    clearAllData,
    cryptoSessionMinutes
  });

  // --- Profile & Contact Actions (need user/mnemonic from auth hook) ---
  const {
    profileDisplayName, setProfileDisplayName,
    profileRealName, setProfileRealName,
    profileWebsite, setProfileWebsite,
    profileBio, setProfileBio,
    profileAvatar, setProfileAvatar,
    currentPasswordInput, setCurrentPasswordInput,
    newPasswordInput, setNewPasswordInput,
    confirmPasswordInput, setConfirmPasswordInput,
    passwordChangeError,
    areKeysUnlocked, setAreKeysUnlocked,
    profilePasswordInput, setProfilePasswordInput,
    profileUnlockError,
    pinUnlockEnabled,
    webAuthnUnlockEnabled,
    handleUnlockProfileKeys,
    handleAvatarFileChange,
    saveProfile,
    saveProfileData,
    handleChangePassword,
    handleSetUnlockPin,
    handleRemoveUnlockPin,
    handleSetWebAuthnUnlock,
    handleRemoveWebAuthnUnlock,
    handleExportRecoveryBackup,
    handleImportRecoveryBackup,
    handleDeleteAccount,
    handleUpdatePrivacySettings
  } = useProfileActions({
    user, setUser,
    mnemonic, setMnemonic,
    derivedKeys, setDerivedKeys,
    usernameInput, setUsernameInput,
    passwordInput, setPasswordInput,
    cryptoSessionMinutes,
    setCryptoSessionMinutes,
    inactivityLockMinutes,
    setInactivityLockMinutes,
    writeCryptoSession,
    activeIdentity,
    triggerAlert,
    t
  });

  const [showTransition, setShowTransition] = useState(false);
  const [transitionText, setTransitionText] = useState('GAIACOM');
  const prevUserRef = React.useRef(user);
  const prevIsLockedRef = React.useRef(isLocked);

  React.useEffect(() => {
    if (!prevUserRef.current && user) {
      prevUserRef.current = user;
      setTransitionText('GAIACOM');
      setShowTransition(true);
      const timer = setTimeout(() => setShowTransition(false), 2000);
      return () => clearTimeout(timer);
    }
    prevUserRef.current = user;
  }, [user]);

  React.useEffect(() => {
    if (prevIsLockedRef.current && !isLocked && user) {
      prevIsLockedRef.current = isLocked;
      setTransitionText('GAIACOM');
      setShowTransition(true);
      const timer = setTimeout(() => setShowTransition(false), 2000);
      return () => clearTimeout(timer);
    }
    prevIsLockedRef.current = isLocked;
  }, [isLocked, user]);

  function verifyRecipientsAndRun(recipientGaiaIds, pubRecords, runFn) {
    for (let i = 0; i < recipientGaiaIds.length; i++) {
      const gaiaID = recipientGaiaIds[i];
      const pubRecord = pubRecords[i];
      
      const formatted = parseToGaiaID(gaiaID);
      const stored = contacts.find(c => parseToGaiaID(c.gaiaID) === formatted);
      const fetchedKey = pubRecord.public_keys.identity;
      
      if (stored && stored.publicKey !== fetchedKey) {
        setKeyChangeWarning({
          gaiaID: formatted,
          displayName: stored.displayName,
          oldKey: stored.publicKey,
          newKey: fetchedKey,
          resumeFn: () => {
            const updatedStored = {
              ...stored,
              publicKey: fetchedKey,
              keyHistory: appendKeyHistory(stored, fetchedKey, true),
              keyConfirmedAt: new Date().toISOString()
            };
            const updated = contacts.map(c => c.ID === stored.ID ? updatedStored : c);
            setContacts(updated);
            localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
            setKeyChangeWarning(null);
            setKeyChangeConfirmInput('');
            verifyRecipientsAndRun(recipientGaiaIds, pubRecords, runFn);
          },
          cancelFn: () => {
            setKeyChangeWarning(null);
            setKeyChangeConfirmInput('');
            triggerAlert('Abgebrochen', 'Sicherheitskritischer SchlÃƒÂ¼sselwechsel nicht bestÃƒÂ¤tigt.', 'danger');
          }
        });
        return;
      }
    }
    runFn();
  }

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
    contacts,
    setContacts,
    user,
    triggerAlert,
    showConfirm,
    t,
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


  useEffect(() => {
    if (!user || !derivedKeys || isLocked || inactivityLockMinutes <= 0) return undefined;
    let timer = null;
    const lockAfterIdle = () => {
      handleLock();
      triggerAlert(t('sperren') || 'Gesperrt', t('inactivity_lock_notice') || 'GaiaCOM wurde wegen Inaktivitat kryptografisch gesperrt.', 'warning');
    };
    const resetTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(lockAfterIdle, inactivityLockMinutes * 60 * 1000);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(eventName => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach(eventName => window.removeEventListener(eventName, resetTimer));
    };
  }, [derivedKeys, handleLock, inactivityLockMinutes, isLocked, t, triggerAlert, user]);

  // --- Load GaiaDrop Inbox on Menu/Identity Change ---
  useEffect(() => {
    if (activeIdentity && derivedKeys && !isLocked) {
      loadGaiaDropInbox();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMenu, activeIdentity, derivedKeys, isLocked]);

  // Fetch identities & cache contacts
  useEffect(() => {
    if (user) {
      fetchIdentities();
      const parsedCachedContacts = safeStorageJson(localStorage, `contacts_${user.id}`, []);
      setContacts(parsedCachedContacts);
      api.getMailContacts()
        .then(serverContacts => {
          const mergedContacts = mergeContactRecords(parsedCachedContacts, serverContacts || []);
          setContacts(mergedContacts);
          localStorage.setItem(`contacts_${user.id}`, JSON.stringify(mergedContacts));
        })
        .catch(() => {});
      // Load user profile details
      const cachedProfile = safeStorageJson(localStorage, `profile_${user.id}`, null);
      if (cachedProfile) {
        const parsed = cachedProfile;
        setProfileDisplayName(parsed.displayName || user.username || '');
        setProfileRealName(parsed.realName || '');
        setProfileWebsite(parsed.website || '');
        setProfileBio(parsed.bio || '');
        setProfileAvatar(parsed.avatar || '\u{1F916}');
      } else {
        setProfileDisplayName(user.username || '');
        setProfileRealName('');
        setProfileWebsite('');
        setProfileBio('Sicher verschlÃƒÂ¼sselt mit GaiaCOM');
        setProfileAvatar('\u{1F916}');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  // Fetch inbox, sent folders, and rooms on timer loop
  useEffect(() => {
    let interval = null;
    if (activeIdentity && derivedKeys && !isLocked) {
      pollEmails();
      fetchRooms();
      interval = setInterval(() => {
        pollEmails();
        fetchRooms();
      }, 4000);
    } else {
      setInboxEmails([]);
      setSentEmails([]);
      setChatMessages([]);
      setRooms([]);
      setActiveRoom(null);
      setChannels([]);
      setActiveChannel(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdentity, derivedKeys, isLocked]);

  // Toggle warning-red SMTP class on body
  useEffect(() => {
    if (isSmtpMode && isComposing) {
      document.body.classList.add('smtp-active');
    } else {
      document.body.classList.remove('smtp-active');
    }
    return () => {
      document.body.classList.remove('smtp-active');
    };
  }, [isSmtpMode, isComposing]);

  // --- Profile Actions ---

  const activeMailsList = React.useMemo(() => {
    const isSmtpMenu = currentMenu.startsWith('smtp_');
    const folderType = isSmtpMenu ? currentMenu.substring(5) : currentMenu; 

    // Formatted drafts
    const formattedDrafts = draftsList.map(draft => {
      const isSmtpDraft = !!(draft.recipientGaia?.includes('@') && !draft.recipientGaia?.startsWith('@'));
      const msg = {
        id: draft.id,
        sender: activeIdentity?.GaiaID || '',
        senderGaia: activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.GaiaID || '',
        recipient: draft.recipientGaia || '',
        recipientGaia: draft.recipientGaia ? displayGaiaID(draft.recipientGaia) : '',
        subject: draft.subject || '(Kein Betreff)',
        body: draft.body || '',
        createdAt: draft.updatedAt || draft.createdAt || new Date().toISOString(),
        isRead: true,
        isSmtp: isSmtpDraft,
        isDraft: true,
        mailbox: {
          folder: isSmtpDraft ? 'smtp_drafts' : 'drafts',
          isRead: true,
          isStarred: false,
          isImportant: false,
          isSpam: false,
          isArchived: false,
          labels: []
        }
      };
      return {
        id: draft.id,
        key: `draft_${draft.id}`,
        subject: draft.subject || '(Kein Betreff)',
        messages: [msg],
        latestMessage: msg,
        isRead: true,
        isStarred: false,
        isImportant: false,
        sender: msg.sender,
        senderGaia: msg.senderGaia,
        recipient: msg.recipient,
        recipientGaia: msg.recipientGaia,
        createdAt: msg.createdAt,
        isSmtp: isSmtpDraft,
        isDraft: true
      };
    });

    const allMailItems = [...mailThreads, ...formattedDrafts];

    return allMailItems.filter(thread => {
      if (thread.isSmtp !== isSmtpMenu) return false;

      const latest = thread.latestMessage;
      const folder = thread.isDraft 
        ? 'drafts' 
        : (latest.mailbox?.folder || (latest.sender === activeIdentity?.GaiaID || latest.sender === activeIdentity?.ID ? 'sent' : 'inbox'));
      const isSpam = latest.mailbox?.isSpam || false;

      // 1. Search filter
      if (mailboxSearch) {
        const query = mailboxSearch.toLowerCase();
        const matches = thread.messages.some(mail => 
          (mail.subject && mail.subject.toLowerCase().includes(query)) ||
          (mail.body && mail.body.toLowerCase().includes(query)) ||
          (mail.senderGaia && mail.senderGaia.toLowerCase().includes(query)) ||
          (mail.recipientGaia && mail.recipientGaia.toLowerCase().includes(query))
        );
        if (!matches) return false;
      }

      // 2. Custom label filter
      if (mailboxLabel) {
        const matchesLabel = thread.messages.some(mail => {
          const labels = mail.mailbox?.labels || [];
          return labels.includes(mailboxLabel);
        });
        if (!matchesLabel) return false;
      }

      // 3. Folder specific checks
      if (folderType === 'starred') {
        if (!thread.isStarred) return false;
        return folder !== 'trash' && !isSpam;
      }
      if (folderType === 'important') {
        if (!thread.isImportant) return false;
        return folder !== 'trash' && !isSpam;
      }
      if (folderType === 'inbox') {
        return folder === 'inbox' && !isSpam && folder !== 'trash';
      }
      if (folderType === 'drafts') {
        return thread.isDraft === true;
      }
      if (folderType === 'sent') {
        return folder === 'sent' && !thread.isDraft;
      }
      if (folderType === 'archive') {
        return folder === 'archive' || latest.mailbox?.isArchived;
      }
      if (folderType === 'spam') {
        return folder === 'spam' || isSpam;
      }
      if (folderType === 'trash') {
        return folder === 'trash';
      }
      if (folderType === 'snoozed') {
        return folder === 'snoozed' || thread.messages.some(m => !!m.mailbox?.snoozedUntil);
      }

      return true;
    });
  }, [mailThreads, draftsList, currentMenu, mailboxSearch, mailboxLabel, activeIdentity]);

  const unreadEmailsCount = React.useMemo(() => {
    return allMails.filter(mail => !mail.isSmtp && (mail.mailbox?.folder === 'inbox') && !mail.isRead && !mail.mailbox?.isSpam).length;
  }, [allMails]);

  const unreadSmtpEmailsCount = React.useMemo(() => {
    return allMails.filter(mail => mail.isSmtp && (mail.mailbox?.folder === 'inbox') && !mail.isRead && !mail.mailbox?.isSpam).length;
  }, [allMails]);

  const getUnreadChatCount = (contact) => {
    if (!activeIdentity) return 0;
    const contactGaia = parseToGaiaID(contact.gaiaID);
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    return chatMessages.filter(msg => 
      parseToGaiaID(msg.sender) === contactGaia &&
      parseToGaiaID(msg.recipient) === ownGaia &&
      !msg.isRead
    ).length;
  };

  const unreadChatsTotal = contacts.reduce((sum, c) => sum + getUnreadChatCount(c), 0);

  const getUnreadRoomCount = (room) => {
    if (!activeIdentity) return 0;
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    return chatMessages.filter(msg => 
      msg.roomId === room.ID && 
      parseToGaiaID(msg.sender) !== ownGaia &&
      msg.sender !== activeIdentity.ID && 
      !msg.isRead
    ).length;
  };

  const unreadRoomsTotal = rooms.reduce((sum, r) => sum + getUnreadRoomCount(r), 0);

  const formatBadgeCount = (count) => {
    if (count <= 0) return null;
    return count > 99 ? '99+' : count;
  };
  const unreadDropsCount = gaiaDropInbox.filter(drop => drop.status === 'new').length;

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (mailSettings?.keyboardMode !== 'gmail') return;

    let keysPressed = '';
    const handleKeyDown = (e) => {
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      ) {
        return;
      }

      // Ignore shortcuts if modifier keys (Ctrl, Cmd/Meta, Alt) are pressed (e.g. Ctrl+C)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      keysPressed += key;
      if (keysPressed.length > 2) {
        keysPressed = keysPressed.slice(-2);
      }

      if (keysPressed === 'gi') {
        setCurrentMenu('inbox');
        setSelectedMail(null);
        setIsComposing(false);
        keysPressed = '';
        return;
      }
      if (keysPressed === 'gs') {
        setCurrentMenu('sent');
        setSelectedMail(null);
        keysPressed = '';
        return;
      }
      if (keysPressed === 'gc') {
        setCurrentMenu('chat');
        keysPressed = '';
        return;
      }
      if (keysPressed === 'gg') {
        setCurrentMenu('groups');
        keysPressed = '';
        return;
      }
      if (keysPressed === 'gp') {
        setCurrentMenu('profile');
        setActiveProfileSection('edit');
        keysPressed = '';
        return;
      }

      if (key === 'c') {
        setIsComposing(true);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeReplyTo(null);
        setSelectedMail(null);
        if (activeDraftIdRef) {
          activeDraftIdRef.current = null;
        }
        e.preventDefault();
      } else if (key === 'r' && selectedMail) {
        handleReplyMail(selectedMail);
        e.preventDefault();
      } else if (key === 'f' && selectedMail) {
        handleReplyMail(selectedMail, { forward: true });
        e.preventDefault();
      } else if (key === 'e' && selectedMail) {
        updateMailboxState(selectedMail, { folder: 'archive', isArchived: true });
        triggerAlert('Archiviert', 'Die Mail wurde archiviert.');
        setSelectedMail(null);
        e.preventDefault();
      } else if ((key === 'delete' || key === 'backspace' || key === '#') && selectedMail) {
        updateMailboxState(selectedMail, { folder: 'trash' });
        triggerAlert('Gelöscht', 'Die Mail wurde in den Papierkorb verschoben.');
        setSelectedMail(null);
        e.preventDefault();
      } else if (key === 's' && selectedMail) {
        const nextStarred = !selectedMail.mailbox?.isStarred;
        updateMailboxState(selectedMail, { isStarred: nextStarred });
        triggerAlert(nextStarred ? 'Markiert' : 'Entmarkt', nextStarred ? 'Stern hinzugefügt.' : 'Stern entfernt.');
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mailSettings, selectedMail, handleReplyMail, updateMailboxState, triggerAlert, setComposeBody, setComposeReplyTo, setComposeSubject, setComposeTo, setIsComposing, setSelectedMail, setCurrentMenu, setActiveProfileSection, activeDraftIdRef]);

  useEffect(() => {
    if (!user?.id || !derivedKeys || isLocked || showWizard) {
      if (!user?.id || !derivedKeys) {
        bootSequenceSeenRef.current = '';
      }
      setShowBootSequence(false);
      return;
    }
    if (bootSequenceSeenRef.current === user.id) {
      return;
    }
    bootSequenceSeenRef.current = user.id;
    setShowBootSequence(false);
    const frame = window.requestAnimationFrame(() => setShowBootSequence(true));
    const timer = window.setTimeout(() => setShowBootSequence(false), 2600);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [derivedKeys, isLocked, showWizard, user?.id]);

  useEffect(() => {
    if (!user?.id || !activeIdentity?.ID || !derivedKeys || isLocked || showWizard) {
      setShowFirstRunOnboarding(false);
      onboardingSeenKeyRef.current = '';
      return undefined;
    }

    const storageKey = `gaia_first_run_onboarding_${user.id}_${activeIdentity.ID}`;
    if (onboardingSeenKeyRef.current === storageKey) {
      return undefined;
    }
    onboardingSeenKeyRef.current = storageKey;

    if (
      localStorage.getItem(storageKey) === 'done' ||
      localStorage.getItem(`gaia_integrated_onboarding_done_${user.id}`) === 'done' ||
      mailSettings?.onboardingDone === true ||
      mailSettings?.onboardingDone === 1
    ) {
      setShowFirstRunOnboarding(false);
      if (localStorage.getItem(storageKey) !== 'done') {
        localStorage.setItem(storageKey, 'done');
      }
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowFirstRunOnboarding(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeIdentity?.ID, derivedKeys, isLocked, showWizard, user?.id, mailSettings]);

  const closeFirstRunOnboarding = useCallback(() => {
    if (user?.id && activeIdentity?.ID) {
      const storageKey = `gaia_first_run_onboarding_${user.id}_${activeIdentity.ID}`;
      localStorage.setItem(storageKey, 'done');
      saveSettings({ ...mailSettings, onboardingDone: true });
    }
    setShowFirstRunOnboarding(false);
  }, [activeIdentity?.ID, user?.id, mailSettings, saveSettings]);

  const openOnboardingDestination = useCallback((menu, afterOpen = null) => {
    closeFirstRunOnboarding();
    setCurrentMenu(menu);
    setSelectedMail(null);
    setIsComposing(false);
    setMobileMenuOpen(false);
    if (afterOpen) afterOpen();
  }, [closeFirstRunOnboarding, setIsComposing, setSelectedMail]);

  const hasActiveContent = !!(
    selectedMail ||
    isComposing ||
    currentMenu === 'dashboard' ||
    (currentMenu === 'chat' && activeChatContact) ||
    (currentMenu === 'groups' && activeRoom) ||
    (currentMenu === 'public_channels' && (activePublicChannel || publicChannelCreatorOpen)) ||
    currentMenu === 'network_health' ||
    currentMenu === 'abuse_center' ||
    currentMenu === 'security_center' ||
    (currentMenu === 'profile' && activeProfileSection) ||
    currentMenu === 'vault' ||
    (currentMenu === 'gaiadrop' && selectedDrop) ||
    currentMenu === 'gsn'
  );

  // --- RENDER SCREEN ---

  // Unlock Screen
  if (isLocked) {
    return (
      <UnlockScreen
        unlockPassword={unlockPassword}
        unlockError={unlockError}
        pinEnabled={pinUnlockEnabled}
        webAuthnEnabled={webAuthnUnlockEnabled}
        onPasswordChange={setUnlockPassword}
        onSubmit={handleUnlock}
        onLogout={handleLogout}
      />
    );
  }

  // 1. Auth Page
  if (!user || !derivedKeys) {
    return (
      <AuthScreen
        isRegister={isRegister}
        usernameInput={usernameInput}
        passwordInput={passwordInput}
        mnemonic={mnemonic}
        copiedMnemonic={copiedMnemonic}
        authError={authError}
        showRegSuccessPopup={showRegSuccessPopup}
        derivedKeys={derivedKeys}
        serverVersion={serverVersion}
        serverConsensus={serverConsensus}
        dropTargetInput={dropTargetInput}
        dropSenderInput={dropSenderInput}
        dropMessageInput={dropMessageInput}
        dropStatus={dropStatus}
        dropError={dropError}
        onSubmit={handleAuthSubmit}
        onImportRecovery={handleImportRecoveryBackup}
        onUsernameChange={setUsernameInput}
        onPasswordChange={setPasswordInput}
        onMnemonicChange={setMnemonic}
        onToggleMode={() => {
          setIsRegister(!isRegister);
          setAuthError('');
        }}
        onGenerateMnemonic={handleGenerateMnemonic}
        onCopyMnemonic={() => {
          navigator.clipboard.writeText(mnemonic);
          setCopiedMnemonic(true);
        }}
        onCloseSuccess={() => {
          setShowRegSuccessPopup(false);
          setUser({ id: tempUserId, username: usernameInput, allowAnonymousStats: true });
        }}
        onSubmitGaiaDrop={handleSubmitPublicGaiaDrop}
        onDropTargetChange={setDropTargetInput}
        onDropSenderChange={setDropSenderInput}
        onDropMessageChange={setDropMessageInput}
        t={t}
      />
    );
  }

  // 2. Setup Wizard (Profile generator)
  if (showWizard) {
    return (
      <SetupWizard
        wizardStep={wizardStep}
        mnemonic={mnemonic}
        copiedMnemonic={copiedMnemonic}
        wizardGaiaUsername={wizardGaiaUsername}
        wizardDomain={wizardDomain}
        wizardCustomDomain={wizardCustomDomain}
        wizardFallbackNodes={wizardFallbackNodes}
        availableNodes={availableNodes}
        wizardError={wizardError}
        derivedKeys={derivedKeys}
        t={t}
        onCopiedMnemonicChange={setCopiedMnemonic}
        onStepChange={setWizardStep}
        onGaiaUsernameChange={setWizardGaiaUsername}
        onDomainChange={setWizardDomain}
        onCustomDomainChange={setWizardCustomDomain}
        onFallbackNodesChange={setWizardFallbackNodes}
        onRegisterIdentity={handleWizardRegisterIdentity}
        onFinish={() => setShowWizard(false)}
      />
    );
  }

  const contentWide = mailListCollapsed || currentMenu === 'dashboard' || currentMenu === 'network_health' || currentMenu === 'abuse_center' || currentMenu === 'security_center' || currentMenu === 'gsn';

  return (
    <>
      {showBootSequence && (
        <div className="gaia-boot-overlay" aria-hidden="true">
          <div className="gaia-boot-grid"></div>
          <img src={gaiacomLogo} style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '24px', filter: 'drop-shadow(0 0 20px rgba(57, 232, 255, 0.45))', zIndex: 10 }} alt="GaiaCom Logo" />
          <div className="gaia-boot-wordmark">GAIACOM</div>
          <div className="gaia-boot-subline">NETWORK // QUANTUM SECURE // READY</div>
        </div>
      )}

      {showTransition && (
        <div className="gaia-transition-overlay" aria-hidden="true">
          <div className="gaia-transition-logo-container">
            <div className="gaia-transition-ring-wrapper" style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 20px' }}>
              <div className="gaia-transition-ring" style={{ margin: 0, position: 'absolute', left: 0, top: 0 }}></div>
              <img src={gaiacomLogo} style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '38px',
                height: '38px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 10px rgba(57, 232, 255, 0.35))'
              }} alt="GaiaCom Logo" />
            </div>
            <div className="gaia-transition-text">{transitionText}</div>
            <div className="gaia-transition-subtext">NETWORK // QUANTUM SECURE // READY</div>
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

      <div className="gaia-nebula-stage" aria-hidden="true">
        <div className="gaia-nebula-grid"></div>
        <div className="gaia-nebula-scan"></div>
        <div className="gaia-nebula-beam gaia-nebula-beam-a"></div>
        <div className="gaia-nebula-beam gaia-nebula-beam-b"></div>
      </div>

      <div className={`app-container ${isLightMode ? 'light-mode' : 'dark-mode'} ${hasActiveContent ? 'has-active-content mobile-content-active' : ''} ${contentWide ? 'mail-list-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        {/* COLUMN 1: NAVIGATION SIDEBAR */}
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

      {/* COLUMN 2: LIST PANE */}
      {!contentWide && (
        <ListPane
          currentMenu={currentMenu}
          setCurrentMenu={setCurrentMenu}
          contacts={contacts}
          setContacts={setContacts}
          rooms={rooms}
          activeRoom={activeRoom}
          setActiveRoom={setActiveRoom}
          publicChannels={publicChannels}
          activePublicChannel={activePublicChannel}
          setActivePublicChannel={setActivePublicChannel}
          setPublicChannelCreatorOpen={setPublicChannelCreatorOpen}
          publicChannelsLoading={publicChannelsLoading}
          refreshPublicChannels={refreshPublicChannels}
          activeChatContact={activeChatContact}
          setActiveChatContact={setActiveChatContact}
          selectedMail={selectedMail}
          setSelectedMail={setSelectedMail}
          setIsComposing={setIsComposing}
          setComposeTo={setComposeTo}
          setComposeSubject={setComposeSubject}
          setComposeBody={setComposeBody}
          setComposeReplyTo={setComposeReplyTo}
          setMobileMenuOpen={setMobileMenuOpen}
          activeMailsList={activeMailsList}
          getUnreadChatCount={getUnreadChatCount}
          getUnreadRoomCount={getUnreadRoomCount}
          formatBadgeCount={formatBadgeCount}
          setMailListCollapsed={setMailListCollapsed}
          setContactProfile={setContactProfile}
          openContactProfile={openContactProfile}
          driveUnlocked={driveUnlocked}
          driveRecords={driveRecords}
          prepareDriveRecordForChatShare={prepareDriveRecordForChatShare}
          selectedDriveRecord={selectedDriveRecord}
          setSelectedDriveRecord={setSelectedDriveRecord}
          gaiaDropInbox={gaiaDropInbox}
          selectedDrop={selectedDrop}
          setSelectedDrop={handleSelectDrop}
          activeIdentity={activeIdentity}
          loadGaiaDropInbox={loadGaiaDropInbox}
          gaiaDropLoading={gaiaDropLoading}
          user={user}
          t={t}
          displayGaiaID={displayGaiaID}
          parseToGaiaID={parseToGaiaID}
          buildInitialKeyHistory={buildInitialKeyHistory}
          triggerAlert={triggerAlert}
          showConfirm={showConfirm}
          setShowCreateGroupModal={setShowCreateGroupModal}
          setShowJoinGroupModal={setShowJoinGroupModal}
          activeProfileSection={activeProfileSection}
          setActiveProfileSection={setActiveProfileSection}
          handleClearDirectChat={handleClearDirectChat}
          handleLeaveRoom={handleLeaveRoom}
          handleDeleteGroup={handleDeleteGroup}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          fetchRooms={fetchRooms}
          mailboxFolder={mailboxFolder}
          setMailboxFolder={setMailboxFolder}
          mailboxSearch={mailboxSearch}
          setMailboxSearch={setMailboxSearch}
          mailboxLabel={mailboxLabel}
          setMailboxLabel={setMailboxLabel}
          labelsList={labelsList}
          draftsList={draftsList}
          updateMailboxState={updateMailboxState}
          snoozeMail={snoozeMail}
          saveLabel={saveLabel}
          activeDraftIdRef={activeDraftIdRef}
          setIsSmtpMode={setIsSmtpMode}
        />
      )}

      <AppMainContent
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
        setContactProfile={setContactProfile}
        chatInputRef={fileInputRef}
        fetchRooms={fetchRooms}
        mailboxFolder={mailboxFolder}
        setMailboxFolder={setMailboxFolder}
        mailboxSearch={mailboxSearch}
        setMailboxSearch={setMailboxSearch}
        mailboxLabel={mailboxLabel}
        setMailboxLabel={setMailboxLabel}
        labelsList={labelsList}
        draftsList={draftsList}
        filterRules={filterRules}
        mailSettings={mailSettings}
        isSavingDraft={isSavingDraft}
        updateMailboxState={updateMailboxState}
        snoozeMail={snoozeMail}
        saveLabel={saveLabel}
        saveFilterRule={saveFilterRule}
        saveSettings={saveSettings}
        allMails={allMails}
      />

      <AppFeedbackModals
        alertConfig={alertConfig}
        setAlertConfig={setAlertConfig}
        confirmConfig={confirmConfig}
        setConfirmConfig={setConfirmConfig}
        t={t}
      />
      <AppModalLayer
        contactProfile={contactProfile}
        setContactProfile={setContactProfile}
        showAddContact={showAddContact}
        setShowAddContact={setShowAddContact}
        discoverGaiaId={discoverGaiaId}
        setDiscoverGaiaId={setDiscoverGaiaId}
        handleDiscoverSubmit={handleDiscoverSubmit}
        discoverError={discoverError}
        discoveredContact={discoveredContact}
        addDiscoveredContact={addDiscoveredContact}
        displayGaiaID={displayGaiaID}
        t={t}
        triggerAlert={triggerAlert}
        showConfirm={showConfirm}
        showQuantumShieldModal={showQuantumShieldModal}
        setShowQuantumShieldModal={setShowQuantumShieldModal}
        showCreateGroupModal={showCreateGroupModal}
        setShowCreateGroupModal={setShowCreateGroupModal}
        groupNameInput={groupNameInput}
        setGroupNameInput={setGroupNameInput}
        groupDescriptionInput={groupDescriptionInput}
        setGroupDescriptionInput={setGroupDescriptionInput}
        groupAvatarInput={groupAvatarInput}
        setGroupAvatarInput={setGroupAvatarInput}
        handleCreateRoom={handleCreateRoom}
        isCrisisRoomInput={isCrisisRoomInput}
        setIsCrisisRoomInput={setIsCrisisRoomInput}
        showJoinGroupModal={showJoinGroupModal}
        setShowJoinGroupModal={setShowJoinGroupModal}
        joinGroupHashInput={joinGroupHashInput}
        setJoinGroupHashInput={setJoinGroupHashInput}
        handleJoinRoom={handleJoinRoom}
        showCreateChannelModal={showCreateChannelModal}
        setShowCreateChannelModal={setShowCreateChannelModal}
        newChannelNameInput={newChannelNameInput}
        setNewChannelNameInput={setNewChannelNameInput}
        handleCreateChannel={handleCreateChannel}
        showGroupSettingsModal={showGroupSettingsModal}
        setShowGroupSettingsModal={setShowGroupSettingsModal}
        editGroupName={editGroupName}
        setEditGroupName={setEditGroupName}
        editGroupDescription={editGroupDescription}
        setEditGroupDescription={setEditGroupDescription}
        editGroupAvatar={editGroupAvatar}
        setEditGroupAvatar={setEditGroupAvatar}
        editGroupIsCrisis={editGroupIsCrisis}
        setEditGroupIsCrisis={setEditGroupIsCrisis}
        editGroupIsPrivate={editGroupIsPrivate}
        setEditGroupIsPrivate={setEditGroupIsPrivate}
        editGroupReadOnly={editGroupReadOnly}
        setEditGroupReadOnly={setEditGroupReadOnly}
        editGroupSlowModeSeconds={editGroupSlowModeSeconds}
        setEditGroupSlowModeSeconds={setEditGroupSlowModeSeconds}
        editGroupTopSecret={editGroupTopSecret}
        setEditGroupTopSecret={setEditGroupTopSecret}
        handleUpdateGroupSettings={handleUpdateGroupSettings}
        handleDeleteGroup={handleDeleteGroup}
        handleUpdateMemberRole={handleUpdateMemberRole}
        handleKickMember={handleKickMember}
        handleTransferOwnership={handleTransferOwnership}
        handleGetJoinRequests={handleGetJoinRequests}
        handleModerateJoinRequest={handleModerateJoinRequest}
        joinRequests={joinRequests}
        handleGetModerationLogs={handleGetModerationLogs}
        moderationLogs={moderationLogs}
        handleCreateRoomInviteLink={handleCreateRoomInviteLink}
        activeRoom={activeRoom}
        activeIdentity={activeIdentity}
        keyChangeWarning={keyChangeWarning}
        keyChangeConfirmInput={keyChangeConfirmInput}
        setKeyChangeConfirmInput={setKeyChangeConfirmInput}
        activeChatContact={activeChatContact}
        currentMenu={currentMenu}
        onToggleContactBlock={handleToggleContactBlock}
        onReportContact={handleReportContactAbuse}
        onClearActiveChat={handleClearDirectChat}
        onCloseActiveChat={() => {
          setContactProfile(null);
          setActiveChatContact(null);
        }}
      />
      </div>
    </>
  );
}


