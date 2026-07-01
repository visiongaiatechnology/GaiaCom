// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { parseToGaiaID, displayGaiaID } from '../utils/gaiaAddress';
import { parsePayload } from '../utils/payload';
import { buildInitialKeyHistory } from '../utils/keyHistory';
import { safeJsonParse, safeStorageJson } from '../utils/safeJson';
import { assertSecureExportClean, sanitizeSecureExport } from '../utils/secureExport';
import { uniqueUuids } from '../utils/uuid';

function parsePublicRecordValue(recordValue) {
  if (!recordValue) return null;
  if (typeof recordValue === 'string') {
    return safeJsonParse(recordValue, null);
  }
  if (typeof recordValue === 'object') return recordValue;
  return null;
}

function parseMailboxLabels(labels) {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === 'string') {
    const parsed = safeJsonParse(labels, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

const GAIA_MAIL_MAX_BYTES = 10 * 1024 * 1024 * 1024;
const AES_GCM_TAG_BYTES = 16;
const STORAGE_CHUNK_BYTES = 1024 * 1024;
const GAIA_MAIL_CHUNK_BYTES = STORAGE_CHUNK_BYTES - AES_GCM_TAG_BYTES;

function encryptedChunkedSize(plainSize) {
  const chunks = Math.max(1, Math.ceil(plainSize / GAIA_MAIL_CHUNK_BYTES));
  return plainSize + (chunks * AES_GCM_TAG_BYTES);
}

async function computeSha256Hex(bufferSource) {
  const digest = await window.crypto.subtle.digest('SHA-256', bufferSource);
  return crypto.bytesToHex(new Uint8Array(digest));
}

function randomHex(byteLength) {
  return crypto.bytesToHex(window.crypto.getRandomValues(new Uint8Array(byteLength)));
}

export default function useEmails({
  activeIdentity,
  derivedKeys,
  contacts,
  setContacts,
  user,
  triggerAlert,
  showConfirm,
  t,
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

  async function fetchOrGetSenderPubKeys(identityGaiaID) {
    const match = contacts.find(c => c.gaiaID === identityGaiaID);
    if (match?.publicKey && match?.mldsa87Public) {
      return {
        identity: match.publicKey,
        mldsa87: match.mldsa87Public
      };
    }

    if (pubKeyCacheRef.current[identityGaiaID]) {
      const cached = pubKeyCacheRef.current[identityGaiaID];
      if (typeof cached === 'string') {
        return { identity: cached, mldsa87: '' };
      }
      return cached;
    }

    if (pubKeyCacheRef.current[identityGaiaID + '_promise']) {
      return pubKeyCacheRef.current[identityGaiaID + '_promise'];
    }

    const promise = (async () => {
      try {
        const res = await api.getPublicIdentity(identityGaiaID);
        if (res && res.publicRecord) {
          const pubRecord = parsePublicRecordValue(res.publicRecord);
          const pubKey = pubRecord?.public_keys?.identity;
          const mldsa87Public = pubRecord?.public_keys?.mldsa87 || '';
          if (!pubKey) return null;

          const senderKeys = {
            identity: pubKey,
            mldsa87: mldsa87Public
          };
          pubKeyCacheRef.current[identityGaiaID] = senderKeys;

          const newContact = {
            ID: res.id,
            gaiaID: res.gaiaID,
            displayName: res.displayName,
            publicKey: pubKey,
            mldsa87Public,
            abuseScore: res.trustPassport?.abuseScore || res.abuseScore,
            trustPassport: res.trustPassport,
            keyHistory: res.trustPassport?.keyHistory || buildInitialKeyHistory(pubKey, true),
            keyConfirmedAt: new Date().toISOString()
          };
          api.saveMailContact({
            id: newContact.ID,
            gaiaId: newContact.gaiaID,
            displayName: newContact.displayName,
            publicKey: newContact.publicKey,
            blocked: !!newContact.blocked
          }).catch(() => {});
          setContacts(prev => {
            const updated = [...prev.filter(c => c.ID !== res.id), newContact];
            localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
            return updated;
          });

          return senderKeys;
        }
      } catch (_) {}
      return null;
    })();

    pubKeyCacheRef.current[identityGaiaID + '_promise'] = promise;
    return promise;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function pollEmails() {
    if (!activeIdentity || !derivedKeys) return;
    try {
      // Query messages with the mailbox endpoint, returning all folders at once
      const envelopes = await api.getMailboxMessages(activeIdentity.ID, { folder: 'all', limit: 200 });
      const allDecrypted = [];
      const chats = [];
      const serverReadIds = [];

      for (const env of envelopes) {
        const envId = env.ID || env.id;
        if (env.IsRead || env.isRead || env.mailbox?.isRead) {
          serverReadIds.push(envId);
        }

        if (decryptedMailsCacheRef.current.has(envId)) {
          const cached = decryptedMailsCacheRef.current.get(envId);
          const isReadState = serverReadIds.includes(envId) || !!(env.mailbox?.isRead);
          const deliveredState = !!(env.Delivered || env.delivered);
          cached.isRead = isReadState;
          cached.delivered = deliveredState;
          cached.editedAt = env.editedAt || env.EditedAt || '';
          cached.readReceiptSourceId = env.readReceiptSourceId || env.ReadReceiptSourceID || '';
          cached.reactions = env.reactions || env.Reactions || {};
          cached.reactedByMe = env.reactedByMe || env.ReactedByMe || {};
          cached.mailbox = env.mailbox || cached.mailbox;
          cached.mailbox.isRead = isReadState;

          if (cached.subject === '[CHAT]') {
            chats.push(cached);
          } else {
            allDecrypted.push(cached);
          }
          continue;
        }

        let plaintextSubject = '(Kein Betreff)';
        let plaintextBody = '';
        let attachments = [];
        let isLegacySmtp = false;
        let senderGaia = displayGaiaID(env.Sender);
        let recipientGaia = displayGaiaID(env.Recipient);
        let channelId = null;
        let roomId = null;
        let clientMessageId = null;
        let replyTo = null;
        let topSecret = false;
        let decryptedRecipientGaia = null;

        try {
          const payloadObj = parsePayload(env.Payload);
          if (payloadObj) {
            if (payloadObj.type === 'smtp.legacy' || payloadObj.type === 'system') {
              isLegacySmtp = (payloadObj.type === 'smtp.legacy');
              plaintextSubject = payloadObj.subject;
              plaintextBody = payloadObj.body;
              attachments = payloadObj.attachments || [];
            } else {
              const isSelf = env.Sender === activeIdentity.GaiaID || env.Sender === activeIdentity.ID;
              const senderPubKeys = isSelf
                ? { identity: derivedKeys.sign.public, mldsa87: derivedKeys.mldsa87?.public || '' }
                : await fetchOrGetSenderPubKeys(env.Sender);
              
              if (senderPubKeys?.identity) {
                const decryptedStr = await crypto.decryptPayload(
                  payloadObj,
                  senderPubKeys.identity,
                  { pke: derivedKeys.pke.public, box: derivedKeys.box.public, identity: derivedKeys.sign.public },
                  { pke: derivedKeys.pke.private, box: derivedKeys.box.private },
                  { expectedSenderMldsa87PubHex: senderPubKeys.mldsa87 || '' }
                );
                
                const decryptedData = safeJsonParse(decryptedStr, null);
                if (!decryptedData) throw new Error('Invalid decrypted envelope.');
                plaintextSubject = decryptedData.subject || '(Kein Betreff)';
                plaintextBody = decryptedData.body || '';
                attachments = decryptedData.attachments || [];
                channelId = decryptedData.channelId || null;
                roomId = decryptedData.roomId || null;
                clientMessageId = decryptedData.clientMessageId || null;
                replyTo = decryptedData.replyTo || null;
                topSecret = decryptedData.topSecret === true || payloadObj.algorithm_suite === 'GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87';
                decryptedRecipientGaia = decryptedData.recipientGaia || null;
              } else {
                plaintextSubject = '[Verschlüsselt - Schlüssel fehlen]';
              }
            }
          }
        } catch (err) {
          plaintextSubject = '[Dekodierungsfehler]';
          plaintextBody = `Nachricht konnte nicht entschlüsselt werden: ${err.message}`;
        }

        const isReadState = serverReadIds.includes(env.ID || env.id) || !!(env.mailbox?.isRead);
        const deliveredState = !!(env.Delivered || env.delivered);

        const emailModel = {
          id: env.ID || env.id,
          sender: env.Sender,
          senderGaia,
          recipient: decryptedRecipientGaia || env.Recipient,
          recipientGaia: decryptedRecipientGaia ? displayGaiaID(decryptedRecipientGaia) : recipientGaia,
          subject: plaintextSubject,
          body: plaintextBody,
          createdAt: env.CreatedAt || env.createdAt,
          untrusted: !!(env.Untrusted || env.untrusted || isLegacySmtp || env.mailbox?.isSpam),
          isSmtp: isLegacySmtp,
          attachments,
          rawPayload: env.Payload,
          isRead: isReadState,
          delivered: deliveredState,
          editedAt: env.editedAt || env.EditedAt || '',
          readReceiptSourceId: env.readReceiptSourceId || env.ReadReceiptSourceID || '',
          channelId,
          roomId,
          clientMessageId: env.clientMessageId || env.ClientMessageID || clientMessageId,
          replyTo,
          topSecret,
          reactions: env.reactions || env.Reactions || {},
          reactedByMe: env.reactedByMe || env.ReactedByMe || {},
          mailbox: env.mailbox || {
            folder: env.Sender === activeIdentity.GaiaID || env.Sender === activeIdentity.ID ? 'sent' : 'inbox',
            isRead: isReadState,
            isStarred: false,
            isImportant: false,
            isSpam: false,
            isArchived: false,
            labels: []
          }
        };

        decryptedMailsCacheRef.current.set(envId, emailModel);

        if (plaintextSubject === '[CHAT]') {
          chats.push(emailModel);
        } else {
          allDecrypted.push(emailModel);
        }
      }

      // Evaluate client-side filter rules on incoming messages
      const filterUpdates = [];
      const processedFilterIds = processedFilterMsgIdsRef.current;

      for (const emailModel of allDecrypted) {
        const isIncoming = emailModel.sender !== activeIdentity.GaiaID && emailModel.sender !== activeIdentity.ID;
        if (isIncoming && !processedFilterIds.has(emailModel.id)) {
          processedFilterIds.add(emailModel.id);
          
          let changed = false;
          let nextRead = emailModel.isRead;
          let nextStarred = emailModel.mailbox?.isStarred || false;
          let nextImportant = emailModel.mailbox?.isImportant || false;
          let nextLabels = parseMailboxLabels(emailModel.mailbox?.labels);

          for (const rule of filterRules) {
            const senderMatch = !rule.triggerSender || 
              (emailModel.senderGaia && emailModel.senderGaia.toLowerCase().includes(rule.triggerSender.toLowerCase())) ||
              (emailModel.sender && emailModel.sender.toLowerCase().includes(rule.triggerSender.toLowerCase()));
            const subjectMatch = !rule.triggerSubject || 
              (emailModel.subject && emailModel.subject.toLowerCase().includes(rule.triggerSubject.toLowerCase()));

            if (senderMatch && subjectMatch) {
              if (rule.action === 'read' && !nextRead) {
                nextRead = true;
                changed = true;
              } else if (rule.action === 'star' && !nextStarred) {
                nextStarred = true;
                changed = true;
              } else if (rule.action === 'important' && !nextImportant) {
                nextImportant = true;
                changed = true;
              } else if (rule.action === 'label' && rule.actionLabel && !nextLabels.includes(rule.actionLabel)) {
                nextLabels.push(rule.actionLabel);
                changed = true;
              }
            }
          }

          if (changed) {
            emailModel.isRead = nextRead;
            if (!emailModel.mailbox) {
              emailModel.mailbox = { folder: 'inbox', isRead: nextRead, isStarred: nextStarred, isImportant: nextImportant, isSpam: false, isArchived: false, labels: nextLabels };
            } else {
              emailModel.mailbox.isRead = nextRead;
              emailModel.mailbox.isStarred = nextStarred;
              emailModel.mailbox.isImportant = nextImportant;
              emailModel.mailbox.labels = nextLabels;
            }

            filterUpdates.push({
              messageId: emailModel.id,
              folder: emailModel.mailbox.folder || 'inbox',
              isRead: nextRead,
              isStarred: nextStarred,
              isImportant: nextImportant,
              isSpam: emailModel.mailbox.isSpam || false,
              isArchived: emailModel.mailbox.isArchived || false,
              labels: JSON.stringify(nextLabels),
              snoozedUntil: emailModel.mailbox.snoozedUntil || ''
            });
          }
        }
      }

      if (filterUpdates.length > 0) {
        api.updateMailboxStates(activeIdentity.ID, filterUpdates)
          .then(() => {
            pollEmails();
          })
          .catch(() => {});
      }

      setAllMails(allDecrypted);
      const threads = groupMessagesIntoThreads(allDecrypted);
      setMailThreads(threads);

      // Maintain split list states for backwards compatibility in AppMainContent / ListPane
      const incoming = allDecrypted.filter(m => m.sender !== activeIdentity.GaiaID && m.sender !== activeIdentity.ID);
      const outgoing = allDecrypted.filter(m => m.sender === activeIdentity.GaiaID || m.sender === activeIdentity.ID);
      setInboxEmails(incoming);
      setSentEmails(outgoing);

      const dedupedChats = [];
      const chatKeys = new Set();
      for (const chat of chats.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
        const key = chat.clientMessageId
          ? `${chat.clientMessageId}:${chat.channelId || 'direct'}:${chat.sender}:${chat.recipient}`
          : `${chat.id}:${chat.channelId || 'direct'}`;
        if (chatKeys.has(key)) continue;
        chatKeys.add(key);
        dedupedChats.push(chat);
      }
      setChatMessages(dedupedChats);

      // Web Notifications
      const allReceivedMessages = [...incoming, ...dedupedChats].filter(msg => {
        return msg.sender !== activeIdentity?.GaiaID && msg.sender !== activeIdentity?.ID;
      });

      const newMessages = [];
      for (const msg of allReceivedMessages) {
        if (!knownMessageIdsRef.current.has(msg.id)) {
          knownMessageIdsRef.current.add(msg.id);
          if (!isInitialLoadRef.current && !msg.isRead) {
            newMessages.push(msg);
          }
        }
      }

      if (user?.id && activeIdentity?.ID) {
        try {
          sessionStorage.setItem(
            `gaia_seen_mail_notifications_${user.id}_${activeIdentity.ID}`,
            JSON.stringify(Array.from(knownMessageIdsRef.current))
          );
        } catch (_) {}
      }

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }

      if (newMessages.length > 0) {
        newMessages
          .filter(msg => msg.subject !== '[CHAT]')
          .forEach(msg => {
            const title = `Neue E-Mail: ${msg.subject}`;
            const body = msg.body.length > 60 ? msg.body.substring(0, 60) + '...' : msg.body;
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(title, { body });
            }
          });
      }
    } catch (_) {}
  }

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
      triggerAlert('Settings gespeichert', 'Die Mailbox-Einstellungen wurden aktualisiert.');
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }, [triggerAlert]);

  // --- File Upload via backend chunks ---
  async function handleFileUpload(e) {
    let file = e.target.files[0];
    if (!file) return;

    if (isSmtpMode) {
      const maxSmtpBytes = 30 * 1024 * 1024;
      if (file.size > maxSmtpBytes) {
        triggerAlert('SMTP Limit überschritten', 'Klassische SMTP-Mails unterstützen maximal 30MB Dateianhänge. Bitte wähle eine kleinere Datei.', 'danger');
        return;
      }
    } else {
      const maxGaiaBytes = GAIA_MAIL_MAX_BYTES;
      if (file.size > maxGaiaBytes) {
        triggerAlert('Sicherheitslimit überschritten', 'Verschlüsselte GaiaCOM-Anhänge dürfen maximal 10GB groß sein.', 'danger');
        return;
      }
    }

    setUploadProgress(5);
    setUploadFile(file);
    setUploadedMeta(null);

    try {
      if (isSmtpMode) {
        setUploadProgress(100);
        setUploadedMeta({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          mode: 'smtp-legacy-metadata'
        });
        triggerAlert('SMTP-Anhang vorgemerkt', `Die Datei "${file.name}" wurde fuer den Legacy-SMTP-Pfad markiert.`);
        return;
      }

      if (file.type.startsWith('image/')) {
        setUploadProgress(10);
        file = await crypto.stripImageMetadata(file);
        setUploadFile(file);
      }
      setUploadProgress(20);

      const rawKey = window.crypto.getRandomValues(new Uint8Array(32));
      const keyHex = crypto.bytesToHex(rawKey);
      const cryptoKey = await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
      const encryptedSize = encryptedChunkedSize(file.size);
      const envelopeHashSource = new TextEncoder().encode(`${file.name}:${file.size}:${file.type}:${Date.now()}:${randomHex(16)}`);
      const fileHash = await computeSha256Hex(envelopeHashSource);
      const initRes = await api.initUpload(file.name, encryptedSize, 'application/octet-stream', fileHash);
      const fileId = initRes.fileId;
      const totalChunks = Math.max(1, Math.ceil(file.size / GAIA_MAIL_CHUNK_BYTES));
      const chunks = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * GAIA_MAIL_CHUNK_BYTES;
        const end = Math.min(start + GAIA_MAIL_CHUNK_BYTES, file.size);
        const plainBuffer = await file.slice(start, end).arrayBuffer();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          cryptoKey,
          plainBuffer
        );
        const encryptedChunk = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
        const chunkHash = await computeSha256Hex(encryptedBuffer);

        await api.uploadChunk(fileId, i, chunkHash, encryptedChunk);
        chunks.push({
          index: i,
          ivHex: crypto.bytesToHex(iv),
          plainSize: end - start,
          cipherSize: encryptedBuffer.byteLength
        });
        setUploadProgress(Math.floor(20 + ((i + 1) / totalChunks) * 75));
      }

      await api.completeUpload(fileId);
      setUploadProgress(100);

      const fileMeta = {
        fileId,
        name: file.name,
        size: file.size,
        encryptedSize,
        mimeType: file.type || 'application/octet-stream',
        hash: fileHash,
        keyHex,
        encryptionMode: 'aes-gcm-chunked-v1',
        chunkSize: GAIA_MAIL_CHUNK_BYTES,
        chunks
      };

      setUploadedMeta(fileMeta);
      triggerAlert('Datei verschlüsselt', `Die Datei "${file.name}" wurde lokal quantensicher zerteilt, verschlüsselt und hochgeladen.`);
    } catch (err) {
      triggerAlert('Upload failed', err.message, 'danger');
      setUploadFile(null);
    }
  }

  async function handleSendMail(e) {
    e.preventDefault();
    setComposeError('');

    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim() || !activeIdentity) {
      setComposeError('Empfänger, Betreff und Nachricht sind erforderlich.');
      return;
    }

    try {
      const attachmentsList = uploadedMeta ? [uploadedMeta] : [];

      if (composeScheduledFor) {
        if (isSmtpMode) {
          const draftPayload = {
            id: activeDraftIdRef.current || undefined,
            identityId: activeIdentity.ID,
            recipientGaia: composeTo,
            subject: composeSubject,
            body: composeBody,
            attachments: attachmentsList,
            replyTo: composeReplyTo,
            scheduledFor: new Date(composeScheduledFor).toISOString(),
            securityWarning: 'SMTP-Legacy: Nachricht verlässt den nativen GaiaCOM-Sicherheitskontext.'
          };
          await api.saveMailDraft(draftPayload);
        } else {
          const recipientGaiaFormat = parseToGaiaID(composeTo);
          const res = await api.getPublicIdentity(recipientGaiaFormat);
          if (!res || !res.publicRecord) {
            throw new Error(`Empfänger-Identität "${recipientGaiaFormat}" nicht gefunden.`);
          }
          const pubRecord = parsePublicRecordValue(res.publicRecord);
          if (!pubRecord?.public_keys) {
            throw new Error('Empfaenger besitzt keinen gueltigen Schluesselsatz.');
          }

          const emailContent = {
            subject: composeSubject,
            body: composeBody,
            attachments: attachmentsList,
            replyTo: composeReplyTo,
            recipientGaia: recipientGaiaFormat
          };

          const encryptedEnvelope = await crypto.encryptPayload(
            JSON.stringify(emailContent),
            { pke: pubRecord.public_keys.pke, box: pubRecord.public_keys.box, identity: pubRecord.public_keys.identity },
            derivedKeys.sign.private
          );

          const selfEnvelope = await crypto.encryptPayload(
            JSON.stringify(emailContent),
            { pke: derivedKeys.pke.public, box: derivedKeys.box.public, identity: derivedKeys.sign.public },
            derivedKeys.sign.private
          );

          const envelopeDraftData = {
            recipientEnvelopes: [
              {
                recipientId: res.id,
                envelope: encryptedEnvelope
              }
            ],
            selfEnvelope: selfEnvelope
          };

          if (attachmentsList.length > 0) {
            await api.grantAttachmentsAccess(attachmentsList, [res.id, activeIdentity.ID]);
          }

          const draftPayload = {
            id: activeDraftIdRef.current || undefined,
            identityId: activeIdentity.ID,
            recipientGaia: composeTo,
            subject: composeSubject,
            body: composeBody,
            attachments: attachmentsList,
            replyTo: composeReplyTo,
            scheduledFor: new Date(composeScheduledFor).toISOString(),
            envelopeDraft: JSON.stringify(envelopeDraftData)
          };
          await api.saveMailDraft(draftPayload);
        }
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeReplyTo(null);
        setComposeScheduledFor('');
        setUploadFile(null);
        setUploadedMeta(null);
        setUploadProgress(0);
        setIsComposing(false);
        activeDraftIdRef.current = null;
        fetchMailboxMetadata();
        triggerAlert('Versand geplant', `Der verzögerte Versand wurde für ${new Date(composeScheduledFor).toLocaleString()} geplant.`);
        return;
      }

      if (isSmtpMode) {
        await api.sendSmtpMail(
          activeIdentity.ID,
          composeTo.trim(),
          composeSubject.trim(),
          composeBody,
          attachmentsList
        );
        if (activeDraftIdRef.current) {
          await api.deleteMailDraft(activeDraftIdRef.current).catch(() => {});
          activeDraftIdRef.current = null;
        }
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeReplyTo(null);
        setUploadFile(null);
        setUploadedMeta(null);
        setUploadProgress(0);
        setIsComposing(false);
        fetchMailboxMetadata();
        await pollEmails();
        triggerAlert('SMTP gesendet', 'Legacy-SMTP Mail wurde gesendet und rot als unsichere Nachricht im Ausgang markiert.', 'warning');
        return;
      } else {
        const recipientGaiaFormat = parseToGaiaID(composeTo);
        const res = await api.getPublicIdentity(recipientGaiaFormat);
        if (!res || !res.publicRecord) {
          throw new Error(`Empfänger-Identität "${recipientGaiaFormat}" nicht gefunden.`);
        }
        const pubRecord = parsePublicRecordValue(res.publicRecord);
        if (!pubRecord?.public_keys) {
          throw new Error('Empfaenger besitzt keinen gueltigen Schluesselsatz.');
        }

        verifyRecipientsAndRun(
          [res.gaiaID],
          [pubRecord],
          async () => {
            try {
              const emailContent = {
                subject: composeSubject,
                body: composeBody,
                attachments: attachmentsList,
                replyTo: composeReplyTo,
                recipientGaia: recipientGaiaFormat
              };

              const encryptedEnvelope = await crypto.encryptPayload(
                JSON.stringify(emailContent),
                { pke: pubRecord.public_keys.pke, box: pubRecord.public_keys.box, identity: pubRecord.public_keys.identity },
                derivedKeys.sign.private
              );

              const selfEnvelope = await crypto.encryptPayload(
                JSON.stringify(emailContent),
                { pke: derivedKeys.pke.public, box: derivedKeys.box.public, identity: derivedKeys.sign.public },
                derivedKeys.sign.private
              );

              if (attachmentsList.length > 0) {
                await api.grantAttachmentsAccess(attachmentsList, [res.id, activeIdentity.ID]);
              }

              await api.sendMessage(
                activeIdentity.ID,
                [res.id],
                encryptedEnvelope
              );
              await api.sendMessage(
                activeIdentity.ID,
                [activeIdentity.ID],
                selfEnvelope
              );

              if (activeDraftIdRef.current) {
                await api.deleteMailDraft(activeDraftIdRef.current).catch(() => {});
                activeDraftIdRef.current = null;
              }

              setComposeTo('');
              setComposeSubject('');
              setComposeBody('');
              setComposeReplyTo(null);
              setUploadFile(null);
              setUploadedMeta(null);
              setUploadProgress(0);
              setIsComposing(false);
              fetchMailboxMetadata();
              triggerAlert('Mail gesendet', 'Ihre GaiaCOM Nachricht wurde verschlüsselt und versendet!');
              pollEmails();
            } catch (err) {
              setComposeError(err.message);
            }
          }
        );
        return;
      }

    } catch (err) {
      setComposeError(err.message);
    }
  }

  function handleReplyMail(mail, options = {}) {
    if (!mail) return;
    const selfGaia = activeIdentity?.GaiaID;
    let recipient = mail.senderGaia || displayGaiaID(mail.sender);
    
    if (options.replyAll) {
      const otherRecipients = [];
      if (mail.recipientGaia && mail.recipientGaia !== selfGaia && mail.recipientGaia !== recipient) {
        otherRecipients.push(mail.recipientGaia);
      }
      if (otherRecipients.length > 0) {
        recipient = `${recipient}, ${otherRecipients.join(', ')}`;
      }
    }

    let subject = mail.subject || '(Kein Betreff)';
    let body = mail.body || '';

    if (options.forward) {
      subject = subject.toLowerCase().startsWith('fwd:') ? subject : `Fwd: ${subject}`;
      body = `\n\n--- Weitergeleitete Nachricht von ${recipient} ---\n${body}`;
      recipient = '';
    } else {
      subject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
      body = `\n\n--- Ursprüngliche Nachricht von ${recipient} ---\n${body}`;
    }

    setComposeTo(recipient);
    setComposeSubject(subject);
    setComposeBody(body);
    setComposeReplyTo({
      messageId: mail.id,
      sender: mail.sender,
      timestamp: mail.createdAt
    });
    setSelectedMail(null);
    setIsComposing(true);
  }

  async function resolveIdentityPublicKeys(gaiaID) {
    const formatted = parseToGaiaID(gaiaID);
    if (activeIdentity && parseToGaiaID(activeIdentity.GaiaID) === formatted) {
      const activeRecord = parsePublicRecordValue(activeIdentity.PublicRecord || activeIdentity.publicRecord);
      if (activeRecord?.public_keys) return activeRecord.public_keys;
      if (derivedKeys) {
        return {
          identity: derivedKeys.sign.public,
          box: derivedKeys.box.public,
          pke: derivedKeys.pke.public
        };
      }
    }

    const cached = contacts.find(contact => parseToGaiaID(contact.gaiaID) === formatted);
    if (cached?.publicKey) {
      return { identity: cached.publicKey };
    }

    const response = await api.getPublicIdentity(formatted);
    const publicRecord = parsePublicRecordValue(response.publicRecord);
    return publicRecord?.public_keys || {};
  }

  function downloadJSON(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExportDisclosurePackage(mail) {
    try {
      const payloadObj = parsePayload(mail.rawPayload);
      if (!payloadObj) {
        throw new Error('Ungültiger oder fehlender Nachrichteninhalt.');
      }

      const proof = await api.getMessageProof(mail.id);
      const senderKeys = await resolveIdentityPublicKeys(mail.sender);
      const recipientKeys = await resolveIdentityPublicKeys(mail.recipient);
      const ciphertextHash = proof?.ciphertextHash || crypto.sha256Hex(payloadObj.payload_ciphertext);
      const senderPublicKey = senderKeys.identity || proof?.sender || mail.sender;
      const recipientPublicKey = recipientKeys.identity || proof?.recipient || mail.recipient;
      let abuseProof = '';
      try {
        abuseProof = crypto.calculateReportProof(mail.id, senderPublicKey, recipientPublicKey, ciphertextHash);
      } catch (_) {}

      const runExport = (includePlaintext) => {
        const disclosurePackage = {
          package_type: 'gaiacom.secure_disclosure.v1',
          exported_at: new Date().toISOString(),
          message_id: mail.id,
          sender_gaia_id: mail.sender,
          recipient_gaia_id: mail.recipient,
          sender_pubkey: senderPublicKey,
          recipient_pubkey: recipientPublicKey,
          ciphertext_hash: ciphertextHash,
          signature: proof?.senderSignature || payloadObj.signature || '',
          timestamp: proof?.serverReceivedAt || mail.createdAt,
          abuse_proof: abuseProof,
          gaia_proof: proof,
          tamper_evidence: {
            envelope_hash: proof?.envelopeHash || '',
            delivery_receipts: proof?.receipts || []
          },
          plaintext_disclosure: includePlaintext ? {
            subject: mail.subject,
            body: mail.body,
            disclosed_by: activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : '',
            disclosed_at: new Date().toISOString()
          } : null
        };

        downloadJSON(`gaiacom-disclosure-${mail.id}.json`, assertSecureExportClean(sanitizeSecureExport(disclosurePackage)));
        triggerAlert('Disclosure exportiert', 'Das Sicherheitsfall-Paket wurde lokal als JSON exportiert.', 'warning');
      };

      showConfirm(
        t('export_package_title') || 'Disclosure Package exportieren',
        t('export_package_desc') || 'Möchtest du den Klartext der Nachricht in das exportierte Sicherheits-Paket aufnehmen? (Bestätige nur, wenn du diesen Inhalt bewusst gegenüber Behörden/Anwälten offenlegen willst.)',
        () => runExport(true),
        () => runExport(false),
        t('include_plaintext') || 'Ja, Klartext einschließen',
        t('exclude_plaintext') || 'Nein, nur Beweise exportieren'
      );
    } catch (err) {
      triggerAlert('Export failed', err.message, 'danger');
    }
  }

  async function handleReportMail(mail) {
    showConfirm(
      t('report_abuse_title') || 'Missbrauch melden',
      t('report_abuse_desc') || 'Möchtest du diese Nachricht wirklich melden? Dies generiert einen kryptographischen Missbrauchsbeweis und übermittelt ihn dem Server.',
      async () => {
        try {
          const payloadObj = parsePayload(mail.rawPayload);
          if (!payloadObj) {
            throw new Error('Ungültiger oder fehlender Nachrichteninhalt.');
          }
          const ciphertextHash = crypto.sha256Hex(payloadObj.payload_ciphertext);

          await api.submitReport(
            mail.id,
            mail.sender,
            activeIdentity.publicKeyHex,
            ciphertextHash,
            payloadObj.signature
          );

          triggerAlert('Report eingereicht', 'Der Missbrauchsbeweis wurde übermittelt. Die Reputation wurde angepasst.', 'warning');
          setSelectedMail(null);
          pollEmails();
        } catch (err) {
          triggerAlert('Fehler beim Melden', err.message, 'danger');
        }
      },
      null,
      t('melden') || 'Melden',
      t('abbrechen') || 'Abbrechen',
      true
    );
  }

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
    handleSendMail,
    handleReplyMail,
    handleFileUpload,
    handleReportMail,
    handleExportDisclosurePackage,
    resolveIdentityPublicKeys,
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
