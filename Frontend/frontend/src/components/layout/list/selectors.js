/**
 * VGT GLASS 2100 — Inbox list selectors.
 *
 * Pure display filters. The predicates intentionally mirror the original
 * ListPane expressions one-to-one so pinning/hiding/unread behaviour does not
 * change anywhere.
 */

export function selectVisibleChats(contacts, options) {
  const list = Array.isArray(contacts) ? contacts : [];
  const pinnedChatIds = options.pinnedChatIds || [];
  const hiddenChatIds = options.hiddenChatIds || [];
  const activeChatContact = options.activeChatContact || null;
  const hasMessages = typeof options.hasMessages === 'function' ? options.hasMessages : () => false;

  return list
    .filter((contact) => (
      pinnedChatIds.includes(contact.ID) ||
      (activeChatContact && activeChatContact.ID === contact.ID) ||
      (hasMessages(contact) && !hiddenChatIds.includes(contact.ID))
    ))
    .sort((a, b) => {
      const aPinned = pinnedChatIds.includes(a.ID) ? 1 : 0;
      const bPinned = pinnedChatIds.includes(b.ID) ? 1 : 0;
      return bPinned - aPinned;
    });
}

export function selectVisibleRooms(rooms, options) {
  const list = Array.isArray(rooms) ? rooms : [];
  const pinnedChatIds = options.pinnedChatIds || [];
  const hiddenChatIds = options.hiddenChatIds || [];
  const activeRoom = options.activeRoom || null;
  const getUnreadRoomCount = typeof options.getUnreadRoomCount === 'function'
    ? options.getUnreadRoomCount
    : () => 0;

  return list
    .filter((room) => (
      pinnedChatIds.includes(room.ID) ||
      (activeRoom && activeRoom.ID === room.ID) ||
      (getUnreadRoomCount(room) > 0) ||
      !hiddenChatIds.includes(room.ID)
    ))
    .sort((a, b) => {
      const aPinned = pinnedChatIds.includes(a.ID) ? 1 : 0;
      const bPinned = pinnedChatIds.includes(b.ID) ? 1 : 0;
      return bPinned - aPinned;
    });
}

export function selectVisibleChannels(publicChannels, channelSearch) {
  const list = Array.isArray(publicChannels) ? publicChannels : [];
  if (!channelSearch) return list;
  const query = String(channelSearch).toLowerCase();
  return list.filter((channel) => (
    (channel.name && channel.name.toLowerCase().includes(query)) ||
    (channel.description && channel.description.toLowerCase().includes(query))
  ));
}
