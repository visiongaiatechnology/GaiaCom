// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useState, useEffect, useRef } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { parseToGaiaID } from '../utils/gaiaAddress';
import { createClientMessageId } from '../utils/payload';
import { safeJsonParse } from '../utils/safeJson';

function parsePublicRecordValue(recordValue) {
  if (!recordValue) return null;
  if (typeof recordValue === 'string') return safeJsonParse(recordValue, null);
  if (typeof recordValue === 'object') return recordValue;
  return null;
}

function hasMldsa87Capability(pubRecord) {
  return Boolean(pubRecord?.public_keys?.mldsa87 && String(pubRecord.public_keys.mldsa87).trim());
}

export default function useChat({
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
}) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const activeRoomRef = useRef(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescriptionInput, setGroupDescriptionInput] = useState('');
  const [groupAvatarInput, setGroupAvatarInput] = useState('\u{1F916}');
  const [isCrisisRoomInput, setIsCrisisRoomInput] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const [editGroupIsCrisis, setEditGroupIsCrisis] = useState(false);
  const [editGroupIsPrivate, setEditGroupIsPrivate] = useState(false);
  const [editGroupReadOnly, setEditGroupReadOnly] = useState(false);
  const [editGroupSlowModeSeconds, setEditGroupSlowModeSeconds] = useState(0);
  const [editGroupTopSecret, setEditGroupTopSecret] = useState(false);
  const [slowModeCooldowns, setSlowModeCooldowns] = useState({});
  const [moderationLogs, setModerationLogs] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [publicRoomsSearchResult, setPublicRoomsSearchResult] = useState([]);
  const [pinnedMessageIds, setPinnedMessageIds] = useState([]);
  const [joinGroupHashInput, setJoinGroupHashInput] = useState('');
  const [newChannelNameInput, setNewChannelNameInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [activeChatContact, setActiveChatContact] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageReplyTarget, setMessageReplyTarget] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [directTopSecretByGaia, setDirectTopSecretByGaia] = useState({});
  const activeDirectTopSecret = !!(activeChatContact?.gaiaID && directTopSecretByGaia[parseToGaiaID(activeChatContact.gaiaID)]);

  // Sync activeRoom with its ref
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    setMessageReplyTarget(null);
  }, [activeChatContact, activeChannel]);

  useEffect(() => {
    if (!user?.id) {
      setDirectTopSecretByGaia({});
      return;
    }
    const stored = safeJsonParse(localStorage.getItem(`direct_top_secret_${user.id}`), {});
    setDirectTopSecretByGaia(stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {});
  }, [user?.id]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setSlowModeCooldowns(prev => {
        const next = { ...prev };
        let changed = false;
        Object.entries(next).forEach(([cid, val]) => {
          if (val > 0) {
            next[cid] = val - 1;
            changed = true;
          } else {
            delete next[cid];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function fetchPinnedMessages() {
    if (!activeRoom || !activeChannel) {
      setPinnedMessageIds([]);
      return;
    }
    try {
      const pins = await api.getRoomPinnedMessages(activeRoom.ID, activeChannel.id);
      setPinnedMessageIds(pins || []);
    } catch (_) {
      setPinnedMessageIds([]);
    }
  }

  useEffect(() => {
    fetchPinnedMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, activeChannel]);

  async function fetchRooms() {
    if (!user) return;
    try {
      const loadedRooms = await api.getRooms();
      setRooms(loadedRooms || []);
      
      const currentRoom = activeRoomRef.current;
      if (currentRoom) {
        const freshActive = loadedRooms.find(r => r.ID === currentRoom.ID);
        if (freshActive) {
          setActiveRoom(freshActive);
        }
      }
    } catch (_) {}
  }

  async function fetchChannels(roomId) {
    try {
      const loadedChannels = await api.getChannels(roomId);
      setChannels(loadedChannels || []);
      
      if (loadedChannels && loadedChannels.length > 0) {
        const activeExists = loadedChannels.find(c => c.id === activeChannel?.id);
        if (!activeChannel || !activeExists) {
          setActiveChannel(loadedChannels[0]);
        }
      } else {
        setActiveChannel(null);
      }
    } catch (_) {}
  }

  // Fetch channels when activeRoom changes
  useEffect(() => {
    if (activeRoom) {
      fetchChannels(activeRoom.ID);
    } else {
      setChannels([]);
      setActiveChannel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);

  async function handleCreateRoom(e) {
    if (e) e.preventDefault();
    if (!groupNameInput.trim() || !activeIdentity) return;
    try {
      const finalDescription = isCrisisRoomInput 
        ? `[CRISIS] ${groupDescriptionInput.trim()}`
        : groupDescriptionInput.trim();

      const room = await api.createRoom(
        groupNameInput,
        finalDescription,
        groupAvatarInput,
        [activeIdentity.ID]
      );
      triggerAlert('Gruppe erstellt', `Die Gruppe "${groupNameInput}" wurde erfolgreich erstellt.`);
      setGroupNameInput('');
      setGroupDescriptionInput('');
      setGroupAvatarInput('\u{1F916}');
      setIsCrisisRoomInput(false);
      setShowCreateGroupModal(false);
      await fetchRooms();
      setActiveRoom(room);
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  async function handleJoinRoom(e) {
    if (e) e.preventDefault();
    if (!joinGroupHashInput.trim() || !activeIdentity) return;
    try {
      const room = await api.joinRoom(activeIdentity.ID, joinGroupHashInput.trim());
      triggerAlert('Gruppe beigetreten', `Erfolgreich beigetreten zu "${room.Name || 'Gruppe'}".`);
      setJoinGroupHashInput('');
      setShowJoinGroupModal(false);
      await fetchRooms();
      setActiveRoom(room);
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  async function handleLeaveRoom(roomId) {
    if (!activeIdentity) return;
    showConfirm(
      t('gruppe_verlassen') || 'Gruppe verlassen',
      t('confirm_leave_group_desc') || 'Möchtest du diese Gruppe wirklich verlassen?',
      async () => {
        try {
          await api.leaveRoom(roomId, activeIdentity.ID);
          triggerAlert(t('erfolg') || 'Erfolg', t('group_left') || 'Du hast die Gruppe verlassen.');
          setActiveRoom(null);
          setActiveChannel(null);
          await fetchRooms();
        } catch (err) {
          triggerAlert(t('fehler') || 'Fehler', err.message, 'danger');
        }
      },
      null,
      t('bestaetigen') || 'Bestätigen',
      t('abbrechen') || 'Abbrechen',
      true
    );
  }

  async function handleCreateChannel(e) {
    if (e) e.preventDefault();
    if (!newChannelNameInput.trim() || !activeRoom || !activeIdentity) return;
    try {
      const cleanName = newChannelNameInput.trim().replace(/^#/, '').toLowerCase();
      await api.createChannel(activeRoom.ID, cleanName);
      triggerAlert('Kanal erstellt', `Der Kanal "#${cleanName}" wurde erstellt.`);
      setNewChannelNameInput('');
      setShowCreateChannelModal(false);
      await fetchChannels(activeRoom.ID);
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  async function handleUpdateMemberRole(targetId, role) {
    if (!activeRoom || !activeIdentity) return;
    try {
      await api.updateMemberRole(activeRoom.ID, targetId, role);
      triggerAlert('Rolle aktualisiert', 'Die Mitgliedsrolle wurde erfolgreich geändert.');
      await fetchRooms();
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  function handleOpenGroupSettings() {
    if (!activeRoom) return;
    setEditGroupName(activeRoom.Name || '');
    const isCrisis = activeRoom.Description && activeRoom.Description.startsWith('[CRISIS]');
    if (isCrisis) {
      setEditGroupIsCrisis(true);
      setEditGroupDescription(activeRoom.Description.replace('[CRISIS]', '').trim());
    } else {
      setEditGroupIsCrisis(false);
      setEditGroupDescription(activeRoom.Description || '');
    }
    setEditGroupAvatar(activeRoom.Avatar || '\u{1F465}');
    setEditGroupIsPrivate(activeRoom.IsPrivate || false);
    setEditGroupReadOnly(activeRoom.ReadOnly || false);
    setEditGroupSlowModeSeconds(activeRoom.SlowModeSeconds || 0);
    setEditGroupTopSecret(activeRoom.TopSecret || activeRoom.topSecret || false);
    setShowGroupSettingsModal(true);
  }

  async function handleUpdateGroupSettings(e) {
    if (e) e.preventDefault();
    if (!activeRoom) return;
    try {
      const topSecretBeingEnabled = editGroupTopSecret && !(activeRoom.TopSecret || activeRoom.topSecret);
      if (topSecretBeingEnabled) {
        const missingMembers = [];
        for (const member of activeRoom.Members || []) {
          const isSelf = member.IdentityID === activeIdentity?.ID;
          let pubRecord = null;
          if (isSelf) {
            pubRecord = { public_keys: { mldsa87: derivedKeys?.mldsa87?.public || '' } };
          } else {
            pubRecord = parsePublicRecordValue(member.Identity?.PublicRecord);
            if (!hasMldsa87Capability(pubRecord) && member.Identity?.GaiaID) {
              const res = await api.getPublicIdentity(member.Identity.GaiaID);
              pubRecord = parsePublicRecordValue(res?.publicRecord);
            }
          }
          if (!hasMldsa87Capability(pubRecord)) {
            missingMembers.push(member.Identity?.DisplayName || member.Identity?.GaiaID || member.Username || member.IdentityID);
          }
        }
        if (missingMembers.length > 0) {
          triggerAlert(
            'Top Secret nicht aktivierbar',
            `Folgende Mitglieder haben noch keine ML-DSA-87 Capability: ${missingMembers.slice(0, 5).join(', ')}${missingMembers.length > 5 ? ' ...' : ''}`,
            'warning'
          );
          return;
        }
      }

      const finalDescription = editGroupIsCrisis 
        ? `[CRISIS] ${editGroupDescription.trim()}`
        : editGroupDescription.trim();

      const updatedRoom = await api.updateRoom(activeRoom.ID, {
        name: editGroupName,
        description: finalDescription,
        avatar: editGroupAvatar,
        isPrivate: editGroupIsPrivate,
        readOnly: editGroupReadOnly,
        slowModeSeconds: Number(editGroupSlowModeSeconds),
        topSecret: editGroupTopSecret
      });
      setActiveRoom(updatedRoom);
      setShowGroupSettingsModal(false);
      await fetchRooms();
      triggerAlert('Gruppe aktualisiert', 'Die Gruppeneinstellungen wurden gespeichert.');
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  async function handleDeleteGroup() {
    if (!activeRoom) return;
    showConfirm(
      t('group_delete_title') || 'Gruppe löschen',
      t('group_delete_desc') || 'Möchtest du diese Gruppe wirklich unwiderruflich löschen? Alle Kanäle und Nachrichten dieser Gruppe werden dauerhaft gelöscht.',
      async () => {
        try {
          await api.deleteRoom(activeRoom.ID);
          setShowGroupSettingsModal(false);
          setActiveRoom(null);
          setActiveChannel(null);
          await fetchRooms();
          triggerAlert('Gruppe gelöscht', 'Die Gruppe wurde erfolgreich gelöscht.');
        } catch (err) {
          triggerAlert('Fehler', err.message, 'danger');
        }
      },
      null,
      t('delete') || 'Löschen',
      t('abbrechen') || 'Abbrechen',
      true
    );
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

            const encryptedEnvelope = await crypto.encryptPayload(
              JSON.stringify(chatContent),
              { pke: pubRecord.public_keys.pke, box: pubRecord.public_keys.box, identity: pubRecord.public_keys.identity, mldsa87: pubRecord.public_keys.mldsa87 },
              derivedKeys.sign.private,
              chatContent.clientMessageId,
              undefined,
              {
                topSecret: activeDirectTopSecret,
                senderMldsa87PrivHex: derivedKeys.mldsa87?.private
              }
            );

            const selfEnvelope = await crypto.encryptPayload(
              JSON.stringify(chatContent),
              { pke: derivedKeys.pke.public, box: derivedKeys.box.public, identity: derivedKeys.sign.public, mldsa87: derivedKeys.mldsa87?.public },
              derivedKeys.sign.private,
              chatContent.clientMessageId,
              undefined,
              {
                topSecret: activeDirectTopSecret,
                senderMldsa87PrivHex: derivedKeys.mldsa87?.private
              }
            );
            selfEnvelope.recipient_gaia = recipientGaiaFormat;

            if (hasAttachments) {
              const expiresInHours = attachments.some(att => att?.expiresInHours)
                ? Math.min(12, Math.max(...attachments.map(att => Number(att?.expiresInHours || 0))))
                : 0;
              await api.grantAttachmentsAccess(attachments, [res.id, activeIdentity.ID], expiresInHours);
            }

            const delivery = await api.sendMessage(
              activeIdentity.ID,
              [res.id],
              encryptedEnvelope
            );
            if (delivery?.messageId) {
              selfEnvelope.read_receipt_source_id = delivery.messageId;
            }
            await api.sendMessage(
              activeIdentity.ID,
              [activeIdentity.ID],
              selfEnvelope
            );

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
                { pke: pubRecord.public_keys.pke, box: pubRecord.public_keys.box, identity: pubRecord.public_keys.identity, mldsa87: pubRecord.public_keys.mldsa87 },
                derivedKeys.sign.private,
                message.clientMessageId,
                editTimestamp,
                {
                  topSecret: editTopSecret,
                  senderMldsa87PrivHex: derivedKeys.mldsa87?.private
                }
              );

              const selfEnvelope = await crypto.encryptPayload(
                JSON.stringify(editedContent),
                { pke: derivedKeys.pke.public, box: derivedKeys.box.public, identity: derivedKeys.sign.public, mldsa87: derivedKeys.mldsa87?.public },
                derivedKeys.sign.private,
                message.clientMessageId,
                editTimestamp,
                {
                  topSecret: editTopSecret,
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
              mldsa87: derivedKeys.mldsa87?.public || ''
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
              const encryptedEnvelope = await crypto.encryptPayload(
                JSON.stringify(emailContent),
                { pke: pubRecord.public_keys.pke, box: pubRecord.public_keys.box, identity: pubRecord.public_keys.identity, mldsa87: pubRecord.public_keys.mldsa87 },
                derivedKeys.sign.private,
                clientMessageId,
                undefined,
                {
                  topSecret: activeRoom.TopSecret || activeRoom.topSecret || false,
                  senderMldsa87PrivHex: derivedKeys.mldsa87?.private
                }
              );
              if (activeRoom.TopSecret || activeRoom.topSecret) {
                encryptedEnvelope.room_id = activeRoom.ID;
                encryptedEnvelope.channel_id = activeChannel.id;
              }

              await api.sendMessage(
                activeIdentity.ID,
                [m.IdentityID],
                encryptedEnvelope
              );
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

  function bufToHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('');
  }

  async function computeSha256Hex(arrayBuffer) {
    const hashBuf = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    return bufToHex(hashBuf);
  }

  async function uploadChatFile(file) {
    if (!file || !activeIdentity) return null;
    setUploadProgress(0);
    try {
      const cleanFile = await crypto.stripImageMetadata(file);
      const { encryptedBlob, keyHex, ivHex } = await crypto.encryptFileSymmetric(cleanFile);
      const encryptedSize = encryptedBlob.size;
      const encryptedBuf = await encryptedBlob.arrayBuffer();
      const fileHash = await computeSha256Hex(encryptedBuf);

      const initRes = await api.initUpload(file.name, encryptedSize, file.type, fileHash);
      const fileId = initRes.fileId;

      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(encryptedSize / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, encryptedSize);
        const chunkBlob = encryptedBlob.slice(start, end);
        const chunkBuf = await chunkBlob.arrayBuffer();
        const chunkHash = await computeSha256Hex(chunkBuf);
        await api.uploadChunk(fileId, i, chunkHash, chunkBlob);
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      await api.completeUpload(fileId);
      setUploadProgress(100);

      return {
        fileId,
        fileName: file.name,
        fileSize: encryptedSize,
        mimeType: file.type,
        keyHex,
        ivHex
      };
    } catch (err) {
      setUploadProgress(0);
      triggerAlert('Upload fehlgeschlagen', err.message, 'danger');
      throw err;
    }
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

  async function handleToggleMessagePin(messageId) {
    if (!activeRoom || !activeChannel || !activeIdentity) return;
    try {
      const { pinned } = await api.toggleRoomMessagePin(activeRoom.ID, activeChannel.id, messageId, activeIdentity.ID);
      triggerAlert(
        pinned ? 'Nachricht angepinnt' : 'Nachricht gelöst',
        pinned ? 'Die Nachricht wurde global angepinnt.' : 'Die Nachricht wurde global gelöst.'
      );
      await fetchPinnedMessages();
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  async function handleKickMember(targetId) {
    if (!activeRoom) return;
    try {
      await api.kickRoomMember(activeRoom.ID, targetId);
      triggerAlert('Mitglied entfernt', 'Das Mitglied wurde aus der Gruppe entfernt.');
      await fetchRooms();
    } catch (err) {
      triggerAlert('Fehler beim Entfernen', err.message, 'danger');
    }
  }

  async function handleTransferOwnership(targetId) {
    if (!activeRoom) return;
    try {
      await api.transferRoomOwnership(activeRoom.ID, targetId);
      triggerAlert('Besitzrechte übertragen', 'Die Besitzrechte der Gruppe wurden erfolgreich übertragen.');
      await fetchRooms();
    } catch (err) {
      triggerAlert('Fehler bei Übertragung', err.message, 'danger');
    }
  }

  async function handleGetJoinRequests() {
    if (!activeRoom) return;
    try {
      const reqs = await api.getRoomJoinRequests(activeRoom.ID);
      setJoinRequests(reqs || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleModerateJoinRequest(requestId, status) {
    if (!activeRoom) return;
    try {
      await api.moderateRoomJoinRequest(activeRoom.ID, requestId, status);
      triggerAlert('Anfrage moderiert', `Die Anfrage wurde erfolgreich ${status === 'approved' ? 'angenommen' : 'abgelehnt'}.`);
      await handleGetJoinRequests();
      await fetchRooms();
    } catch (err) {
      triggerAlert('Fehler bei Moderation', err.message, 'danger');
    }
  }

  async function handleGetModerationLogs() {
    if (!activeRoom) return;
    try {
      const logs = await api.getRoomModerationLogs(activeRoom.ID);
      setModerationLogs(logs || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSearchPublicRooms(query) {
    try {
      const results = await api.searchPublicRooms(query);
      setPublicRoomsSearchResult(results || []);
    } catch (err) {
      triggerAlert('Fehler bei Suche', err.message, 'danger');
    }
  }

  async function handleCreateRoomInviteLink(expiresAfterSeconds, maxUses) {
    if (!activeRoom || !activeIdentity) return null;
    try {
      const invite = await api.createRoomInviteLink(activeRoom.ID, activeIdentity.ID, expiresAfterSeconds, maxUses);
      return invite;
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
      return null;
    }
  }

  async function handleJoinViaInviteLink(token) {
    if (!activeIdentity) return;
    try {
      const room = await api.joinRoomViaInviteLink(activeIdentity.ID, token);
      triggerAlert('Gruppe beigetreten', `Erfolgreich beigetreten zu "${room.Name || 'Gruppe'}".`);
      await fetchRooms();
      setActiveRoom(room);
    } catch (err) {
      triggerAlert('Fehler beim Beitritt', err.message, 'danger');
    }
  }

  async function handleCreateJoinRequest(roomId) {
    if (!activeIdentity) return;
    try {
      await api.createRoomJoinRequest(roomId, activeIdentity.ID);
      triggerAlert('Anfrage gesendet', 'Deine Beitrittsanfrage wurde an die Raum-Moderatoren übermittelt.');
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  }

  return {
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
    slowModeCooldowns,
    moderationLogs,
    joinRequests,
    publicRoomsSearchResult,
    pinnedMessageIds,
    joinGroupHashInput, setJoinGroupHashInput,
    newChannelNameInput, setNewChannelNameInput,
    chatMessages, setChatMessages,
    activeChatContact, setActiveChatContact,
    activeDirectTopSecret,
    setDirectTopSecretEnabled,
    chatInputText, setChatInputText,
    showEmojiPicker, setShowEmojiPicker,
    messageReplyTarget, setMessageReplyTarget,
    uploadProgress,
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
    handleEditChatMessage,
    handleClearDirectChat,
    handleClearGroupChannel,
    uploadChatFile,
    toggleBlockContact,
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
  };
}
