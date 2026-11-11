import React from 'react';
import * as api from '../../../api';

/**
 * VGT GLASS 2100 — conversation context menu + destructive chat/group flows.
 *
 * The confirmation copy, API calls, message pruning, un-hiding and notices are
 * unchanged from the original component. Added only: Escape closes the menu
 * (the previous window-click close is kept as-is).
 */
export default function useConversationMenu({
  activeIdentity,
  user,
  t,
  showConfirm,
  triggerAlert,
  setChatMessages,
  fetchRooms,
  activeRoom,
  setActiveRoom,
  activeChatContact,
  setActiveChatContact,
  pinnedChatIds,
  persistPinned,
  hiddenChatIds,
  persistHidden,
  togglePinChat,
  parseToGaiaID
}) {
  const [contextMenu, setContextMenu] = React.useState(null);

  React.useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  React.useEffect(() => {
    if (!contextMenu) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [contextMenu]);

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      type,
      target: item
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDeleteDM = (contact) => {
    if (!activeIdentity) return;
    showConfirm(
      t('confirm_clear_chat_title') || 'Chat leeren',
      t('confirm_delete_chat_desc') || `Möchtest du den Chat mit ${contact.displayName} wirklich löschen und ausblenden?`,
      () => {
        api.clearInboxConversation(activeIdentity.ID, { peerGaiaId: contact.gaiaID, forEveryone: false })
          .then(() => {
            const contactGaia = parseToGaiaID(contact.gaiaID);
            const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
            if (setChatMessages) {
              setChatMessages(prev => prev.filter(msg => !(
                (parseToGaiaID(msg.sender) === contactGaia && parseToGaiaID(msg.recipient) === ownGaia) ||
                (parseToGaiaID(msg.sender) === ownGaia && parseToGaiaID(msg.recipient) === contactGaia)
              )));
            }
            const contactId = contact.ID || contact.id || contact.gaiaID;
            persistHidden([...hiddenChatIds, contactId]);
            persistPinned(pinnedChatIds.filter(x => x !== contactId && x !== contact.ID && x !== contact.id && x !== contact.gaiaID));
            if (activeChatContact?.ID === contact.ID || activeChatContact?.id === contact.id || activeChatContact?.gaiaID === contact.gaiaID) {
              setActiveChatContact(null);
            }
            triggerAlert(t('erfolg') || 'Erfolg', t('chat_deleted_hidden') || 'Chat gelöscht und ausgeblendet.');
          })
          .catch(err => {
            triggerAlert(t('fehler') || 'Fehler', err.message, 'danger');
          });
      },
      null,
      t('bestaetigen') || 'Bestätigen',
      t('abbrechen') || 'Abbrechen',
      true
    );
  };

  const handleDeleteGroupRoom = (room) => {
    const isOwner = room.CreatedBy === activeIdentity?.ID || room.CreatedBy === user?.id;
    if (isOwner) {
      showConfirm(
        t('group_delete_title') || 'Gruppe löschen',
        t('group_delete_desc') || `Möchtest du die Gruppe "${room.Name}" wirklich löschen? Alle Kanäle und Nachrichten dieser Gruppe werden gelöscht.`,
        () => {
          api.deleteRoom(room.ID)
            .then(() => {
              if (setChatMessages) {
                setChatMessages(prev => prev.filter(msg => msg.roomId !== room.ID));
              }
              if (activeRoom?.ID === room.ID) {
                setActiveRoom(null);
              }
              persistPinned(pinnedChatIds.filter(x => x !== room.ID));
              if (fetchRooms) fetchRooms();
              triggerAlert(t('erfolg') || 'Erfolg', t('group_deleted') || 'Gruppe erfolgreich gelöscht.');
            })
            .catch(err => {
              triggerAlert(t('fehler') || 'Fehler', err.message, 'danger');
            });
        },
        null,
        t('bestaetigen') || 'Bestätigen',
        t('abbrechen') || 'Abbrechen',
        true
      );
    } else {
      showConfirm(
        t('gruppe_verlassen') || 'Gruppe verlassen',
        t('confirm_leave_group_desc') || `Möchtest du die Gruppe "${room.Name}" wirklich verlassen?`,
        () => {
          api.leaveRoom(room.ID, activeIdentity.ID)
            .then(() => {
              if (activeRoom?.ID === room.ID) {
                setActiveRoom(null);
              }
              persistPinned(pinnedChatIds.filter(x => x !== room.ID));
              if (fetchRooms) fetchRooms();
              triggerAlert(t('erfolg') || 'Erfolg', t('group_left') || 'Gruppe erfolgreich verlassen.');
            })
            .catch(err => {
              triggerAlert(t('fehler') || 'Fehler', err.message, 'danger');
            });
        },
        null,
        t('bestaetigen') || 'Bestätigen',
        t('abbrechen') || 'Abbrechen',
        true
      );
    }
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    if (contextMenu.type === 'chat') {
      handleDeleteDM(contextMenu.target);
    } else {
      handleDeleteGroupRoom(contextMenu.target);
    }
    setContextMenu(null);
  };

  const handleTogglePin = () => {
    if (!contextMenu) return;
    togglePinChat(contextMenu.target.ID);
    setContextMenu(null);
  };

  const pinLabel = contextMenu && pinnedChatIds.includes(contextMenu.target.ID)
    ? (t('entpinnen') || 'Entpinnen')
    : (t('anpinnen') || 'Anpinnen');

  const deleteLabel = contextMenu && contextMenu.type === 'chat'
    ? (t('chat_loeschen') || 'Chat löschen')
    : (contextMenu && (contextMenu.target.CreatedBy === activeIdentity?.ID || contextMenu.target.CreatedBy === user?.id)
        ? (t('gruppe_loeschen') || 'Gruppe löschen')
        : (t('gruppe_verlassen') || 'Gruppe verlassen'));

  return {
    contextMenu,
    handleContextMenu,
    handleDelete,
    handleTogglePin,
    closeContextMenu,
    pinLabel,
    deleteLabel
  };
}
