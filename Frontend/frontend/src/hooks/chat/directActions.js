// useChat 1:1 message/blocking actions (moved verbatim from useChat.js).
// Factory: receives the hook's state/setters as a context object each render.
import * as api from '../../api';
import * as crypto from '../../crypto';
import { parseToGaiaID } from '../../utils/gaiaAddress';
import { createClientMessageId } from '../../utils/payload';
import { deliverDeviceEnvelopes, encryptForRecipientDevices } from '../../utils/deviceFanout';
import { hasMldsa87Capability, parsePublicRecordValue } from './helpers';

export function createDirectActions(ctx) {
  const {
    user,
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    activeChatContact,
    activeDirectTopSecret,
    chatInputText,
    chatMessages,
    messageReplyTarget,
    setChatInputText,
    setChatMessages,
    setContacts,
    setActiveChatContact,
    setDirectTopSecretByGaia,
    setMessageReplyTarget,
    triggerAlert,
    showConfirmThreeButtons,
    t,
    pollEmails,
    verifyRecipientsAndRun
  } = ctx;

  async function setDirectTopSecretEnabled(enabled) {
    if (!user?.id || !activeChatContact?.gaiaID) return;
    const contactGaia = parseToGaiaID(activeChatContact.gaiaID);
    if (enabled) {
      try {
        const res = await api.getPublicIdentity(contactGaia);
        const pubRecord = parsePublicRecordValue(res?.publicRecord);
        if (!hasMldsa87Capability(pubRecord)) {
          triggerAlert(
            'Top Secret nicht verfuegbar',
            'Dieser Kontakt hat noch keine ML-DSA-87 Capability veroeffentlicht. Sobald der Kontakt sich mit der aktuellen GaiaCom-Version anmeldet und sein Profil aktualisiert, kann Top Secret aktiviert werden.',
            'warning'
          );
          return;
        }
        setContacts(prev => {
          const updated = prev.map(contact => {
            if (parseToGaiaID(contact.gaiaID) !== contactGaia) return contact;
            return {
              ...contact,
              mldsa87Public: pubRecord.public_keys.mldsa87,
              public_keys: {
                ...(contact.public_keys || {}),
                mldsa87: pubRecord.public_keys.mldsa87
              }
            };
          });
          localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        triggerAlert('Top Secret Pruefung fehlgeschlagen', err.message, 'danger');
        return;
      }
    }
    setDirectTopSecretByGaia(prev => {
      const next = { ...prev };
      if (enabled) {
        next[contactGaia] = true;
      } else {
        delete next[contactGaia];
      }
      localStorage.setItem(`direct_top_secret_${user.id}`, JSON.stringify(next));
      return next;
    });
  }

  async function handleSendChatMessage(e, attachments = []) {
    if (e) e.preventDefault();
    const hasAttachments = attachments && attachments.length > 0;
    if ((!chatInputText.trim() && !hasAttachments) || !activeChatContact || !activeIdentity || !derivedKeys) return;

    const textToSend = chatInputText;
    setChatInputText('');

    try {
      const recipientGaiaFormat = parseToGaiaID(activeChatContact.gaiaID);
      const res = await api.getPublicIdentity(recipientGaiaFormat);
      if (!res || !res.publicRecord) {
        throw new Error(`Chat-Partner nicht gefunden.`);
      }
      const pubRecord = parsePublicRecordValue(res.publicRecord);
      if (!pubRecord?.public_keys) {
        throw new Error('Chat-Partner besitzt keinen gueltigen Schluesselsatz.');
      }
      if (activeDirectTopSecret && !hasMldsa87Capability(pubRecord)) {
        setDirectTopSecretEnabled(false);
        throw new Error('Top Secret ist fuer diesen Kontakt noch nicht verfuegbar: ML-DSA-87 Capability fehlt.');
      }

      verifyRecipientsAndRun(
        [res.gaiaID],
        [pubRecord],
        async () => {
          try {
            const chatContent = {
              subject: '[CHAT]',
              body: textToSend,
              attachments: attachments || [],
              clientMessageId: createClientMessageId(),
              recipientGaia: recipientGaiaFormat,
              replyTo: messageReplyTarget,
              topSecret: activeDirectTopSecret
            };

            const plaintext = JSON.stringify(chatContent);
            const encryptedEnvelopes = await encryptForRecipientDevices({ plaintext, recipientIdentityId: res.id, recipientPublicKeys: { ...pubRecord.public_keys, keyset_proof: pubRecord.keyset_proof }, senderSignPrivate: derivedKeys.sign.private, topSecret: activeDirectTopSecret, senderMldsa87Private: derivedKeys.mldsa87?.private, senderDeviceVault: deviceKeyVault });
            const selfEnvelopes = await encryptForRecipientDevices({ plaintext, recipientIdentityId: activeIdentity.ID, recipientPublicKeys: { pke: derivedKeys.pke.public, box: derivedKeys.box.public, hqc256: derivedKeys.hqc256?.public, identity: derivedKeys.sign.public, mldsa87: derivedKeys.mldsa87?.public }, senderSignPrivate: derivedKeys.sign.private, topSecret: activeDirectTopSecret, senderMldsa87Private: derivedKeys.mldsa87?.private, senderDeviceVault: deviceKeyVault });
            selfEnvelopes.forEach(envelope => { envelope.recipient_gaia = recipientGaiaFormat; });

            if (hasAttachments) {
              const expiresInHours = attachments.some(att => att?.expiresInHours)
                ? Math.min(12, Math.max(...attachments.map(att => Number(att?.expiresInHours || 0))))
                : 0;
              await api.grantAttachmentsAccess(attachments, [res.id, activeIdentity.ID], expiresInHours);
            }

            const deliveries = await deliverDeviceEnvelopes(activeIdentity.ID, res.id, encryptedEnvelopes);
            const readReceiptSourceId = deliveries.find(delivery => delivery?.messageId)?.messageId || '';
            selfEnvelopes.forEach(envelope => { if (readReceiptSourceId) envelope.read_receipt_source_id = readReceiptSourceId; });
            await deliverDeviceEnvelopes(activeIdentity.ID, activeIdentity.ID, selfEnvelopes);

            pollEmails();
            setMessageReplyTarget(null);
          } catch (err) {
            triggerAlert('Fehler beim Senden', err.message, 'danger');
          }
        }
      );
    } catch (err) {
      triggerAlert('Fehler beim Senden', err.message, 'danger');
    }
  }

  async function handleEditChatMessage(message, nextBody) {
    if (!message || !activeChatContact || !activeIdentity || !derivedKeys) return false;
    const trimmedBody = String(nextBody || '').trim();
    if (!trimmedBody) return false;
    if (!message.clientMessageId) {
      triggerAlert('Bearbeiten nicht moeglich', 'Diese Nachricht stammt noch aus dem alten Nachrichtenformat und kann serverseitig noch nicht sauber ersetzt werden.', 'warning');
      return false;
    }
	if (deviceKeyVault?.id) {
	  triggerAlert('Bearbeiten nicht moeglich', 'Gerätegesicherte Nachrichten sind unveränderlich. Sende die Korrektur als neue, vollständig aufgefächerte Nachricht.', 'warning');
	  return false;
	}

    try {
      const recipientGaiaFormat = parseToGaiaID(activeChatContact.gaiaID);
      const res = await api.getPublicIdentity(recipientGaiaFormat);
      if (!res || !res.publicRecord) {
        throw new Error('Chat-Partner nicht gefunden.');
      }
      const pubRecord = parsePublicRecordValue(res.publicRecord);
      if (!pubRecord?.public_keys) {
        throw new Error('Chat-Partner besitzt keinen gueltigen Schluesselsatz.');
      }

      await new Promise((resolve, reject) => {
        verifyRecipientsAndRun(
          [res.gaiaID],
          [pubRecord],
          async () => {
            try {
              const editedContent = {
                subject: '[CHAT]',
                body: trimmedBody,
                attachments: [],
                clientMessageId: message.clientMessageId,
                recipientGaia: recipientGaiaFormat,
                replyTo: message.replyTo || null,
                topSecret: message.topSecret === true || activeDirectTopSecret
              };
              const editTimestamp = Date.now();
              const editTopSecret = editedContent.topSecret === true;
              if (editTopSecret && !hasMldsa87Capability(pubRecord)) {
                throw new Error('Top Secret Revision nicht moeglich: ML-DSA-87 Capability des Empfaengers fehlt.');
              }

              const peerEnvelope = await crypto.encryptPayload(
                JSON.stringify(editedContent),
                { pke: pubRecord.public_keys.pke, box: pubRecord.public_keys.box, hqc256: pubRecord.public_keys.hqc256, identity: pubRecord.public_keys.identity, mldsa87: pubRecord.public_keys.mldsa87, keyset_proof: pubRecord.keyset_proof },
                derivedKeys.sign.private,
                message.clientMessageId,
                editTimestamp,
                {
                  topSecret: editTopSecret,
                  sovereignProfile: editTopSecret ? 'top-secret' : 'accelerated',
                  senderMldsa87PrivHex: derivedKeys.mldsa87?.private
                }
              );

              const selfEnvelope = await crypto.encryptPayload(
                JSON.stringify(editedContent),
                { pke: derivedKeys.pke.public, box: derivedKeys.box.public, hqc256: derivedKeys.hqc256?.public, identity: derivedKeys.sign.public, mldsa87: derivedKeys.mldsa87?.public },
                derivedKeys.sign.private,
                message.clientMessageId,
                editTimestamp,
                {
                  topSecret: editTopSecret,
                  sovereignProfile: editTopSecret ? 'top-secret' : 'accelerated',
                  senderMldsa87PrivHex: derivedKeys.mldsa87?.private
                }
              );
              selfEnvelope.recipient_gaia = recipientGaiaFormat;

              await api.editDirectMessage(
                activeIdentity.ID,
                message.id,
                peerEnvelope,
                selfEnvelope
              );

              pollEmails();
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      triggerAlert('Nachricht bearbeitet', 'Die Nachricht wurde als neue signierte Revision gespeichert.');
      return true;
    } catch (err) {
      triggerAlert('Fehler beim Bearbeiten', err.message, 'danger');
      return false;
    }
  }

  async function handleDeleteChatMessage(messageId, setInboxEmails, setSentEmails) {
    if (!activeIdentity || !messageId) return;

    const executeDelete = async (forEveryone) => {
      try {
        await api.deleteInboxMessage(activeIdentity.ID, messageId, forEveryone);
        setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
        if (setInboxEmails) setInboxEmails(prev => prev.filter(msg => msg.id !== messageId));
        if (setSentEmails) setSentEmails(prev => prev.filter(msg => msg.id !== messageId));
        triggerAlert(t('erfolg') || 'Erfolg', forEveryone ? (t('Nachricht fuer alle geloescht') || 'Die Nachricht wurde fuer alle Teilnehmer geloescht.') : (t('Nachricht geloescht') || 'Die Chat-Nachricht wurde lokal aus deiner Inbox entfernt.'));
      } catch (err) {
        triggerAlert(t('fehler') || 'Fehler beim Loeschen', err.message, 'danger');
      }
    };

    showConfirmThreeButtons(
      t('confirm_delete_msg_title') || 'Nachricht löschen',
      t('confirm_delete_msg_desc') || 'Möchtest du diese Chat-Nachricht löschen?',
      () => executeDelete(true),
      () => executeDelete(false),
      t('delete_for_everyone') || 'Für alle löschen',
      t('delete_for_me') || 'Nur für mich löschen',
      t('abbrechen') || 'Abbrechen'
    );
  }

  async function handleClearDirectChat() {
    if (!activeIdentity || !activeChatContact) return;

    const executeClear = async (forEveryone) => {
      try {
        const contactGaia = parseToGaiaID(activeChatContact.gaiaID);
        const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
        const conversationMessages = chatMessages.filter(msg => {
          const senderGaia = parseToGaiaID(msg.sender);
          const recipientGaia = parseToGaiaID(msg.recipient);
          return (senderGaia === contactGaia && recipientGaia === ownGaia) ||
                 (senderGaia === ownGaia && recipientGaia === contactGaia);
        });
        const messageIds = conversationMessages.map(m => m.id).filter(Boolean);
        await api.clearInboxConversation(activeIdentity.ID, {
          peerGaiaId: activeChatContact.gaiaID,
          forEveryone,
          messageIds
        });
        setChatMessages(prev => prev.filter(msg => {
          const senderGaia = parseToGaiaID(msg.sender);
          const recipientGaia = parseToGaiaID(msg.recipient);
          return !(
            (senderGaia === contactGaia && recipientGaia === ownGaia) ||
            (senderGaia === ownGaia && recipientGaia === contactGaia)
          );
        }));
        triggerAlert(t('erfolg') || 'Erfolg', forEveryone ? (t('Chat fuer alle geleert') || 'Der Chat wurde fuer alle Teilnehmer geleert.') : (t('Chat geleert') || 'Der Chat wurde fuer deine lokale Inbox geleert.'));
      } catch (err) {
        triggerAlert(t('fehler') || 'Clear Chat failed', err.message, 'danger');
      }
    };

    showConfirmThreeButtons(
      t('confirm_clear_chat_title') || 'Chat leeren',
      t('confirm_clear_chat_desc') || 'Möchtest du diesen Chat leeren?',
      () => executeClear(true),
      () => executeClear(false),
      t('clear_for_everyone') || 'Für alle leeren',
      t('clear_for_me') || 'Nur für mich leeren',
      t('abbrechen') || 'Abbrechen'
    );
  }

  async function toggleBlockContact(contact) {
    if (!contact || !user) return;
    const nextBlocked = !contact.blocked;
    try {
      await api.saveMailContact({
        id: contact.id || contact.ID,
        gaiaId: contact.gaiaID || contact.gaiaId,
        displayName: contact.displayName || contact.DisplayName,
        publicKey: contact.publicKey || '',
        blocked: nextBlocked
      });
      const updatedContact = {
        ...contact,
        blocked: nextBlocked
      };
      setContacts(prev => {
        const updated = prev.map(c => (c.ID === contact.ID || c.gaiaID === contact.gaiaID) ? updatedContact : c);
        localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
        return updated;
      });
      if (activeChatContact && (activeChatContact.ID === contact.ID || activeChatContact.gaiaID === contact.gaiaID)) {
        setActiveChatContact(updatedContact);
      }
      triggerAlert(
        t('erfolg') || 'Erfolg',
        nextBlocked
          ? (t('kontakt_blockiert') || 'Kontakt blockiert')
          : (t('kontakt_freigegeben') || 'Kontakt freigegeben')
      );
    } catch (err) {
      triggerAlert(t('fehler') || 'Fehler', err.message, 'danger');
    }
  }

  return {
    setDirectTopSecretEnabled,
    handleSendChatMessage,
    handleEditChatMessage,
    handleDeleteChatMessage,
    handleClearDirectChat,
    toggleBlockContact
  };
}
