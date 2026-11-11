import React from 'react';
import { displayGaiaID, parseToGaiaID } from '../../utils/gaiaAddress';

/* Derived mailbox list, unread counters and badge formatter (moved verbatim; memo deps unchanged). */
export default function useAppDerived({ auth, ui, data }) {
  // `activeIdentity` lives in the UI shell (identity wiring), not in the auth hook.
  const { currentMenu, contacts, activeIdentity } = ui;
  const { draftsList, mailThreads, mailboxSearch, mailboxLabel, allMails } = data.emails;
  const { chatMessages, rooms } = data.chat;
  const { gaiaDropInbox } = data.drop;

  const activeMailsList = React.useMemo(() => {
    const isSmtpMenu = currentMenu.startsWith('smtp_');
    const folderType = isSmtpMenu ? currentMenu.substring(5) : currentMenu; 

    // Formatted drafts
    const formattedDrafts = draftsList.map(draft => {
      const isSmtpDraft = !!(draft.recipientGaia?.includes('@') && !draft.recipientGaia?.startsWith('@'));
      const msg = {
        id: draft.id,
        sender: activeIdentity?.GaiaID || '',
        senderGaia: activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.GaiaID || '',
        recipient: draft.recipientGaia || '',
        recipientGaia: draft.recipientGaia ? displayGaiaID(draft.recipientGaia) : '',
        subject: draft.subject || '(Kein Betreff)',
        body: draft.body || '',
        createdAt: draft.updatedAt || draft.createdAt || new Date().toISOString(),
        isRead: true,
        isSmtp: isSmtpDraft,
        isDraft: true,
        mailbox: {
          folder: isSmtpDraft ? 'smtp_drafts' : 'drafts',
          isRead: true,
          isStarred: false,
          isImportant: false,
          isSpam: false,
          isArchived: false,
          labels: []
        }
      };
      return {
        id: draft.id,
        key: `draft_${draft.id}`,
        subject: draft.subject || '(Kein Betreff)',
        messages: [msg],
        latestMessage: msg,
        isRead: true,
        isStarred: false,
        isImportant: false,
        sender: msg.sender,
        senderGaia: msg.senderGaia,
        recipient: msg.recipient,
        recipientGaia: msg.recipientGaia,
        createdAt: msg.createdAt,
        isSmtp: isSmtpDraft,
        isDraft: true
      };
    });

    const allMailItems = [...mailThreads, ...formattedDrafts];

    return allMailItems.filter(thread => {
      if (thread.isSmtp !== isSmtpMenu) return false;

      const latest = thread.latestMessage;
      const folder = thread.isDraft 
        ? 'drafts' 
        : (latest.mailbox?.folder || (latest.sender === activeIdentity?.GaiaID || latest.sender === activeIdentity?.ID ? 'sent' : 'inbox'));
      const isSpam = latest.mailbox?.isSpam || false;

      // 1. Search filter
      if (mailboxSearch) {
        const query = mailboxSearch.toLowerCase();
        const matches = thread.messages.some(mail => 
          (mail.subject && mail.subject.toLowerCase().includes(query)) ||
          (mail.body && mail.body.toLowerCase().includes(query)) ||
          (mail.senderGaia && mail.senderGaia.toLowerCase().includes(query)) ||
          (mail.recipientGaia && mail.recipientGaia.toLowerCase().includes(query))
        );
        if (!matches) return false;
      }

      // 2. Custom label filter
      if (mailboxLabel) {
        const matchesLabel = thread.messages.some(mail => {
          const labels = mail.mailbox?.labels || [];
          return labels.includes(mailboxLabel);
        });
        if (!matchesLabel) return false;
      }

      // 3. Folder specific checks
      if (folderType === 'starred') {
        if (!thread.isStarred) return false;
        return folder !== 'trash' && !isSpam;
      }
      if (folderType === 'important') {
        if (!thread.isImportant) return false;
        return folder !== 'trash' && !isSpam;
      }
      if (folderType === 'inbox') {
        return folder === 'inbox' && !isSpam && folder !== 'trash';
      }
      if (folderType === 'drafts') {
        return thread.isDraft === true;
      }
      if (folderType === 'sent') {
        return folder === 'sent' && !thread.isDraft;
      }
      if (folderType === 'archive') {
        return folder === 'archive' || latest.mailbox?.isArchived;
      }
      if (folderType === 'spam') {
        return folder === 'spam' || isSpam;
      }
      if (folderType === 'trash') {
        return folder === 'trash';
      }
      if (folderType === 'snoozed') {
        return folder === 'snoozed' || thread.messages.some(m => !!m.mailbox?.snoozedUntil);
      }

      return true;
    });
  }, [mailThreads, draftsList, currentMenu, mailboxSearch, mailboxLabel, activeIdentity]);

  const unreadEmailsCount = React.useMemo(() => {
    return allMails.filter(mail => !mail.isSmtp && (mail.mailbox?.folder === 'inbox') && !mail.isRead && !mail.mailbox?.isSpam).length;
  }, [allMails]);

  const unreadSmtpEmailsCount = React.useMemo(() => {
    return allMails.filter(mail => mail.isSmtp && (mail.mailbox?.folder === 'inbox') && !mail.isRead && !mail.mailbox?.isSpam).length;
  }, [allMails]);

  const getUnreadChatCount = (contact) => {
    if (!activeIdentity) return 0;
    const contactGaia = parseToGaiaID(contact.gaiaID);
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    return chatMessages.filter(msg => 
      parseToGaiaID(msg.sender) === contactGaia &&
      parseToGaiaID(msg.recipient) === ownGaia &&
      !msg.isRead
    ).length;
  };

  const unreadChatsTotal = contacts.reduce((sum, c) => sum + getUnreadChatCount(c), 0);

  const getUnreadRoomCount = (room) => {
    if (!activeIdentity) return 0;
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    return chatMessages.filter(msg => 
      msg.roomId === room.ID && 
      parseToGaiaID(msg.sender) !== ownGaia &&
      msg.sender !== activeIdentity.ID && 
      !msg.isRead
    ).length;
  };

  const unreadRoomsTotal = rooms.reduce((sum, r) => sum + getUnreadRoomCount(r), 0);

  const formatBadgeCount = (count) => {
    if (count <= 0) return null;
    return count > 99 ? '99+' : count;
  };
  const unreadDropsCount = gaiaDropInbox.filter(drop => drop.status === 'new').length;

  return {
    activeMailsList,
    unreadEmailsCount,
    unreadSmtpEmailsCount,
    getUnreadChatCount,
    unreadChatsTotal,
    getUnreadRoomCount,
    unreadRoomsTotal,
    formatBadgeCount,
    unreadDropsCount,
  };
}
