// useChat room CRUD/settings actions (moved verbatim from useChat.js).
// Factory: receives the hook's state/setters as a context object each render.
import * as api from '../../api';
import { hasMldsa87Capability, parsePublicRecordValue } from './helpers';

export function createRoomActions(ctx) {
  const {
    user,
    activeIdentity,
    derivedKeys,
    activeRoom,
    activeChannel,
    activeRoomRef,
    triggerAlert,
    showConfirm,
    t,
    groupNameInput,
    groupDescriptionInput,
    groupAvatarInput,
    isCrisisRoomInput,
    joinGroupHashInput,
    newChannelNameInput,
    editGroupName,
    editGroupDescription,
    editGroupAvatar,
    editGroupIsCrisis,
    editGroupIsPrivate,
    editGroupReadOnly,
    editGroupSlowModeSeconds,
    editGroupTopSecret,
    setRooms,
    setActiveRoom,
    setChannels,
    setActiveChannel,
    setPinnedMessageIds,
    setShowCreateGroupModal,
    setShowJoinGroupModal,
    setShowCreateChannelModal,
    setShowGroupSettingsModal,
    setEditGroupName,
    setEditGroupDescription,
    setEditGroupAvatar,
    setEditGroupIsCrisis,
    setEditGroupIsPrivate,
    setEditGroupReadOnly,
    setEditGroupSlowModeSeconds,
    setEditGroupTopSecret,
    setGroupNameInput,
    setGroupDescriptionInput,
    setGroupAvatarInput,
    setIsCrisisRoomInput,
    setJoinGroupHashInput,
    setNewChannelNameInput
  } = ctx;

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

  return {
    fetchPinnedMessages,
    fetchRooms,
    fetchChannels,
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleCreateChannel,
    handleUpdateMemberRole,
    handleOpenGroupSettings,
    handleUpdateGroupSettings,
    handleDeleteGroup
  };
}
