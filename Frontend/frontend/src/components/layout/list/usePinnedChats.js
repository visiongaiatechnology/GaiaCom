import React from 'react';
import { safeStorageJson } from '../../../utils/safeJson';

/**
 * VGT GLASS 2100 — pinned/hidden conversation state for the list rail.
 *
 * Extracted verbatim from the original ListPane so localStorage keys, pin
 * ordering and the "unhide when an unread message arrives" effect keep working
 * exactly as before.
 */
export default function usePinnedChats({ activeIdentity, chatMessages, contacts, parseToGaiaID }) {
  const [pinnedChatIds, setPinnedChatIds] = React.useState(() => {
    return safeStorageJson(localStorage, 'gaiacom_pinned_chats', []);
  });

  const [hiddenChatIds, setHiddenChatIds] = React.useState(() => {
    return safeStorageJson(localStorage, 'gaiacom_hidden_chats', []);
  });

  const persistHidden = (val) => {
    setHiddenChatIds(val);
    localStorage.setItem('gaiacom_hidden_chats', JSON.stringify(val));
  };

  const persistPinned = (val) => {
    setPinnedChatIds(val);
    localStorage.setItem('gaiacom_pinned_chats', JSON.stringify(val));
  };

  const togglePinChat = (id) => {
    const next = pinnedChatIds.includes(id)
      ? pinnedChatIds.filter((x) => x !== id)
      : [...pinnedChatIds, id];
    persistPinned(next);
  };

  const hasMessages = (contact) => {
    if (!activeIdentity || !chatMessages) return false;
    const contactGaia = parseToGaiaID(contact.gaiaID);
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    return chatMessages.some((msg) => {
      const senderGaia = parseToGaiaID(msg.sender);
      const recipientGaia = parseToGaiaID(msg.recipient);
      return (senderGaia === contactGaia && recipientGaia === ownGaia) ||
        (senderGaia === ownGaia && recipientGaia === contactGaia);
    });
  };

  React.useEffect(() => {
    if (!activeIdentity || !chatMessages || hiddenChatIds.length === 0) return;
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    let changed = false;
    const nextHidden = hiddenChatIds.filter((id) => {
      const contact = contacts.find((c) => c.ID === id);
      if (!contact) return true;
      const contactGaia = parseToGaiaID(contact.gaiaID);
      const hasUnreadIncoming = chatMessages.some((msg) =>
        parseToGaiaID(msg.sender) === contactGaia &&
        parseToGaiaID(msg.recipient) === ownGaia &&
        !msg.isRead
      );
      if (hasUnreadIncoming) {
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) {
      persistHidden(nextHidden);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages, activeIdentity, contacts, hiddenChatIds, parseToGaiaID]);

  return { pinnedChatIds, hiddenChatIds, persistPinned, persistHidden, togglePinChat, hasMessages };
}
