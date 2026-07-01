// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useEffect } from 'react';
import { parseToGaiaID, displayGaiaID } from '../utils/gaiaAddress';
import { safeStorageJson } from '../utils/safeJson';

/**
 * Sends browser push notifications for new incoming chat/group messages.
 * Uses refs to avoid re-triggering for already-seen messages.
 * Extracted from App.js (was lines 1062–1147). Zero logic changes.
 */
export function useChatNotifications({
  user,
  activeIdentity,
  chatMessages,
  contacts,
  currentMenu,
  activeChatContact,
  activeRoom,
  activeChannel,
  rooms,
  channels,
  knownChatNotificationIdsRef,
  chatNotificationsPrimedRef
}) {
  useEffect(() => {
    if (!activeIdentity?.GaiaID) {
      return;
    }

    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    const incomingChatMessages = chatMessages
      .filter(msg => msg.subject === '[CHAT]' && msg.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const freshMessages = [];
    for (const msg of incomingChatMessages) {
      if (!knownChatNotificationIdsRef.current.has(msg.id)) {
        knownChatNotificationIdsRef.current.add(msg.id);
        if (chatNotificationsPrimedRef.current && !msg.isRead) {
          freshMessages.push(msg);
        }
      }
    }

    if (user?.id && activeIdentity?.ID) {
      try {
        sessionStorage.setItem(
          `gaia_seen_chat_notifications_${user.id}_${activeIdentity.ID}`,
          JSON.stringify(Array.from(knownChatNotificationIdsRef.current))
        );
      } catch (_) {}
    }

    if (incomingChatMessages.length > 0 && !chatNotificationsPrimedRef.current) {
      chatNotificationsPrimedRef.current = true;
      return;
    }

    if (!chatNotificationsPrimedRef.current) {
      return;
    }

    if (freshMessages.length === 0) {
      return;
    }

    const isWindowVisible = typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus();
    const showNotification = msg => {
      if (!msg || msg.sender === activeIdentity.ID || parseToGaiaID(msg.sender) === ownGaia) {
        return;
      }
      if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      const isDirectMessage = !msg.channelId;
      const senderDisplayName = contacts.find(contact => parseToGaiaID(contact.gaiaID) === parseToGaiaID(msg.sender))?.displayName
        || msg.senderGaia
        || displayGaiaID(msg.sender);
      const body = String(msg.body || '');
      const preview = body.length > 90 ? `${body.slice(0, 90)}...` : body;

      if (isDirectMessage) {
        const activeDirectVisible = isWindowVisible &&
          currentMenu === 'chat' &&
          activeChatContact &&
          parseToGaiaID(activeChatContact.gaiaID) === parseToGaiaID(msg.sender);
        if (activeDirectVisible) {
          return;
        }
        new Notification(`Neue Chat-Nachricht von ${senderDisplayName}`, { body: preview || 'Neue sichere Nachricht' });
        return;
      }

      const roomName = rooms.find(room => room.ID === msg.roomId)?.Name || 'Gruppe';
      const channelName = channels.find(channel => channel.id === msg.channelId)?.name || msg.channelId || 'channel';
      const activeGroupVisible = isWindowVisible &&
        currentMenu === 'groups' &&
        activeRoom?.ID === msg.roomId &&
        activeChannel?.id === msg.channelId;
      if (activeGroupVisible) {
        return;
      }
      new Notification(`${roomName} · #${channelName}`, {
        body: `${senderDisplayName}: ${preview || 'Neue sichere Nachricht'}`
      });
    };

    freshMessages.forEach(showNotification);
  }, [activeChannel, activeChatContact, activeIdentity, activeRoom, channels, chatMessages, contacts, currentMenu, rooms, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Initialises and resets the notification ID tracking refs when user/identity changes.
 * Extracted from App.js (was lines 1212–1231). Zero logic changes.
 */
export function useChatNotificationPrimer({ user, activeIdentity, knownChatNotificationIdsRef, chatNotificationsPrimedRef }) {
  useEffect(() => {
    if (!user?.id || !activeIdentity?.ID) {
      knownChatNotificationIdsRef.current = new Set();
      chatNotificationsPrimedRef.current = false;
      return undefined;
    }
    const storageKey = `gaia_seen_chat_notifications_${user.id}_${activeIdentity.ID}`;
    const cached = safeStorageJson(sessionStorage, storageKey, []);
    knownChatNotificationIdsRef.current = new Set(Array.isArray(cached) ? cached : []);
    chatNotificationsPrimedRef.current = false;

    const timer = setTimeout(() => {
      chatNotificationsPrimedRef.current = true;
    }, 3000);
    return () => clearTimeout(timer);
  }, [activeIdentity?.ID, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
