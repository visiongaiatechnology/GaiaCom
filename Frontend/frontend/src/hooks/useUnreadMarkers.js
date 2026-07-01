// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useEffect } from 'react';
import { parseToGaiaID } from '../utils/gaiaAddress';

/**
 * Tracks the first unread message position for the active direct chat and
 * active group channel, and marks messages as read when they enter view.
 * Extracted from App.js (was lines 863–1060). Zero logic changes.
 */
export function useUnreadMarkers({
  currentMenu,
  activeChatContact,
  activeIdentity,
  chatMessages,
  activeRoom,
  activeChannel,
  setActiveDirectUnreadMarker,
  setActiveGroupUnreadMarker,
  directUnreadSnapshotKeyRef,
  groupUnreadSnapshotKeyRef,
  markMessagesAsRead
}) {
  // --- Direct chat: snapshot unread marker on contact/messages change ---
  useEffect(() => {
    if (currentMenu !== 'chat' || !activeChatContact || !activeIdentity) {
      setActiveDirectUnreadMarker(null);
      directUnreadSnapshotKeyRef.current = '';
      return;
    }
    const contactGaia = parseToGaiaID(activeChatContact.gaiaID);
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    const snapshotKey = `${ownGaia}|${contactGaia}`;
    if (directUnreadSnapshotKeyRef.current === snapshotKey) {
      return;
    }
    const unreadMessages = chatMessages.filter(msg =>
      parseToGaiaID(msg.sender) === contactGaia &&
      parseToGaiaID(msg.recipient) === ownGaia &&
      !msg.isRead
    );
    directUnreadSnapshotKeyRef.current = snapshotKey;
    setActiveDirectUnreadMarker({
      contactGaiaId: contactGaia,
      firstUnreadMessageId: unreadMessages[0]?.id || '',
      count: unreadMessages.length
    });
  }, [activeChatContact, activeIdentity, chatMessages, currentMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Direct chat: mark incoming messages as read ---
  useEffect(() => {
    if (currentMenu !== 'chat' || !activeChatContact || !activeIdentity) return;
    const contactGaia = parseToGaiaID(activeChatContact.gaiaID);
    const ids = chatMessages
      .filter(msg => parseToGaiaID(msg.sender) === contactGaia && parseToGaiaID(msg.recipient) === parseToGaiaID(activeIdentity.GaiaID))
      .filter(msg => !msg.isRead)
      .map(msg => msg.id);
    if (ids.length > 0) markMessagesAsRead(ids);
  }, [activeChatContact, activeIdentity, chatMessages, currentMenu, markMessagesAsRead]);

  // --- Group chat: snapshot unread marker ---
  useEffect(() => {
    if (currentMenu !== 'groups' || !activeRoom || !activeIdentity) {
      setActiveGroupUnreadMarker(null);
      groupUnreadSnapshotKeyRef.current = '';
      return;
    }
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    const snapshotKey = `${activeRoom.ID}|${activeChannel?.id || ''}|${ownGaia}`;
    if (groupUnreadSnapshotKeyRef.current === snapshotKey) {
      return;
    }
    const unreadMessages = chatMessages
      .filter(msg =>
        msg.roomId === activeRoom.ID &&
        (!activeChannel?.id || msg.channelId === activeChannel.id) &&
        parseToGaiaID(msg.sender) !== ownGaia &&
        msg.sender !== activeIdentity.ID &&
        !msg.isRead
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    groupUnreadSnapshotKeyRef.current = snapshotKey;
    setActiveGroupUnreadMarker({
      roomId: activeRoom.ID,
      channelId: activeChannel?.id || '',
      firstUnreadMessageId: unreadMessages[0]?.id || '',
      count: unreadMessages.length
    });
  }, [activeChannel?.id, activeIdentity, activeRoom, chatMessages, currentMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Group chat: mark group messages as read ---
  useEffect(() => {
    if (currentMenu !== 'groups' || !activeRoom || !activeIdentity) return;
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    const ids = chatMessages
      .filter(msg =>
        msg.roomId === activeRoom.ID &&
        parseToGaiaID(msg.sender) !== ownGaia &&
        msg.sender !== activeIdentity.ID &&
        !msg.isRead
      )
      .map(msg => msg.id);
    if (ids.length > 0) markMessagesAsRead(ids);
  }, [activeIdentity, activeRoom, chatMessages, currentMenu, markMessagesAsRead]);
}
