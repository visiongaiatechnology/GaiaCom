import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from './api';
import * as crypto from './crypto';
import AuthScreen from './components/auth/AuthScreen';
import UnlockScreen from './components/auth/UnlockScreen';
import SetupWizard from './components/auth/SetupWizard';
import GroupSettingsModal from './components/chat/GroupSettingsModal';
import { parseToGaiaID, displayGaiaID } from './utils/gaiaAddress';
import { sanitizeAvatarFile } from './utils/avatar';
import { useTranslation } from './utils/i18n';
import NavigationSidebar from './components/layout/NavigationSidebar';
import ListPane from './components/layout/ListPane';
import ChatPane from './components/chat/ChatPane';
import GroupChatPane from './components/chat/GroupChatPane';
import ComposerPane from './components/chat/ComposerPane';
import ReaderPane from './components/chat/ReaderPane';
import ProfilePane from './components/chat/ProfilePane';
import AddContactModal from './components/modals/AddContactModal';
import QuantumShieldModal from './components/modals/QuantumShieldModal';
import CreateGroupModal from './components/modals/CreateGroupModal';
import JoinGroupModal from './components/modals/JoinGroupModal';
import CreateChannelModal from './components/modals/CreateChannelModal';
import KeyChangeWarningModal from './components/modals/KeyChangeWarningModal';
import VaultPane from './components/chat/VaultPane';
import DropPane from './components/chat/DropPane';
import ContactProfileModal from './components/modals/ContactProfileModal';

// Utilities & Hooks
import { buildInitialKeyHistory, appendKeyHistory } from './utils/keyHistory';
import useGaiaAuth from './hooks/useGaiaAuth';
import useVault from './hooks/useVault';
import useGaiaDrop from './hooks/useGaiaDrop';
import useChat from './hooks/useChat';
import useEmails from './hooks/useEmails';

// Security invariant checked by adversarial tests:
// untrusted: !!(env.Untrusted || env.untrusted || isLegacySmtp)

export default function App() {
  const { language, changeLanguage, t } = useTranslation();
  // Theme Switching
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('gaia_theme') === 'light');

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
  const [currentMenu, setCurrentMenu] = useState('inbox'); // 'inbox', 'smtp_inbox', 'sent', 'groups', 'chat', 'contacts', 'profile'
  const [activeProfileSection, setActiveProfileSection] = useState(() => (typeof window !== 'undefined' && window.innerWidth > 992) ? 'edit' : null);
  const [identities, setIdentities] = useState([]);
  const [activeIdentity, setActiveIdentity] = useState(null);
  const [contacts, setContacts] = useState([]);

  // User Profile States
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('\u{1F916}');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [areKeysUnlocked, setAreKeysUnlocked] = useState(false);
  const [profilePasswordInput, setProfilePasswordInput] = useState('');
  const [profileUnlockError, setProfileUnlockError] = useState('');

  // Add Contact Modal States
  const [showAddContact, setShowAddContact] = useState(false);
  const [discoverGaiaId, setDiscoverGaiaId] = useState('');
  const [discoveredContact, setDiscoveredContact] = useState(null);
  const [discoverError, setDiscoverError] = useState('');
  const [contactProfile, setContactProfile] = useState(null);

  // Key change confirmation modal state (Platin UX)
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
      }
    } catch (_) {}
  }

  const handleSwitchIdentity = (ident) => {
    setActiveIdentity(ident);
    if (user && ident) {
      localStorage.setItem(`active_identity_${user.id}`, ident.GaiaID || ident.ID);
    }
  };

  const clearAllData = useCallback(() => {
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
    isLocked, setIsLocked,
    unlockPassword, setUnlockPassword,
    unlockError, setUnlockError,
    tempUserId, setTempUserId,
    tempUsername, setTempUsername,
    showWizard, setShowWizard,
    wizardStep, setWizardStep,
    copiedMnemonic, setCopiedMnemonic,
    wizardGaiaUsername, setWizardGaiaUsername,
    wizardDomain, setWizardDomain,
    wizardCustomDomain, setWizardCustomDomain,
    wizardFallbackNodes, setWizardFallbackNodes,
    wizardError, setWizardError,
    availableNodes, setAvailableNodes,
    serverVersion, setServerVersion,
    serverConsensus, setServerConsensus,
    handleWizardRegisterIdentity,
    handleGenerateMnemonic,
    handleAuthSubmit,
    handleUnlock,
    handleLogout,
    handleLock
  } = useGaiaAuth({
    triggerAlert,
    fetchIdentities: () => fetchIdentities(),
    clearAllData
  });

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
            triggerAlert('Abgebrochen', 'Sicherheitskritischer Schlüsselwechsel nicht bestätigt.', 'danger');
          }
        });
        return;
      }
    }
    runFn();
  }

  // 2. Vault Hook
  const {
    vaultUnlocked, setVaultUnlocked,
    vaultPasswordInput, setVaultPasswordInput,
    vaultError, setVaultError,
    vaultRecords, setVaultRecords,
    selectedVaultRecord, setSelectedVaultRecord,
    vaultDraftTitle, setVaultDraftTitle,
    vaultDraftCategory, setVaultDraftCategory,
    vaultDraftBody, setVaultDraftBody,
    handleUnlockVault,
    handleAddVaultRecord,
    handleDeleteVaultRecord,
    handleLockVault
  } = useVault({ user, triggerAlert });

  // 3. GaiaDrop Hook
  const {
    dropTargetInput, setDropTargetInput,
    dropSenderInput, setDropSenderInput,
    dropMessageInput, setDropMessageInput,
    dropStatus, setDropStatus,
    dropError, setDropError,
    gaiaDropInbox, setGaiaDropInbox,
    gaiaDropLoading, setGaiaDropLoading,
    gaiaDropError, setGaiaDropError,
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
    sentEmails, setSentEmails,
    selectedMail, setSelectedMail,
    selectedMailProof, setSelectedMailProof,
    isComposing, setIsComposing,
    composeTo, setComposeTo,
    composeSubject, setComposeSubject,
    composeBody, setComposeBody,
    composeReplyTo, setComposeReplyTo,
    isSmtpMode, setIsSmtpMode,
    composeError, setComposeError,
    readMessageIds, setReadMessageIds,
    uploadProgress, setUploadProgress,
    uploadFile, setUploadFile,
    uploadedMeta, setUploadedMeta,
    pollEmails,
    handleSendMail,
    handleReplyMail,
    handleFileUpload,
    handleReportMail,
    handleExportDisclosurePackage,
    resolveIdentityPublicKeys,
    markMessagesAsRead
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
    joinGroupHashInput, setJoinGroupHashInput,
    newChannelNameInput, setNewChannelNameInput,
    chatMessages, setChatMessages,
    activeChatContact, setActiveChatContact,
    chatInputText, setChatInputText,
    showEmojiPicker, setShowEmojiPicker,
    fetchRooms,
    fetchChannels,
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
    handleClearDirectChat,
    handleClearGroupChannel
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
      const cachedContacts = localStorage.getItem(`contacts_${user.id}`);
      if (cachedContacts) {
        setContacts(JSON.parse(cachedContacts));
      }
      // Load user profile details
      const cachedProfile = localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        setProfileDisplayName(parsed.displayName || user.username || '');
        setProfileBio(parsed.bio || '');
        setProfileAvatar(parsed.avatar || '\u{1F916}');
      } else {
        setProfileDisplayName(user.username || '');
        setProfileBio('Sicher verschlüsselt mit GaiaCOM');
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
  async function handleUnlockProfileKeys() {
    setProfileUnlockError('');
    if (!profilePasswordInput) return;
    try {
      const cachedEncrypted = localStorage.getItem('gaia_mnemonic_enc');
      if (!cachedEncrypted) throw new Error('Keine Mnemonic gefunden.');
      const encObj = JSON.parse(cachedEncrypted);
      const decMnemonic = await crypto.decryptMnemonic(encObj, profilePasswordInput);
      setMnemonic(decMnemonic);
      setAreKeysUnlocked(true);
      setProfilePasswordInput('');
    } catch (_) {
      setProfileUnlockError('Ungültiges Login-Passwort.');
    }
  }

  async function handleAvatarFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const sanitizedBase64 = await sanitizeAvatarFile(file);
      setProfileAvatar(sanitizedBase64);
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  function saveProfile(e) {
    if (e) e.preventDefault();
    if (!user) return;
    const profileData = {
      displayName: profileDisplayName,
      bio: profileBio,
      avatar: profileAvatar
    };
    localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
    setUser({ ...user, username: profileDisplayName });
    triggerAlert('Profil gespeichert', 'Dein dezentrales Benutzerprofil wurde lokal aktualisiert.');
  }

  async function handleChangePassword(e) {
    if (e) e.preventDefault();
    setPasswordChangeError('');
    if (newPasswordInput.length < 12) {
      setPasswordChangeError('Das neue Passwort muss mindestens 12 Zeichen haben.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('Die neuen Passwoerter stimmen nicht ueberein.');
      return;
    }
    try {
      await api.changePassword(currentPasswordInput, newPasswordInput);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      triggerAlert('Passwort aktualisiert', 'Dein GaiaCOM Login-Passwort wurde geaendert.');
    } catch (err) {
      setPasswordChangeError(err.message || 'Passwort konnte nicht geaendert werden.');
    }
  }

  async function handleDiscoverSubmit(e) {
    e.preventDefault();
    setDiscoverError('');
    setDiscoveredContact(null);
    if (!discoverGaiaId.trim()) return;

    try {
      const formatted = parseToGaiaID(discoverGaiaId);
      const res = await api.getPublicIdentity(formatted);
      if (res && res.publicRecord) {
        const pubRecord = JSON.parse(res.publicRecord);
        setDiscoveredContact({
          ID: res.id,
          gaiaID: res.gaiaID,
          displayName: res.displayName,
          publicKey: pubRecord.public_keys.identity,
          abuseScore: res.trustPassport?.abuseScore || res.abuseScore || { score: 0, escalationLevel: 0 },
          trustPassport: res.trustPassport,
          keyHistory: res.trustPassport?.keyHistory || buildInitialKeyHistory(pubRecord.public_keys.identity, true)
        });
      } else {
        setDiscoverError('Kontakt im föderierten Netz nicht gefunden.');
      }
    } catch (err) {
      setDiscoverError(err.message);
    }
  }

  function addDiscoveredContact() {
    if (!discoveredContact || !user) return;
    const existing = contacts.find(c => c.ID === discoveredContact.ID || c.gaiaID === discoveredContact.gaiaID);
    
    const saveContact = () => {
      const normalizedContact = {
        ...discoveredContact,
        keyHistory: existing && existing.publicKey !== discoveredContact.publicKey
          ? appendKeyHistory(existing, discoveredContact.publicKey, true)
          : (discoveredContact.keyHistory || buildInitialKeyHistory(discoveredContact.publicKey, true)),
        keyConfirmedAt: new Date().toISOString()
      };
      const updated = [...contacts.filter(c => c.ID !== discoveredContact.ID && c.gaiaID !== discoveredContact.gaiaID), normalizedContact];
      setContacts(updated);
      localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
      setShowAddContact(false);
      triggerAlert('Kontakt hinzugefügt', `${discoveredContact.displayName} wurde in Ihr Adressbuch eingetragen.`);
    };

    if (existing && existing.publicKey !== discoveredContact.publicKey) {
      showConfirm(
        t('key_change_warn_title') || 'Kryptographische Warnung',
        `Der öffentliche Schlüssel für ${discoveredContact.displayName} hat sich geändert!\n\nAlt: ${existing.publicKey.slice(0, 20)}...\nNeu: ${discoveredContact.publicKey.slice(0, 20)}...\n\nMöchtest du den neuen Schlüssel wirklich akzeptieren? (Dies kann ein Hinweis auf einen Man-in-the-Middle-Angriff sein!)`,
        saveContact,
        null,
        'Schlüssel akzeptieren',
        'Abbrechen',
        true
      );
    } else {
      saveContact();
    }
  }

  async function openContactProfile(gaiaID) {
    const formatted = parseToGaiaID(gaiaID);
    const localContact = contacts.find(c => parseToGaiaID(c.gaiaID) === formatted);
    try {
      let trustPassport = null;
      try {
        trustPassport = await api.getTrustPassport(formatted);
      } catch (_) {}
      if (localContact) {
        setContactProfile({
          ...localContact,
          trustPassport: trustPassport || localContact.trustPassport,
          keyHistory: localContact.keyHistory || buildInitialKeyHistory(localContact.publicKey, true)
        });
        return;
      }
      const res = await api.getPublicIdentity(formatted);
      if (res && res.publicRecord) {
        const pubRecord = JSON.parse(res.publicRecord);
        setContactProfile({
          ID: res.id,
          gaiaID: res.gaiaID,
          displayName: res.displayName,
          publicKey: pubRecord.public_keys.identity,
          abuseScore: trustPassport?.abuseScore || res.abuseScore || { score: 0, escalationLevel: 0 },
          trustPassport: trustPassport || res.trustPassport,
          keyHistory: trustPassport?.keyHistory || buildInitialKeyHistory(pubRecord.public_keys.identity, true)
        });
      }
    } catch (err) {
      triggerAlert('Profil nicht gefunden', err.message, 'danger');
    }
  }

  // Selection list based on menu
  const activeMailsList = currentMenu === 'inbox'
    ? inboxEmails.filter(mail => !mail.isSmtp)
    : currentMenu === 'smtp_inbox'
      ? inboxEmails.filter(mail => mail.isSmtp)
      : sentEmails;

  const unreadEmailsCount = inboxEmails.filter(mail => !mail.isSmtp && !readMessageIds.has(mail.id)).length;
  const unreadSmtpEmailsCount = inboxEmails.filter(mail => mail.isSmtp && !readMessageIds.has(mail.id)).length;

  const getUnreadChatCount = (contact) => {
    if (!activeIdentity) return 0;
    return chatMessages.filter(msg => 
      msg.sender === contact.gaiaID && 
      msg.recipient === activeIdentity.GaiaID && 
      !readMessageIds.has(msg.id)
    ).length;
  };

  const unreadChatsTotal = contacts.reduce((sum, c) => sum + getUnreadChatCount(c), 0);

  const getUnreadRoomCount = (room) => {
    if (!activeIdentity) return 0;
    return chatMessages.filter(msg => 
      msg.roomId === room.ID && 
      msg.sender !== activeIdentity.GaiaID && 
      msg.sender !== activeIdentity.ID && 
      !readMessageIds.has(msg.id)
    ).length;
  };

  const unreadRoomsTotal = rooms.reduce((sum, r) => sum + getUnreadRoomCount(r), 0);

  const formatBadgeCount = (count) => {
    if (count <= 0) return null;
    return count > 99 ? '99+' : count;
  };

  const unreadDropsCount = gaiaDropInbox.filter(drop => drop.status === 'new').length;

  const hasActiveContent = !!(
    selectedMail ||
    isComposing ||
    (currentMenu === 'chat' && activeChatContact) ||
    (currentMenu === 'groups' && activeRoom) ||
    (currentMenu === 'profile' && activeProfileSection) ||
    currentMenu === 'vault' ||
    (currentMenu === 'gaiadrop' && selectedDrop)
  );

  // --- RENDER SCREEN ---

  // Unlock Screen
  if (isLocked) {
    return (
      <UnlockScreen
        unlockPassword={unlockPassword}
        unlockError={unlockError}
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
        onUsernameChange={setUsernameInput}
        onPasswordChange={setPasswordInput}
        onMnemonicChange={setMnemonic}
        onRegisterToggle={() => {
          setIsRegister(!isRegister);
          setAuthError('');
        }}
        onGenerateMnemonic={handleGenerateMnemonic}
        onCopyMnemonic={() => {
          navigator.clipboard.writeText(mnemonic);
          setCopiedMnemonic(true);
        }}
        onRegSuccessClose={() => {
          setShowRegSuccessPopup(false);
          setUser({ id: tempUserId, username: usernameInput });
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
        wizardGaiaUsername={wizardGaiaUsername}
        wizardDomain={wizardDomain}
        wizardCustomDomain={wizardCustomDomain}
        wizardFallbackNodes={wizardFallbackNodes}
        availableNodes={availableNodes}
        wizardError={wizardError}
        derivedKeys={derivedKeys}
        t={t}
        onStepChange={setWizardStep}
        onUsernameChange={setWizardGaiaUsername}
        onDomainChange={setWizardDomain}
        onCustomDomainChange={setWizardCustomDomain}
        onFallbackNodesChange={setWizardFallbackNodes}
        onRegisterIdentity={handleWizardRegisterIdentity}
      />
    );
  }

  return (
    <div className={`app-container ${isLightMode ? 'light-mode' : 'dark-mode'} ${hasActiveContent ? 'has-active-content mobile-content-active' : ''} ${mailListCollapsed ? 'mail-list-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
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
      {!mailListCollapsed && (
        <ListPane
          currentMenu={currentMenu}
          contacts={contacts}
          setContacts={setContacts}
          rooms={rooms}
          activeRoom={activeRoom}
          setActiveRoom={setActiveRoom}
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
          readMessageIds={readMessageIds}
          getUnreadChatCount={getUnreadChatCount}
          getUnreadRoomCount={getUnreadRoomCount}
          formatBadgeCount={formatBadgeCount}
          setMailListCollapsed={setMailListCollapsed}
          setContactProfile={setContactProfile}
          openContactProfile={openContactProfile}
          vaultUnlocked={vaultUnlocked}
          vaultRecords={vaultRecords}
          selectedVaultRecord={selectedVaultRecord}
          setSelectedVaultRecord={setSelectedVaultRecord}
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
          setShowCreateGroupModal={setShowCreateGroupModal}
          setShowJoinGroupModal={setShowJoinGroupModal}
          activeProfileSection={activeProfileSection}
          setActiveProfileSection={setActiveProfileSection}
        />
      )}

      {/* COLUMN 3: READER / COMPOSER / PROFILE / CHAT PANE */}
      <main className="mail-content-pane" style={{ position: 'relative' }}>
        {hasActiveContent && currentMenu !== 'groups' && currentMenu !== 'gaiadrop' && (
          <button
            type="button"
            className="mobile-floating-menu mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
          >
            Menu
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

        {/* CHAT MODE */}
        {currentMenu === 'chat' && (
          <ChatPane
            activeChatContact={activeChatContact}
            chatMessages={chatMessages}
            activeIdentity={activeIdentity}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            handleSendChatMessage={handleSendChatMessage}
            setActiveChatContact={setActiveChatContact}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            handleDeleteChatMessage={(msgId) => handleDeleteChatMessage(msgId, setInboxEmails, setSentEmails)}
            handleClearDirectChat={handleClearDirectChat}
            openContactProfile={openContactProfile}
            t={t}
            displayGaiaID={displayGaiaID}
          />
        )}

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
          />
        )}

        {/* COMPOSER MODE */}
        {isComposing && currentMenu !== 'chat' && currentMenu !== 'profile' && currentMenu !== 'groups' && (
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
            t={t}
          />
        )}

        {/* READER MODE */}
        <ReaderPane
          selectedMail={selectedMail}
          selectedMailProof={selectedMailProof}
          activeIdentity={activeIdentity}
          handleReplyMail={handleReplyMail}
          handleExportDisclosurePackage={handleExportDisclosurePackage}
          handleReportMail={handleReportMail}
          setSelectedMail={setSelectedMail}
          isComposing={isComposing}
          currentMenu={currentMenu}
          openContactProfile={openContactProfile}
          t={t}
        />

        {/* PROFILE MODE */}
        {currentMenu === 'profile' && (
          <ProfilePane
            activeIdentity={activeIdentity}
            displayGaiaID={displayGaiaID}
            profileAvatar={profileAvatar}
            setProfileAvatar={setProfileAvatar}
            profileDisplayName={profileDisplayName}
            setProfileDisplayName={setProfileDisplayName}
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
          />
        )}

        {/* VAULT MODE */}
        {currentMenu === 'vault' && (
          <VaultPane
            vaultUnlocked={vaultUnlocked}
            vaultPasswordInput={vaultPasswordInput}
            setVaultPasswordInput={setVaultPasswordInput}
            vaultError={vaultError}
            vaultRecords={vaultRecords}
            vaultDraftTitle={vaultDraftTitle}
            setVaultDraftTitle={setVaultDraftTitle}
            vaultDraftCategory={vaultDraftCategory}
            setVaultDraftCategory={setVaultDraftCategory}
            vaultDraftBody={vaultDraftBody}
            setVaultDraftBody={setVaultDraftBody}
            handleUnlockVault={handleUnlockVault}
            handleAddVaultRecord={handleAddVaultRecord}
            handleDeleteVaultRecord={handleDeleteVaultRecord}
            handleLockVault={handleLockVault}
            selectedVaultRecord={selectedVaultRecord}
            setSelectedVaultRecord={setSelectedVaultRecord}
            t={t}
            triggerAlert={triggerAlert}
          />
        )}

        {/* GAIADROP MODE */}
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
      </main>

      {/* CUSTOM ALERTS MODALS */}
      {alertConfig && (
        <div className="popup-overlay">
          <div className="popup-card glass-panel" style={{ borderColor: alertConfig.type === 'danger' ? 'var(--danger)' : alertConfig.type === 'warning' ? 'var(--warning)' : 'var(--accent-cyan)' }}>
            <div className="popup-icon" style={{ 
              color: alertConfig.type === 'danger' ? 'var(--danger)' : alertConfig.type === 'warning' ? 'var(--warning)' : 'var(--accent-cyan)',
              background: alertConfig.type === 'danger' ? 'var(--danger-glow)' : alertConfig.type === 'warning' ? 'var(--warning-glow)' : 'rgba(0, 242, 254, 0.1)'
            }}>
              {alertConfig.type === 'danger' ? '!' : alertConfig.type === 'warning' ? '!' : 'OK'}
            </div>
            <div className="popup-title">{alertConfig.title}</div>
            <div className="popup-text">{alertConfig.text}</div>
            <button className="btn-primary" onClick={() => setAlertConfig(null)}>{t('close') || 'Schließen'}</button>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM MODALS */}
      {confirmConfig && (
        <div className="popup-overlay">
          <div className="popup-card glass-panel" style={{ borderColor: confirmConfig.danger ? 'var(--danger)' : 'var(--accent-cyan)', maxWidth: '480px' }}>
            <div className="popup-icon" style={{ 
              color: confirmConfig.danger ? 'var(--danger)' : 'var(--accent-cyan)',
              background: confirmConfig.danger ? 'var(--danger-glow)' : 'rgba(0, 242, 254, 0.1)'
            }}>
              ?
            </div>
            <div className="popup-title">{confirmConfig.title}</div>
            <div className="popup-text" style={{ whiteSpace: 'pre-wrap', marginBottom: '20px' }}>{confirmConfig.text}</div>
            <div className="modal-actions" style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' }}>
              {confirmConfig.showThreeButtons ? (
                <>
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      confirmConfig.onConfirm();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.confirmText}
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      confirmConfig.onConfirmAlternative();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.confirmAlternativeText}
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      if (confirmConfig.onCancel) confirmConfig.onCancel();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.cancelText}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      if (confirmConfig.onCancel) confirmConfig.onCancel();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.cancelText}
                  </button>
                  <button 
                    className="btn-primary" 
                    style={confirmConfig.danger ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : {}}
                    onClick={() => {
                      confirmConfig.onConfirm();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.confirmText}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONTACT PROFILE (TRUST PASSPORT) */}
      <ContactProfileModal
        show={!!contactProfile}
        onClose={() => setContactProfile(null)}
        contactProfile={contactProfile}
        displayGaiaID={displayGaiaID}
        t={t}
      />

      {/* MODAL: ADD CONTACT */}
      <AddContactModal
        show={showAddContact}
        onClose={() => setShowAddContact(false)}
        discoverGaiaId={discoverGaiaId}
        setDiscoverGaiaId={setDiscoverGaiaId}
        handleDiscoverSubmit={handleDiscoverSubmit}
        discoverError={discoverError}
        discoveredContact={discoveredContact}
        addDiscoveredContact={addDiscoveredContact}
        displayGaiaID={displayGaiaID}
        t={t}
      />

      {/* MODAL: QUANTUM SHIELD EXPLANATION */}
      <QuantumShieldModal
        show={showQuantumShieldModal}
        onClose={() => setShowQuantumShieldModal(false)}
        t={t}
      />

      {/* MODAL: CREATE GROUP */}
      <CreateGroupModal
        show={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        groupNameInput={groupNameInput}
        setGroupNameInput={setGroupNameInput}
        groupDescriptionInput={groupDescriptionInput}
        setGroupDescriptionInput={setGroupDescriptionInput}
        groupAvatarInput={groupAvatarInput}
        setGroupAvatarInput={setGroupAvatarInput}
        handleCreateRoom={handleCreateRoom}
        isCrisisRoomInput={isCrisisRoomInput}
        setIsCrisisRoomInput={setIsCrisisRoomInput}
        t={t}
      />

      {/* MODAL: JOIN GROUP */}
      <JoinGroupModal
        show={showJoinGroupModal}
        onClose={() => setShowJoinGroupModal(false)}
        joinGroupHashInput={joinGroupHashInput}
        setJoinGroupHashInput={setJoinGroupHashInput}
        handleJoinRoom={handleJoinRoom}
        t={t}
      />

      {/* MODAL: CREATE CHANNEL */}
      <CreateChannelModal
        show={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        newChannelNameInput={newChannelNameInput}
        setNewChannelNameInput={setNewChannelNameInput}
        handleCreateChannel={handleCreateChannel}
        t={t}
      />

      {/* MODAL: GROUP SETTINGS */}
      {showGroupSettingsModal && (
        <GroupSettingsModal
          name={editGroupName}
          description={editGroupDescription}
          avatar={editGroupAvatar}
          isCrisis={editGroupIsCrisis}
          onIsCrisisChange={setEditGroupIsCrisis}
          onNameChange={setEditGroupName}
          onDescriptionChange={setEditGroupDescription}
          onAvatarChange={setEditGroupAvatar}
          onSubmit={handleUpdateGroupSettings}
          onClose={() => setShowGroupSettingsModal(false)}
          onDelete={handleDeleteGroup}
        />
      )}

      {/* KEY CHANGE WARNING MODAL */}
      <KeyChangeWarningModal
        warning={keyChangeWarning}
        confirmInput={keyChangeConfirmInput}
        setConfirmInput={setKeyChangeConfirmInput}
        displayGaiaID={displayGaiaID}
        t={t}
      />
    </div>
  );
}
