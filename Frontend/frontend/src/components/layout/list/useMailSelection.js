import React from 'react';
import * as api from '../../../api';

/**
 * VGT GLASS 2100 — bulk mail selection for the list rail.
 *
 * State, reset effect and the batch mail-state call are unchanged; only the
 * location moved so the orchestrator stays readable.
 */
export default function useMailSelection({
  activeIdentity,
  activeMailsList,
  pollEmails,
  triggerAlert,
  currentMenu,
  mailboxSearch,
  mailboxLabel
}) {
  const [selectedMailIds, setSelectedMailIds] = React.useState([]);

  // Reset bulk selection on folder or search changes
  React.useEffect(() => {
    setSelectedMailIds([]);
  }, [currentMenu, mailboxSearch, mailboxLabel]);

  const handleToggleSelect = (e, mailId) => {
    e.stopPropagation();
    if (selectedMailIds.includes(mailId)) {
      setSelectedMailIds(selectedMailIds.filter((id) => id !== mailId));
    } else {
      setSelectedMailIds([...selectedMailIds, mailId]);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedMailIds.length === 0 || !activeIdentity?.ID) return;
    const selectedMails = activeMailsList.filter((m) => selectedMailIds.includes(m.id));
    try {
      const updates = [];
      for (const item of selectedMails) {
        // Handle both threads and single emails
        const mailsToUpdate = item.messages ? item.messages : [item];
        for (const mail of mailsToUpdate) {
          const currentBox = mail.mailbox || {};
          const patch = {};
          if (action === 'read') patch.isRead = true;
          else if (action === 'unread') patch.isRead = false;
          else if (action === 'archive') patch.folder = 'archive';
          else if (action === 'delete') patch.folder = 'trash';
          else if (action === 'spam') patch.isSpam = true;
          else if (action === 'star') patch.isStarred = true;
          else if (action === 'unstar') patch.isStarred = false;

          updates.push({
            messageId: mail.id,
            folder: patch.folder !== undefined ? patch.folder : (currentBox.folder || 'inbox'),
            isRead: patch.isRead !== undefined ? patch.isRead : mail.isRead,
            isStarred: patch.isStarred !== undefined ? patch.isStarred : (currentBox.isStarred || false),
            isImportant: patch.isImportant !== undefined ? patch.isImportant : (currentBox.isImportant || false),
            isSpam: patch.isSpam !== undefined ? patch.isSpam : (currentBox.isSpam || false),
            isArchived: patch.isArchived !== undefined ? patch.isArchived : (currentBox.isArchived || false),
            labels: currentBox.labels || '[]',
            snoozedUntil: currentBox.snoozedUntil || ''
          });
        }
      }

      await api.updateMailboxStates(activeIdentity.ID, updates);
      triggerAlert('Aktion ausgeführt', `${selectedMailIds.length} Unterhaltungen wurden aktualisiert.`);
      setSelectedMailIds([]);
      if (pollEmails) pollEmails();
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  const clearSelection = () => setSelectedMailIds([]);

  return { selectedMailIds, handleToggleSelect, handleBulkAction, clearSelection };
}
