// useEmails — fixed-order orchestrator.
// All state/ref/effect/useCallback hooks stay in this file in their original
// order; the non-hook mailbox closures (sync/decrypt, compose, export/report)
// live in ./emails/* and are created below. Behaviour, storage keys, API calls
// and the returned object are unchanged.
import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../api';
import { uniqueUuids } from '../utils/uuid';
import { safeStorageJson } from '../utils/safeJson';
import { parseMailboxLabels } from './emails/mailHelpers';
import { createMailSync } from './emails/pollEmails';
import { createComposeActions } from './emails/composeActions';
import { createMailActions } from './emails/mailActions';

export default function useEmails({
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
  setChatMessages,
  verifyRecipientsAndRun
}) {
  const [inboxEmails, setInboxEmails] = useState([]);
  const [sentEmails, setSentEmails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [selectedMailProof, setSelectedMailProof] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeReplyTo, setComposeReplyTo] = useState(null);
  const [composeScheduledFor, setComposeScheduledFor] = useState('');
  const [isSmtpMode, setIsSmtpMode] = useState(false);
  const [composeError, setComposeError] = useState('');

  // Unified Mailbox States
  const [allMails, setAllMails] = useState([]);
  const [mailThreads, setMailThreads] = useState([]);
  const [mailboxFolder, setMailboxFolder] = useState('inbox');
  const [mailboxSearch, setMailboxSearch] = useState('');
  const [mailboxLabel, setMailboxLabel] = useState('');
  const [labelsList, setLabelsList] = useState([]);
  const [draftsList, setDraftsList] = useState([]);
  const [filterRules, setFilterRules] = useState([]);
  const [mailSettings, setMailSettings] = useState({ signature: '', locale: 'de', theme: 'dark', keyboardMode: 'default' });
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const activeDraftIdRef = useRef(null);

  // Storage / Attachment Upload
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadedMeta, setUploadedMeta] = useState(null);

  const knownMessageIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);
  const pubKeyCacheRef = useRef({});
  const decryptedMailsCacheRef = useRef(new Map());
  const processedFilterMsgIdsRef = useRef(new Set());

  // Reset known message tracking when activeIdentity changes
  useEffect(() => {
    decryptedMailsCacheRef.current.clear();
    if (!user?.id || !activeIdentity?.ID) {
      knownMessageIdsRef.current = new Set();
      isInitialLoadRef.current = true;
      activeDraftIdRef.current = null;
      processedFilterMsgIdsRef.current = new Set();
      return;
    }
    const storageKey = `gaia_seen_mail_notifications_${user.id}_${activeIdentity.ID}`;
    const cached = safeStorageJson(sessionStorage, storageKey, []);
    knownMessageIdsRef.current = new Set(Array.isArray(cached) ? cached : []);
    isInitialLoadRef.current = true;
    activeDraftIdRef.current = null;
    processedFilterMsgIdsRef.current = new Set();
  }, [activeIdentity?.ID, user?.id]);

  // Helper to mark messages as read locally and on the server.
  const markMessagesAsRead = useCallback((ids) => {
    const cleanIds = uniqueUuids(ids);
    if (!user || cleanIds.length === 0 || !activeIdentity?.ID) return;
    api.markMessagesRead(activeIdentity.ID, cleanIds).catch(() => {});
    const updates = cleanIds.map(id => ({
      messageId: id,
      folder: 'inbox',
      isRead: true
    }));
    api.updateMailboxStates(activeIdentity.ID, updates).catch(() => {});
  }, [user, activeIdentity]);

  // Mark selected email as read
  useEffect(() => {
    if (selectedMail && selectedMail.id) {
      if (selectedMail.messages) {
        const unreadIds = selectedMail.messages.filter(m => !m.isRead).map(m => m.id);
        if (unreadIds.length > 0) {
          markMessagesAsRead(unreadIds);
        }
      } else {
        markMessagesAsRead([selectedMail.id]);
      }
    }
  }, [selectedMail, markMessagesAsRead]);

  // Fetch selected mail proof when selectedMail changes
  useEffect(() => {
    async function loadProof() {
      setSelectedMailProof(null);
      if (selectedMail && selectedMail.id && !selectedMail.isSmtp && !selectedMail.messages) {
        try {
          const proof = await api.getMessageProof(selectedMail.id);
          setSelectedMailProof(proof);
        } catch (_) {}
      }
    }
    loadProof();
  }, [selectedMail]);

  // Load drafts, labels, filters, settings
  const fetchMailboxMetadata = useCallback(async () => {
    if (!activeIdentity?.ID) return;
    try {
      const [drafts, labels, filters, settings] = await Promise.all([
        api.getMailDrafts(activeIdentity.ID).catch(() => []),
        api.getMailLabels().catch(() => []),
        api.getMailFilters().catch(() => []),
        api.getMailSettings().catch(() => null)
      ]);
      setDraftsList(drafts || []);
      setLabelsList(labels || []);
      setFilterRules(filters || []);
      if (settings) {
        setMailSettings(settings);
      }
    } catch (_) {}
  }, [activeIdentity]);

  useEffect(() => {
    fetchMailboxMetadata();
  }, [activeIdentity, fetchMailboxMetadata]);

  // helper to group messages into threads
  const groupMessagesIntoThreads = useCallback((messages) => {
    const threads = [];
    const threadMap = new Map();

    const normalizeSubject = (sub) => {
      if (!sub) return '';
      return sub
        .replace(/^(re|fwd|aw|wg|antwort|weiterleitung):\s*/i, '')
        .trim()
        .toLowerCase();
    };

    const sorted = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const msg of sorted) {
      let threadKey = null;

      if (msg.replyTo && msg.replyTo.messageId) {
        for (const t of threads) {
          if (t.messages.some(m => m.id === msg.replyTo.messageId)) {
            threadKey = t.id;
            break;
          }
        }
      }

      if (!threadKey) {
        const normSub = normalizeSubject(msg.subject);
        if (normSub && normSub !== '[chat]') {
          threadKey = normSub;
        }
      }

      if (threadKey) {
        let thread = threadMap.get(threadKey);
        if (!thread) {
          thread = threads.find(t => t.key === threadKey);
        }
        if (thread) {
          thread.messages.push(msg);
          thread.latestMessage = msg;
          // Thread-level read status is true only if ALL messages are read
          thread.isRead = thread.messages.every(m => m.isRead);
          thread.isStarred = thread.isStarred || (msg.mailbox?.isStarred || false);
          thread.isImportant = thread.isImportant || (msg.mailbox?.isImportant || false);
          continue;
        }
      }

      const newThreadKey = msg.replyTo?.messageId || normalizeSubject(msg.subject) || msg.id;
      const newThread = {
        id: msg.id,
        key: newThreadKey,
        subject: msg.subject,
        messages: [msg],
        latestMessage: msg,
        isRead: msg.isRead,
        isStarred: msg.mailbox?.isStarred || false,
        isImportant: msg.mailbox?.isImportant || false,
        sender: msg.sender,
        senderGaia: msg.senderGaia,
        recipient: msg.recipient,
        recipientGaia: msg.recipientGaia,
        createdAt: msg.createdAt,
        untrusted: msg.untrusted,
        isSmtp: msg.isSmtp
      };

      threads.push(newThread);
      threadMap.set(newThreadKey, newThread);
    }

    return threads.sort((a, b) => new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt));
  }, []);

  const mailSync = createMailSync({
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    contacts,
    setContacts,
    user,
    filterRules,
    notificationPreferences,
    setAllMails,
    setMailThreads,
    setInboxEmails,
    setSentEmails,
    setChatMessages,
    groupMessagesIntoThreads,
    knownMessageIdsRef,
    isInitialLoadRef,
    pubKeyCacheRef,
    decryptedMailsCacheRef,
    processedFilterMsgIdsRef
  });

  const pollEmails = mailSync.pollEmails;

  const composeActions = createComposeActions({
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    isSmtpMode,
    composeTo,
    composeSubject,
    composeBody,
    composeReplyTo,
    composeScheduledFor,
    uploadedMeta,
    activeDraftIdRef,
    pollEmails,
    fetchMailboxMetadata,
    verifyRecipientsAndRun,
    triggerAlert,
    setComposeTo,
    setComposeSubject,
    setComposeBody,
    setComposeReplyTo,
    setComposeScheduledFor,
    setComposeError,
    setUploadProgress,
    setUploadFile,
    setUploadedMeta,
    setIsComposing
  });

  const mailActions = createMailActions({
    activeIdentity,
    derivedKeys,
    contacts,
    triggerAlert,
    showConfirm,
    t,
    pollEmails,
    setComposeTo,
    setComposeSubject,
    setComposeBody,
    setComposeReplyTo,
    setSelectedMail,
    setIsComposing
  });

  // Auto-save drafts logic when user is typing in composer
  useEffect(() => {
    if (!isComposing || isSmtpMode || !activeIdentity?.ID || (!composeTo && !composeSubject && !composeBody)) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSavingDraft(true);
      try {
        const draftPayload = {
          id: activeDraftIdRef.current || undefined,
          identityId: activeIdentity.ID,
          recipientGaia: composeTo,
          subject: composeSubject,
          body: composeBody,
          scheduledFor: composeScheduledFor ? new Date(composeScheduledFor).toISOString() : undefined,
          securityWarning: composeTo.includes('@') ? 'SMTP-Legacy: Nachricht verlässt den nativen GaiaCOM-Sicherheitskontext.' : ''
        };
        const saved = await api.saveMailDraft(draftPayload);
        if (saved && saved.id) {
          activeDraftIdRef.current = saved.id;
        }
        fetchMailboxMetadata();
      } catch (_) {}
      setIsSavingDraft(false);
    }, 4000); // Autosave every 4 seconds of idle typing

    return () => clearTimeout(timer);
  }, [isComposing, composeTo, composeSubject, composeBody, composeScheduledFor, activeIdentity, isSmtpMode, fetchMailboxMetadata]);

  // State mutations
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateMailboxState = useCallback(async (mail, patch) => {
    if (!activeIdentity?.ID || !mail) return;

    // Support thread objects which have a .messages array of individual messages
    const messagesToUpdate = mail.messages ? mail.messages : [mail];
    if (messagesToUpdate.length === 0) return;

    const updates = messagesToUpdate.map(m => {
      const currentBox = m.mailbox || {};
      return {
        messageId: m.id,
        folder: patch.folder !== undefined ? patch.folder : (currentBox.folder || 'inbox'),
        isRead: patch.isRead !== undefined ? patch.isRead : m.isRead,
        isStarred: patch.isStarred !== undefined ? patch.isStarred : (currentBox.isStarred || false),
        isImportant: patch.isImportant !== undefined ? patch.isImportant : (currentBox.isImportant || false),
        isSpam: patch.isSpam !== undefined ? patch.isSpam : (currentBox.isSpam || false),
        isArchived: patch.isArchived !== undefined ? patch.isArchived : (currentBox.isArchived || false),
        labels: patch.labels !== undefined
          ? parseMailboxLabels(patch.labels)
          : parseMailboxLabels(currentBox.labels),
        snoozedUntil: (patch.snoozedUntil !== undefined ? patch.snoozedUntil : currentBox.snoozedUntil) || undefined
      };
    });

    // Optimistically update locally
    setAllMails(prev => prev.map(m => {
      const update = updates.find(u => u.messageId === m.id);
      if (update) {
        return {
          ...m,
          isRead: update.isRead,
          mailbox: {
            ...m.mailbox,
            folder: update.folder,
            isRead: update.isRead,
            isStarred: update.isStarred,
            isImportant: update.isImportant,
            isSpam: update.isSpam,
            isArchived: update.isArchived,
            labels: parseMailboxLabels(update.labels),
            snoozedUntil: update.snoozedUntil
          }
        };
      }
      return m;
    }));

    try {
      await api.updateMailboxStates(activeIdentity.ID, updates);
      pollEmails();
    } catch (err) {
      triggerAlert('Fehler', 'Status konnte nicht synchronisiert werden: ' + err.message, 'danger');
    }
  }, [activeIdentity, pollEmails, triggerAlert]);

  const snoozeMail = useCallback(async (mail, untilDate) => {
    await updateMailboxState(mail, {
      folder: untilDate ? 'snoozed' : 'inbox',
      snoozedUntil: untilDate ? untilDate.toISOString() : ''
    });
    triggerAlert('Mail verschoben', untilDate ? 'Mail wurde auf ' + untilDate.toLocaleString() + ' verschoben.' : 'Snooze aufgehoben.');
  }, [updateMailboxState, triggerAlert]);

  const saveLabel = useCallback(async (labelName, color) => {
    if (!user) return;
    try {
      await api.saveMailLabel({ name: labelName, color });
      fetchMailboxMetadata();
      triggerAlert('Label gespeichert', 'Das Label "' + labelName + '" wurde erstellt.');
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }, [user, fetchMailboxMetadata, triggerAlert]);

  const saveFilterRule = useCallback(async (rule) => {
    try {
      await api.saveMailFilter(rule);
      fetchMailboxMetadata();
      triggerAlert('Regel erstellt', 'Filterregel erfolgreich gespeichert.');
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }, [fetchMailboxMetadata, triggerAlert]);

  const saveSettings = useCallback(async (settings) => {
    try {
      const saved = await api.saveMailSettings(settings);
      setMailSettings(saved);
      triggerAlert('Einstellungen gespeichert', 'Die Mailbox-Einstellungen wurden aktualisiert.');
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }, [triggerAlert]);

  return {
    inboxEmails, setInboxEmails,
    sentEmails, setSentEmails,
    selectedMail, setSelectedMail,
    selectedMailProof, setSelectedMailProof,
    isComposing, setIsComposing,
    composeTo, setComposeTo,
    composeSubject, setComposeSubject,
    composeBody, setComposeBody,
    composeReplyTo, setComposeReplyTo,
    composeScheduledFor, setComposeScheduledFor,
    isSmtpMode, setIsSmtpMode,
    composeError, setComposeError,
    uploadProgress, setUploadProgress,
    uploadFile, setUploadFile,
    uploadedMeta, setUploadedMeta,
    pollEmails,
    handleSendMail: composeActions.handleSendMail,
    handleReplyMail: mailActions.handleReplyMail,
    handleFileUpload: composeActions.handleFileUpload,
    handleReportMail: mailActions.handleReportMail,
    handleExportDisclosurePackage: mailActions.handleExportDisclosurePackage,
    resolveIdentityPublicKeys: mailActions.resolveIdentityPublicKeys,
    markMessagesAsRead,

    // New mailbox state exports
    allMails, setAllMails,
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
  };
}
