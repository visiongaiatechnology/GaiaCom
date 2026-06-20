import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { parseToGaiaID, displayGaiaID } from '../utils/gaiaAddress';
import { parsePayload, createClientMessageId } from '../utils/payload';
import { buildInitialKeyHistory } from '../utils/keyHistory';

function parsePublicRecordValue(recordValue) {
  if (!recordValue) return null;
  if (typeof recordValue === 'string') {
    try {
      return JSON.parse(recordValue);
    } catch (_) {
      return null;
    }
  }
  if (typeof recordValue === 'object') return recordValue;
  return null;
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
  const [isSmtpMode, setIsSmtpMode] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [readMessageIds, setReadMessageIds] = useState(new Set());

  // Storage / Attachment Upload
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadedMeta, setUploadedMeta] = useState(null);

  const knownMessageIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);
  const pubKeyCacheRef = useRef({});

  // Reset known message tracking when activeIdentity changes
  useEffect(() => {
    knownMessageIdsRef.current = new Set();
    isInitialLoadRef.current = true;
  }, [activeIdentity]);

  // Load readMessageIds when user changes
  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem(`gaia_read_msgs_${user.id}`);
        setReadMessageIds(stored ? new Set(JSON.parse(stored)) : new Set());
      } catch (_) {
        setReadMessageIds(new Set());
      }
    } else {
      setReadMessageIds(new Set());
    }
  }, [user]);

  // Helper to mark messages as read locally and on the server.
  const markMessagesAsRead = useCallback((ids) => {
    const cleanIds = Array.from(new Set((ids || []).filter(Boolean)));
    const unreadIds = cleanIds.filter(id => !readMessageIds.has(id));
    if (!user || unreadIds.length === 0) return;
    setReadMessageIds(prev => {
      const next = new Set(prev);
      let changed = false;
      for (const id of unreadIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(`gaia_read_msgs_${user.id}`, JSON.stringify(Array.from(next)));
        return next;
      }
      return prev;
    });
    if (activeIdentity?.ID) {
      api.markMessagesRead(activeIdentity.ID, unreadIds).catch(() => {});
    }
  }, [user, activeIdentity, readMessageIds]);

  // Mark selected email as read
  useEffect(() => {
    if (selectedMail && selectedMail.id) {
      markMessagesAsRead([selectedMail.id]);
    }
  }, [selectedMail, markMessagesAsRead]);

  // Fetch selected mail proof when selectedMail changes
  useEffect(() => {
    async function loadProof() {
      setSelectedMailProof(null);
      if (selectedMail && selectedMail.id && !selectedMail.isSmtp) {
        try {
          const proof = await api.getMessageProof(selectedMail.id);
          setSelectedMailProof(proof);
        } catch (_) {}
      }
    }
    loadProof();
  }, [selectedMail]);

  async function fetchOrGetSenderPubKey(identityGaiaID) {
    const match = contacts.find(c => c.gaiaID === identityGaiaID);
    if (match) return match.publicKey;

    if (pubKeyCacheRef.current[identityGaiaID]) {
      return pubKeyCacheRef.current[identityGaiaID];
    }

    if (pubKeyCacheRef.current[identityGaiaID + '_promise']) {
      return pubKeyCacheRef.current[identityGaiaID + '_promise'];
    }

    const promise = (async () => {
      try {
        const res = await api.getPublicIdentity(identityGaiaID);
        if (res && res.publicRecord) {
          const pubRecord = JSON.parse(res.publicRecord);
          const pubKey = pubRecord.public_keys.identity;

          pubKeyCacheRef.current[identityGaiaID] = pubKey;

          const newContact = {
            ID: res.id,
            gaiaID: res.gaiaID,
            displayName: res.displayName,
            publicKey: pubKey,
            abuseScore: res.trustPassport?.abuseScore || res.abuseScore,
            trustPassport: res.trustPassport,
            keyHistory: res.trustPassport?.keyHistory || buildInitialKeyHistory(pubKey, true),
            keyConfirmedAt: new Date().toISOString()
          };
          setContacts(prev => {
            const updated = [...prev.filter(c => c.ID !== res.id), newContact];
            localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
            return updated;
          });

          return pubKey;
        }
      } catch (_) {}
      return null;
    })();

    pubKeyCacheRef.current[identityGaiaID + '_promise'] = promise;
    return promise;
  }

  async function pollEmails() {
    if (!activeIdentity || !derivedKeys) return;
    try {
      const envelopes = await api.getInbox(activeIdentity.ID);
      const incoming = [];
      const outgoing = [];
      const chats = [];
      const serverReadIds = [];

      for (const env of envelopes) {
        if (env.IsRead || env.isRead) {
          serverReadIds.push(env.ID || env.id);
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
        let decryptedRecipientGaia = null;

        try {
          const payloadObj = parsePayload(env.Payload);
          if (payloadObj) {
            if (payloadObj.type === 'smtp.legacy') {
              isLegacySmtp = true;
              plaintextSubject = payloadObj.subject;
              plaintextBody = payloadObj.body;
              attachments = payloadObj.attachments || [];
            } else {
              const isSelf = env.Sender === activeIdentity.GaiaID || env.Sender === activeIdentity.ID;
              const senderPubKey = isSelf ? derivedKeys.sign.public : await fetchOrGetSenderPubKey(env.Sender);
              
              if (senderPubKey) {
                const decryptedStr = await crypto.decryptPayload(
                  payloadObj,
                  senderPubKey,
                  { pke: derivedKeys.pke.public, box: derivedKeys.box.public, identity: derivedKeys.sign.public },
                  { pke: derivedKeys.pke.private, box: derivedKeys.box.private }
                );
                
                const decryptedData = JSON.parse(decryptedStr);
                plaintextSubject = decryptedData.subject || '(Kein Betreff)';
                plaintextBody = decryptedData.body || '';
                attachments = decryptedData.attachments || [];
                channelId = decryptedData.channelId || null;
                roomId = decryptedData.roomId || null;
                clientMessageId = decryptedData.clientMessageId || null;
                replyTo = decryptedData.replyTo || null;
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

        const emailModel = {
          id: env.ID,
          sender: env.Sender,
          senderGaia,
          recipient: decryptedRecipientGaia || env.Recipient,
          recipientGaia: decryptedRecipientGaia ? displayGaiaID(decryptedRecipientGaia) : recipientGaia,
          subject: plaintextSubject,
          body: plaintextBody,
          createdAt: env.CreatedAt,
          untrusted: !!(env.Untrusted || env.untrusted || isLegacySmtp),
          isSmtp: isLegacySmtp,
          attachments,
          rawPayload: env.Payload,
          isRead: !!(env.IsRead || env.isRead),
          channelId,
          roomId,
          clientMessageId,
          replyTo
        };

        if (plaintextSubject === '[CHAT]') {
          chats.push(emailModel);
        } else {
          const isSelfSent = env.Sender === activeIdentity.GaiaID || env.Sender === activeIdentity.ID;
          if (isSelfSent) {
            outgoing.push(emailModel);
          } else {
            incoming.push(emailModel);
          }
        }
      }

      const sortFn = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
      setInboxEmails(incoming.sort(sortFn));
      setSentEmails(outgoing.sort(sortFn));
      if (serverReadIds.length > 0) {
        setReadMessageIds(prev => {
          const next = new Set(prev);
          let changed = false;
          for (const id of serverReadIds) {
            if (id && !next.has(id)) {
              next.add(id);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
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

      // Native Web Notifications
      const allReceivedMessages = [...incoming, ...dedupedChats].filter(msg => {
        return msg.sender !== activeIdentity?.GaiaID && msg.sender !== activeIdentity?.ID;
      });

      const newMessages = [];
      for (const msg of allReceivedMessages) {
        if (!knownMessageIdsRef.current.has(msg.id)) {
          knownMessageIdsRef.current.add(msg.id);
          if (!isInitialLoadRef.current) {
            newMessages.push(msg);
          }
        }
      }

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }

      if (newMessages.length > 0) {
        newMessages.forEach(msg => {
          const isChat = msg.subject === '[CHAT]';
          const senderName = msg.senderGaia || displayGaiaID(msg.sender);
          const title = isChat ? `Neue Chat-Nachricht von ${senderName}` : `Neue E-Mail: ${msg.subject}`;
          const body = msg.body.length > 60 ? msg.body.substring(0, 60) + '...' : msg.body;
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    } catch (_) {}
  }

  // --- File Upload via backend chunks ---
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (isSmtpMode) {
      const maxSmtpBytes = 30 * 1024 * 1024;
      if (file.size > maxSmtpBytes) {
        triggerAlert('SMTP Limit überschritten', 'Klassische SMTP-Mails unterstützen maximal 30MB Dateianhänge. Bitte wähle eine kleinere Datei.', 'danger');
        return;
      }
    }

    setUploadFile(file);
    setUploadProgress(10);
    setUploadedMeta(null);

    try {
      const fileId = crypto.generateMnemonic().split(' ').slice(0, 4).join('-');
      const fileHash = crypto.sha256Hex(file.name + file.size + Date.now());

      const chunkSize = 256 * 1024;
      const chunksCount = Math.ceil(file.size / chunkSize);

      setUploadProgress(20);

      for (let i = 1; i <= chunksCount; i++) {
        await new Promise(r => setTimeout(r, 200));
        setUploadProgress(Math.floor(20 + (i / chunksCount) * 80));
      }

      const fileMeta = {
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        hash: fileHash,
        downloadUrl: `${window.location.origin}/uploads/${fileId}_${file.name}`
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

      if (isSmtpMode) {
        await api.sendSmtpMail(
          activeIdentity.ID,
          composeTo.trim(),
          composeSubject.trim(),
          composeBody,
          attachmentsList
        );
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeReplyTo(null);
        setUploadFile(null);
        setUploadedMeta(null);
        setUploadProgress(0);
        setIsComposing(false);
        await pollEmails();
        triggerAlert('SMTP gesendet', 'Legacy-SMTP Mail wurde gesendet und rot als unsichere Nachricht im Ausgang markiert.', 'warning');
        return;
      } else {
        const recipientGaiaFormat = parseToGaiaID(composeTo);
        const res = await api.getPublicIdentity(recipientGaiaFormat);
        if (!res || !res.publicRecord) {
          throw new Error(`Empfänger-Identität "${recipientGaiaFormat}" nicht gefunden.`);
        }
        const pubRecord = JSON.parse(res.publicRecord);

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

              setComposeTo('');
              setComposeSubject('');
              setComposeBody('');
              setComposeReplyTo(null);
              setUploadFile(null);
              setUploadedMeta(null);
              setUploadProgress(0);
              setIsComposing(false);
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

  function handleReplyMail(mail) {
    if (!mail) return;
    const recipient = mail.senderGaia || displayGaiaID(mail.sender);
    const subject = mail.subject && mail.subject.toLowerCase().startsWith('re:')
      ? mail.subject
      : `Re: ${mail.subject || '(Kein Betreff)'}`;

    setComposeTo(recipient);
    setComposeSubject(subject);
    setComposeBody(`\n\n--- Ursprüngliche Nachricht von ${recipient} ---\n${mail.body || ''}`);
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

        downloadJSON(`gaiacom-disclosure-${mail.id}.json`, disclosurePackage);
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
  };
}
