import { useState, useEffect, useRef } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { parseToGaiaID } from '../utils/gaiaAddress';
import { createClientMessageId } from '../utils/payload';

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
  const pubKeyCacheRef = useRef({});
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
  const [joinGroupHashInput, setJoinGroupHashInput] = useState('');
  const [newChannelNameInput, setNewChannelNameInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [activeChatContact, setActiveChatContact] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Sync activeRoom with its ref
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

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
    if (!activeIdentity || !window.confirm('Möchtest du diese Gruppe wirklich verlassen?')) return;
    try {
      await api.leaveRoom(roomId, activeIdentity.ID);
      triggerAlert('Gruppe verlassen', 'Du hast die Gruppe verlassen.');
      setActiveRoom(null);
      setActiveChannel(null);
      await fetchRooms();
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
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
    setShowGroupSettingsModal(true);
  }

  async function handleUpdateGroupSettings(e) {
    if (e) e.preventDefault();
    if (!activeRoom) return;
    try {
      const finalDescription = editGroupIsCrisis 
        ? `[CRISIS] ${editGroupDescription.trim()}`
        : editGroupDescription.trim();

      const updatedRoom = await api.updateRoom(activeRoom.ID, {
        name: editGroupName,
        description: finalDescription,
        avatar: editGroupAvatar
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

  async function handleSendChatMessage(e) {
    if (e) e.preventDefault();
    if (!chatInputText.trim() || !activeChatContact || !activeIdentity || !derivedKeys) return;

    const textToSend = chatInputText;
    setChatInputText('');

    try {
      const recipientGaiaFormat = parseToGaiaID(activeChatContact.gaiaID);
      const res = await api.getPublicIdentity(recipientGaiaFormat);
      if (!res || !res.publicRecord) {
        throw new Error(`Chat-Partner nicht gefunden.`);
      }
      const pubRecord = JSON.parse(res.publicRecord);

      verifyRecipientsAndRun(
        [res.gaiaID],
        [pubRecord],
        async () => {
          try {
            const chatContent = {
              subject: '[CHAT]',
              body: textToSend,
              attachments: [],
              clientMessageId: createClientMessageId(),
              recipientGaia: recipientGaiaFormat
            };

            const encryptedEnvelope = await crypto.encryptPayload(
              JSON.stringify(chatContent),
              { pke: pubRecord.public_keys.pke, box: pubRecord.public_keys.box, identity: pubRecord.public_keys.identity },
              derivedKeys.sign.private
            );

            const selfEnvelope = await crypto.encryptPayload(
              JSON.stringify(chatContent),
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

            pollEmails();
          } catch (err) {
            triggerAlert('Fehler beim Senden', err.message, 'danger');
          }
        }
      );
    } catch (err) {
      triggerAlert('Fehler beim Senden', err.message, 'danger');
    }
  }

  async function handleSendGroupMessage(e) {
    if (e) e.preventDefault();
    if (!chatInputText.trim() || !activeRoom || !activeChannel || !activeIdentity || !derivedKeys) return;

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
              identity: derivedKeys.sign.public
            }
          };
          m.Identity = m.Identity || {
            GaiaID: activeIdentity.GaiaID,
            DisplayName: activeIdentity.DisplayName || activeIdentity.displayName
          };
        } else if (m.Identity && m.Identity.PublicRecord) {
          if (typeof m.Identity.PublicRecord === 'string') {
            pubRecord = JSON.parse(m.Identity.PublicRecord);
          } else {
            pubRecord = m.Identity.PublicRecord;
          }
        }
        if (!pubRecord || !pubRecord.public_keys) {
          const res = await api.getPublicIdentity(m.Identity.GaiaID);
          if (res && res.publicRecord) {
            pubRecord = JSON.parse(res.publicRecord);
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
            attachments: [],
            channelId: activeChannel.id,
            roomId: activeRoom.ID,
            clientMessageId
          };

          const sendPromises = memberObjects.map(async (m, index) => {
            try {
              const pubRecord = pubRecords[index];
              const encryptedEnvelope = await crypto.encryptPayload(
                JSON.stringify(emailContent),
                { pke: pubRecord.public_keys.pke, box: pubRecord.public_keys.box, identity: pubRecord.public_keys.identity },
                derivedKeys.sign.private
              );

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
          pollEmails();
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
        await api.clearInboxConversation(activeIdentity.ID, { peerGaiaId: activeChatContact.gaiaID, forEveryone });
        setChatMessages(prev => prev.filter(msg => !(
          (msg.sender === activeChatContact.gaiaID && msg.recipient === activeIdentity.GaiaID) ||
          (msg.sender === activeIdentity.GaiaID && msg.recipient === activeChatContact.gaiaID)
        )));
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
          await api.clearInboxConversation(activeIdentity.ID, { channelId: activeChannel.id });
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
  };
}
