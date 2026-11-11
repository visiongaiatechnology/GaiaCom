// useChat group message actions (moved verbatim from useChat.js).
// Factory: receives the hook's state/setters as a context object each render.
import * as api from '../../api';
import { createClientMessageId } from '../../utils/payload';
import { safeJsonParse } from '../../utils/safeJson';
import { deliverDeviceEnvelopes, encryptForRecipientDevices } from '../../utils/deviceFanout';
import { parsePublicRecordValue } from './helpers';

export function createGroupActions(ctx) {
  const {
    activeRoom,
    activeChannel,
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    chatInputText,
    chatMessages,
    slowModeCooldowns,
    messageReplyTarget,
    setChatInputText,
    setChatMessages,
    setSlowModeCooldowns,
    setMessageReplyTarget,
    triggerAlert,
    showConfirm,
    t,
    pollEmails,
    verifyRecipientsAndRun
  } = ctx;

  async function handleSendGroupMessage(e, attachments = []) {
    if (e) e.preventDefault();
    const hasAttachments = attachments && attachments.length > 0;
    if ((!chatInputText.trim() && !hasAttachments) || !activeRoom || !activeChannel || !activeIdentity || !derivedKeys) return;

    if (activeChannel && slowModeCooldowns[activeChannel.id] > 0) {
      triggerAlert(t('slow_mode_active') || 'Slow Mode aktiv', `Bitte warte noch ${slowModeCooldowns[activeChannel.id]} Sekunden, bevor du wieder schreibst.`, 'warning');
      return;
    }

    const myMember = activeRoom.Members?.find(m => m.IdentityID === activeIdentity.ID);
    const isPrivileged = myMember && (myMember.Role === 'admin' || myMember.Role === 'owner');
    if (activeRoom.ReadOnly && !isPrivileged) {
      triggerAlert(t('read_only_active') || 'Nur-Lesen Modus', 'Du hast in dieser Gruppe keine Schreibrechte.', 'warning');
      return;
    }

    const textToSend = chatInputText;
    setChatInputText('');

    try {
      const recipientGaiaIds = [];
      const pubRecords = [];
      const memberObjects = [];
      const clientMessageId = createClientMessageId();

      for (const m of activeRoom.Members) {
        let pubRecord = null;
        if (m.IdentityID === activeIdentity.ID) {
          pubRecord = {
            public_keys: {
              pke: derivedKeys.pke.public,
              box: derivedKeys.box.public,
              identity: derivedKeys.sign.public,
              mldsa87: derivedKeys.mldsa87?.public || '',
              hqc256: derivedKeys.hqc256?.public || ''
            }
          };
          m.Identity = m.Identity || {
            GaiaID: activeIdentity.GaiaID,
            DisplayName: activeIdentity.DisplayName || activeIdentity.displayName
          };
        } else if (m.Identity && m.Identity.PublicRecord) {
          if (typeof m.Identity.PublicRecord === 'string') {
            pubRecord = safeJsonParse(m.Identity.PublicRecord, null);
          } else {
            pubRecord = m.Identity.PublicRecord;
          }
        }
        if (!pubRecord || !pubRecord.public_keys) {
          const res = await api.getPublicIdentity(m.Identity.GaiaID);
          if (res && res.publicRecord) {
            pubRecord = parsePublicRecordValue(res.publicRecord);
          }
        }

        if (pubRecord && pubRecord.public_keys) {
          recipientGaiaIds.push(m.Identity.GaiaID);
          pubRecords.push(pubRecord);
          memberObjects.push(m);
        }
      }

      verifyRecipientsAndRun(
        recipientGaiaIds,
        pubRecords,
        async () => {
          const emailContent = {
            subject: '[CHAT]',
            body: textToSend,
            attachments: attachments || [],
            channelId: activeChannel.id,
            roomId: activeRoom.ID,
            clientMessageId,
            replyTo: messageReplyTarget,
            topSecret: activeRoom.TopSecret || activeRoom.topSecret || false
          };

          if (hasAttachments) {
            const expiresInHours = attachments.some(att => att?.expiresInHours)
              ? Math.min(12, Math.max(...attachments.map(att => Number(att?.expiresInHours || 0))))
              : 0;
            await api.grantAttachmentsAccess(attachments, memberObjects.map(m => m.IdentityID), expiresInHours);
          }

          const sendPromises = memberObjects.map(async (m, index) => {
            try {
              const pubRecord = pubRecords[index];
              const envelopes = await encryptForRecipientDevices({ plaintext: JSON.stringify(emailContent), recipientIdentityId: m.IdentityID, recipientPublicKeys: { ...pubRecord.public_keys, keyset_proof: pubRecord.keyset_proof }, senderSignPrivate: derivedKeys.sign.private, topSecret: activeRoom.TopSecret || activeRoom.topSecret || false, senderMldsa87Private: derivedKeys.mldsa87?.private, senderDeviceVault: deviceKeyVault });
              envelopes.forEach(envelope => { envelope.room_id = activeRoom.ID; envelope.channel_id = activeChannel.id; });
              await deliverDeviceEnvelopes(activeIdentity.ID, m.IdentityID, envelopes);
            } catch (err) {
              console.error("Failed E2E encryption for member:", m.IdentityID, err);
            }
          });

          await Promise.all(sendPromises);

          if (activeRoom.SlowModeSeconds > 0 && activeChannel && !isPrivileged) {
            setSlowModeCooldowns(prev => ({
              ...prev,
              [activeChannel.id]: activeRoom.SlowModeSeconds
            }));
          }

          pollEmails();
          setMessageReplyTarget(null);
        }
      );
    } catch (err) {
      triggerAlert('Fehler beim Senden', err.message, 'danger');
    }
  }

  async function handleClearGroupChannel() {
    if (!activeIdentity || !activeChannel) return;
    showConfirm(
      t('confirm_clear_channel_title') || 'Kanal leeren',
      t('confirm_clear_channel_desc') || 'Möchtest du diesen Kanal leeren? Die Nachrichten werden nur aus deiner lokalen Ansicht entfernt.',
      async () => {
        try {
          const channelMessages = chatMessages.filter(msg => msg.channelId === activeChannel.id);
          const messageIds = channelMessages.map(m => m.id).filter(Boolean);
          await api.clearInboxConversation(activeIdentity.ID, { channelId: activeChannel.id, messageIds });
          setChatMessages(prev => prev.filter(msg => msg.channelId !== activeChannel.id));
          triggerAlert('Kanal geleert', 'Der Kanal wurde fuer deine lokale Inbox geleert.');
        } catch (err) {
          triggerAlert('Clear Channel failed', err.message, 'danger');
        }
      },
      null,
      t('leeren') || 'Leeren',
      t('abbrechen') || 'Abbrechen',
      true
    );
  }

  return { handleSendGroupMessage, handleClearGroupChannel };
}
