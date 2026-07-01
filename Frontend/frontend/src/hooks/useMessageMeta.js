// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useState, useCallback, useEffect } from 'react';
import * as api from '../api';
import { safeStorageJson } from '../utils/safeJson';

/**
 * Manages per-message metadata: starred, pinned, and emoji reactions.
 * State is persisted to localStorage keyed by user ID.
 * Extracted from App.js (was lines 650–833). Zero logic changes.
 *
 * @param {object} params
 * @param {object|null} params.user
 * @param {object|null} params.activeIdentity
 * @param {Array}  params.chatMessages
 * @param {Function} params.pollEmails
 * @param {Function} params.triggerAlert
 * @param {Function} params.t  - translation function
 *
 * @returns {{ messageMeta, setMessageMeta, updateMessageMeta, toggleMessagePin, toggleMessageSaved, reactToMessage }}
 */
export function useMessageMeta({ user, activeIdentity, chatMessages, pollEmails, triggerAlert, t }) {
  const [messageMeta, setMessageMeta] = useState({});

  // Load from localStorage when user changes
  useEffect(() => {
    if (!user) {
      setMessageMeta({});
      return;
    }
    setMessageMeta(safeStorageJson(localStorage, `gaia_message_meta_${user.id}`, {}));
  }, [user]);

  const updateMessageMeta = useCallback((updater) => {
    if (!user) return;
    setMessageMeta(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(`gaia_message_meta_${user.id}`, JSON.stringify(next));
      return next;
    });
  }, [user]);

  // Sync reactions / pinned / saved from incoming server messages
  useEffect(() => {
    if (!user) return;
    setMessageMeta(prev => {
      let changed = false;
      const next = { ...prev };
      const hasPinnedLabel = labels => Array.isArray(labels) && labels.includes('chat-pinned');
      for (const message of chatMessages) {
        if (!message?.id) continue;
        const serverReactions = message.reactions || {};
        const serverReactedByMe = message.reactedByMe || {};
        const serverSaved = !!message.mailbox?.isStarred;
        const serverPinned = hasPinnedLabel(message.mailbox?.labels);
        const current = next[message.id] || {};
        if (
          JSON.stringify(current.reactions || {}) !== JSON.stringify(serverReactions) ||
          JSON.stringify(current.reactedByMe || {}) !== JSON.stringify(serverReactedByMe) ||
          !!current.saved !== serverSaved ||
          !!current.pinned !== serverPinned
        ) {
          next[message.id] = {
            ...current,
            reactions: serverReactions,
            reactedByMe: serverReactedByMe,
            saved: serverSaved,
            pinned: serverPinned
          };
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(`gaia_message_meta_${user.id}`, JSON.stringify(next));
      }
      return changed ? next : prev;
    });
  }, [chatMessages, user]);

  const toggleMessagePin = useCallback(async (messageId) => {
    if (!messageId || !activeIdentity?.ID) return;
    const message = chatMessages.find(entry => entry.id === messageId);
    if (!message) return;
    let previousMeta = null;
    const nextPinned = !(messageMeta[messageId]?.pinned);
    updateMessageMeta(prev => {
      previousMeta = prev[messageId] || {};
      return {
        ...prev,
        [messageId]: {
          ...previousMeta,
          pinned: nextPinned
        }
      };
    });
    try {
      const labels = Array.isArray(message.mailbox?.labels) ? [...message.mailbox.labels] : [];
      const nextLabels = nextPinned
        ? Array.from(new Set([...labels.filter(label => label !== 'chat-pinned'), 'chat-pinned']))
        : labels.filter(label => label !== 'chat-pinned');
      await api.updateMailboxStates(activeIdentity.ID, [{
        messageId,
        folder: message.mailbox?.folder || 'inbox',
        isRead: !!message.isRead,
        isStarred: !!message.mailbox?.isStarred,
        isImportant: !!message.mailbox?.isImportant,
        isSpam: !!message.mailbox?.isSpam,
        isArchived: !!message.mailbox?.isArchived,
        labels: nextLabels
      }]);
      pollEmails();
    } catch (err) {
      updateMessageMeta(prev => ({
        ...prev,
        [messageId]: previousMeta
      }));
      triggerAlert(t('fehler') || 'Fehler', err.message || 'Pin konnte nicht gespeichert werden.', 'danger');
    }
  }, [activeIdentity?.ID, chatMessages, messageMeta, pollEmails, t, triggerAlert, updateMessageMeta]);

  const toggleMessageSaved = useCallback(async (messageId) => {
    if (!messageId || !activeIdentity?.ID) return;
    const message = chatMessages.find(entry => entry.id === messageId);
    if (!message) return;
    let previousMeta = null;
    const nextSaved = !(messageMeta[messageId]?.saved);
    updateMessageMeta(prev => {
      previousMeta = prev[messageId] || {};
      return {
        ...prev,
        [messageId]: {
          ...previousMeta,
          saved: nextSaved
        }
      };
    });
    try {
      await api.updateMailboxStates(activeIdentity.ID, [{
        messageId,
        folder: message.mailbox?.folder || 'inbox',
        isRead: !!message.isRead,
        isStarred: nextSaved,
        isImportant: !!message.mailbox?.isImportant,
        isSpam: !!message.mailbox?.isSpam,
        isArchived: !!message.mailbox?.isArchived,
        labels: Array.isArray(message.mailbox?.labels) ? message.mailbox.labels : []
      }]);
      pollEmails();
    } catch (err) {
      updateMessageMeta(prev => ({
        ...prev,
        [messageId]: previousMeta
      }));
      triggerAlert(t('fehler') || 'Fehler', err.message || 'Gespeichert-Status konnte nicht gespeichert werden.', 'danger');
    }
  }, [activeIdentity?.ID, chatMessages, messageMeta, pollEmails, t, triggerAlert, updateMessageMeta]);

  const reactToMessage = useCallback(async (messageId, emoji) => {
    if (!messageId || !emoji || !activeIdentity?.ID) return;
    let previousMeta = null;
    updateMessageMeta(prev => {
      const current = prev[messageId] || {};
      previousMeta = current;
      const reactions = { ...(current.reactions || {}) };
      const reactedByMe = { ...(current.reactedByMe || {}) };
      if (reactedByMe[emoji]) {
        reactions[emoji] = Math.max(0, Number(reactions[emoji] || 0) - 1);
        if (reactions[emoji] === 0) delete reactions[emoji];
        delete reactedByMe[emoji];
      } else {
        reactions[emoji] = Number(reactions[emoji] || 0) + 1;
        reactedByMe[emoji] = true;
      }
      return {
        ...prev,
        [messageId]: {
          ...current,
          reactions,
          reactedByMe
        }
      };
    });
    try {
      const reactionState = await api.toggleMessageReaction(activeIdentity.ID, messageId, emoji);
      updateMessageMeta(prev => ({
        ...prev,
        [messageId]: {
          ...(prev[messageId] || {}),
          reactions: reactionState?.reactions || {},
          reactedByMe: reactionState?.reactedByMe || {}
        }
      }));
    } catch (err) {
      updateMessageMeta(prev => {
        const next = { ...prev };
        if (previousMeta) {
          next[messageId] = previousMeta;
        } else {
          delete next[messageId];
        }
        return next;
      });
      triggerAlert(t('fehler') || 'Fehler', err.message || 'Reaction konnte nicht gespeichert werden.', 'danger');
    }
  }, [activeIdentity, updateMessageMeta, triggerAlert, t]);

  return {
    messageMeta,
    setMessageMeta,
    updateMessageMeta,
    toggleMessagePin,
    toggleMessageSaved,
    reactToMessage
  };
}
