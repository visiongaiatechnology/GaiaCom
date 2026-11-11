// useEmails mailbox sync: sender key resolution + poll/decrypt loop
// (moved verbatim from useEmails.js).
import * as api from '../../api';
import * as crypto from '../../crypto';
import { displayGaiaID } from '../../utils/gaiaAddress';
import { parsePayload } from '../../utils/payload';
import { buildInitialKeyHistory } from '../../utils/keyHistory';
import { safeJsonParse } from '../../utils/safeJson';
import { notificationBody, notificationsAllowed } from '../../utils/notificationPreferences';
import { parseMailboxLabels, parsePublicRecordValue } from './mailHelpers';

export function createMailSync(ctx) {
  const {
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
  } = ctx;

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
              const targetDeviceKeyId = String(payloadObj.recipient_device_key_id || '');
              if (targetDeviceKeyId && targetDeviceKeyId !== deviceKeyVault?.deviceKeyId) continue;
              const isSelf = env.Sender === activeIdentity.GaiaID || env.Sender === activeIdentity.ID;
              const senderPubKeys = isSelf
                ? { identity: derivedKeys.sign.public, mldsa87: derivedKeys.mldsa87?.public || '' }
                : await fetchOrGetSenderPubKeys(env.Sender);

              if (senderPubKeys?.identity) {
                const recipientPublicKeys = targetDeviceKeyId
                  ? { pke: deviceKeyVault.publicKeys.pke, box: deviceKeyVault.publicKeys.box, hqc256: derivedKeys.hqc256?.public, identity: derivedKeys.sign.public }
                  : { pke: derivedKeys.pke.public, box: derivedKeys.box.public, hqc256: derivedKeys.hqc256?.public, identity: derivedKeys.sign.public };
                const recipientPrivateKeys = targetDeviceKeyId
                  ? { pke: deviceKeyVault.privateKeys.pke, box: deviceKeyVault.privateKeys.box, hqc256: derivedKeys.hqc256?.private }
                  : { pke: derivedKeys.pke.private, box: derivedKeys.box.private, hqc256: derivedKeys.hqc256?.private };
                const decryptedStr = await crypto.decryptPayload(
                  payloadObj,
                  senderPubKeys.identity,
                  recipientPublicKeys,
                  recipientPrivateKeys,
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
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && notificationsAllowed(notificationPreferences)) {
              new Notification(title, { body: notificationBody(notificationPreferences, body, 'Neue sichere E-Mail') });
            }
          });
      }
    } catch (_) {}
  }

  return { fetchOrGetSenderPubKeys, pollEmails };
}
