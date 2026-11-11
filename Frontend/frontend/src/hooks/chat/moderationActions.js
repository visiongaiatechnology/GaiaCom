// useChat moderation / discovery actions (moved verbatim from useChat.js).
// Factory: receives the hook's state/setters as a context object each render.
import * as api from '../../api';

export function createModerationActions(ctx) {
  const {
    activeRoom,
    activeChannel,
    activeIdentity,
    triggerAlert,
    fetchRooms,
    fetchPinnedMessages,
    setJoinRequests,
    setModerationLogs,
    setPublicRoomsSearchResult,
    setActiveRoom
  } = ctx;

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
