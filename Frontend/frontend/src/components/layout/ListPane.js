// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import * as api from '../../api';
import Icons from '../common/Icons';
import { safeJsonParse, safeStorageJson } from '../../utils/safeJson';

function parseMailboxLabels(labels) {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === 'string') {
    const parsed = safeJsonParse(labels, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

export const ListPane = ({
  activeDraftIdRef,
  setIsSmtpMode,
  currentMenu,
  setCurrentMenu,
  contacts,
  setContacts,
  rooms,
  activeRoom,
  setActiveRoom,
  publicChannels = [],
  activePublicChannel,
  setActivePublicChannel,
  setPublicChannelCreatorOpen,
  publicChannelsLoading,
  refreshPublicChannels,
  activeChatContact,
  setActiveChatContact,
  selectedMail,
  setSelectedMail,
  setIsComposing,
  setComposeTo,
  setComposeSubject,
  setComposeBody,
  setComposeReplyTo,
  setMobileMenuOpen,
  activeMailsList,
  getUnreadChatCount,
  getUnreadRoomCount,
  formatBadgeCount,
  setMailListCollapsed,
  setContactProfile,
  openContactProfile,
  driveUnlocked,
  driveRecords,
  selectedDriveRecord,
  setSelectedDriveRecord,
  gaiaDropInbox,
  selectedDrop,
  setSelectedDrop,
  activeIdentity,
  loadGaiaDropInbox,
  gaiaDropLoading,
  user,
  t,
  displayGaiaID,
  parseToGaiaID,
  buildInitialKeyHistory,
  triggerAlert,
  setShowCreateGroupModal,
  setShowJoinGroupModal,
  activeProfileSection,
  setActiveProfileSection,
  handleClearDirectChat,
  handleLeaveRoom,
  handleDeleteGroup,
  chatMessages,
  setChatMessages,
  fetchRooms,
  showConfirm,

  // New mailbox props
  mailboxFolder,
  setMailboxFolder,
  mailboxSearch,
  setMailboxSearch,
  mailboxLabel,
  setMailboxLabel,
  labelsList,
  draftsList,
  updateMailboxState,
  snoozeMail,
  saveLabel,
  pollEmails
}) => {
  const canComposeMail = currentMenu === 'inbox' || currentMenu === 'sent' || currentMenu === 'contacts' || currentMenu === 'smtp_inbox' || currentMenu === 'starred' || currentMenu === 'important' || currentMenu === 'archive' || currentMenu === 'trash' || currentMenu === 'spam' || currentMenu === 'snoozed';
  const handleStartCompose = () => {
    setIsComposing(true);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeReplyTo(null);
    setSelectedMail(null);
  };

  const [selectedMailIds, setSelectedMailIds] = React.useState([]);

  // Reset bulk selection on folder or search changes
  React.useEffect(() => {
    setSelectedMailIds([]);
  }, [currentMenu, mailboxSearch, mailboxLabel]);

  const handleToggleSelect = (e, mailId) => {
    e.stopPropagation();
    if (selectedMailIds.includes(mailId)) {
      setSelectedMailIds(selectedMailIds.filter(id => id !== mailId));
    } else {
      setSelectedMailIds([...selectedMailIds, mailId]);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedMailIds.length === 0 || !activeIdentity?.ID) return;
    const selectedMails = activeMailsList.filter(m => selectedMailIds.includes(m.id));
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

  const [channelSearch, setChannelSearch] = React.useState('');

  const togglePinChat = (id) => {
    const next = pinnedChatIds.includes(id)
      ? pinnedChatIds.filter(x => x !== id)
      : [...pinnedChatIds, id];
    persistPinned(next);
  };

  const hasMessages = (contact) => {
    if (!activeIdentity || !chatMessages) return false;
    const contactGaia = parseToGaiaID(contact.gaiaID);
    const ownGaia = parseToGaiaID(activeIdentity.GaiaID);
    return chatMessages.some(msg => {
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
    const nextHidden = hiddenChatIds.filter(id => {
      const contact = contacts.find(c => c.ID === id);
      if (!contact) return true;
      const contactGaia = parseToGaiaID(contact.gaiaID);
      const hasUnreadIncoming = chatMessages.some(msg => 
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
  }, [chatMessages, activeIdentity, contacts, hiddenChatIds, parseToGaiaID]);

  const [contextMenu, setContextMenu] = React.useState(null);

  React.useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      type,
      target: item
    });
  };

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

  return (
    <section className="mail-list-pane">
      <div className="pane-header">
        <div className="mobile-pane-actions">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menü öffnen"
          >
            {t('menu') || 'Menu'}
          </button>
          {canComposeMail && (
            <button
              type="button"
              className="btn-primary mobile-compose-btn"
              onClick={handleStartCompose}
            >
              {t('mail_compose') || 'Schreiben'}
            </button>
          )}
        </div>
        <div className="pane-title-row">
          <h2>
            {currentMenu === 'inbox' && t('posteingang')}
            {currentMenu === 'smtp_inbox' && (t('smtp_inbox_title') || 'SMTP Empfang')}
            {currentMenu === 'sent' && (t('gesendet') || 'Gesendete Mails')}
            {currentMenu === 'contacts' && t('adressbuch')}
            {currentMenu === 'chat' && (t('quanten_chat') || 'Quanten-Chats')}
            {currentMenu === 'groups' && t('gruppen_chats')}
            {currentMenu === 'public_channels' && 'Channels'}
            {currentMenu === 'network_health' && 'Network Health'}
            {currentMenu === 'profile' && (t('mein_profil') || 'Dein Profil')}
            {currentMenu === 'gaiadrop' && (t('drop_title') || 'GaiaDrop Inbox')}
          </h2>
          <div className="pane-title-actions">
            {canComposeMail && (
              <button
                type="button"
                className="btn-primary desktop-compose-btn"
                onClick={handleStartCompose}
              >
                <Icons.Plus /> {t('mail_compose') || 'Schreiben'}
              </button>
            )}
            <button 
              className="btn-action collapse-toggle-btn" 
              style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setMailListCollapsed(true)}
              title="Liste einklappen"
            >
              &lt;
            </button>
          </div>
        </div>
      </div>

      {(() => {
        const emailMenus = ['inbox', 'smtp_inbox', 'sent', 'smtp_sent', 'archive', 'smtp_archive', 'spam', 'smtp_spam', 'trash', 'smtp_trash', 'starred', 'smtp_starred', 'important', 'smtp_important', 'snoozed', 'smtp_snoozed', 'drafts', 'smtp_drafts'];
        const isEmailMenu = emailMenus.includes(currentMenu);
        if (!isEmailMenu) return null;

        return (
          <>
            {/* Search bar */}
            <div className="mail-search-bar" style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="input-field"
                placeholder={t('search_placeholder') || 'Mails nach Betreff, Sender, Text suchen...'}
                value={mailboxSearch}
                onChange={(e) => setMailboxSearch(e.target.value)}
                style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px', boxSizing: 'border-box' }}
              />
              {mailboxSearch && (
                <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => setMailboxSearch('')}>
                  X
                </button>
              )}
            </div>

            {/* Folder & Label Pills */}
            <div className="mail-folders-row">
              {[
                { key: 'inbox', label: 'Eingang', icon: '📥' },
                { key: 'smtp_inbox', label: 'SMTP', icon: '📧' },
                { key: 'sent', label: 'Ausgang', icon: '📤' },
                { key: 'starred', label: 'Markiert', icon: '★' },
                { key: 'important', label: 'Wichtig', icon: '🏷️' },
                { key: 'snoozed', label: 'Snoozed', icon: '⏱' },
                { key: 'archive', label: 'Archiv', icon: '📁' },
                { key: 'spam', label: 'Spam', icon: '⚠️' },
                { key: 'trash', label: 'Trash', icon: '🗑️' }
              ].map(f => {
                const isActive = currentMenu === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    className={`btn-action mail-folder-pill ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentMenu(f.key);
                      setSelectedMail(null);
                    }}
                  >
                    {f.icon} {f.label}
                  </button>
                );
              })}

              {/* Custom Labels List */}
              {labelsList && labelsList.map(lbl => {
                const isActive = mailboxLabel === lbl.name;
                return (
                  <button
                    key={lbl.id || lbl.name}
                    type="button"
                    className={`btn-action mail-folder-pill mail-label-pill ${isActive ? 'active' : ''}`}
                    style={{ '--mail-label-color': lbl.color || 'var(--text-secondary)' }}
                    onClick={() => {
                      setMailboxLabel(isActive ? '' : lbl.name);
                    }}
                  >
                    🏷️ {lbl.name}
                  </button>
                );
              })}
            </div>

            {/* Bulk actions bar if items are selected */}
            {selectedMailIds.length > 0 && (
              <div className="bulk-actions-bar" style={{ padding: '8px 16px', background: 'rgba(0,242,254,0.08)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{selectedMailIds.length} ausgewählt</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => handleBulkAction('read')}>Gelesen</button>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => handleBulkAction('unread')}>Ungelesen</button>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => handleBulkAction('archive')}>Archiv</button>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => handleBulkAction('star')}>★ Markieren</button>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => handleBulkAction('unstar')}>☆ Entfernen</button>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', color: 'var(--danger)' }} onClick={() => handleBulkAction('delete')}>Löschen</button>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => setSelectedMailIds([])}>Abbrechen</button>
              </div>
            )}
          </>
        );
      })()}

      {currentMenu === 'groups' && (
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.03)', display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn-primary" 
            style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem', cursor: 'pointer' }}
            onClick={() => setShowCreateGroupModal(true)}
          >
            {t('gruppe_erstellen') || '+ Neue Gruppe'}
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem', cursor: 'pointer' }}
            onClick={() => setShowJoinGroupModal(true)}
          >
            {t('gruppe_beitreten') || 'Gruppe beitreten'}
          </button>
        </div>
      )}

      {currentMenu === 'gaiadrop' && (
        <div className="gaiadrop-list-tools">
          <div className="gaiadrop-address-card">
            <span>{t('drop_own_address') || 'Deine GaiaDrop-Adresse'}</span>
            <code>{activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : 'deine_adresse'}</code>
          </div>
          <div className="gaiadrop-list-actions">
            <button
              type="button"
              className="btn-action"
              onClick={loadGaiaDropInbox}
              disabled={gaiaDropLoading}
            >
              {gaiaDropLoading ? (t('drop_btn_decrypting') || 'Laden...') : (t('drop_btn_load') || 'Inbox laden')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (!activeIdentity) return;
                navigator.clipboard.writeText(displayGaiaID(activeIdentity.GaiaID));
                triggerAlert(t('kopiert') || 'Kopiert', t('drop_address_copied') || 'GaiaDrop-Adresse kopiert.');
              }}
              disabled={!activeIdentity}
            >
              {t('copy') || 'Kopieren'}
            </button>
          </div>
        </div>
      )}

      {currentMenu === 'public_channels' && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ minHeight: '34px', padding: '0 12px', fontSize: '0.72rem', fontWeight: 800 }}
            onClick={() => {
              setActivePublicChannel(null);
              if (setPublicChannelCreatorOpen) setPublicChannelCreatorOpen(true);
              setMobileMenuOpen(false);
            }}
          >
            New Channel
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '34px', padding: '0 12px', fontSize: '0.72rem', fontWeight: 800 }}
            onClick={refreshPublicChannels}
            disabled={publicChannelsLoading}
          >
            Refresh
          </button>
        </div>
      )}

      {currentMenu === 'public_channels' && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
          <input
            type="text"
            className="input-field"
            placeholder={t('search_channels') || 'Kanäle suchen...'}
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem', padding: '6px 12px', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Search input for starting a chat with a new contact */}
      {currentMenu === 'chat' && (
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.03)' }}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const inputVal = e.target.elements.newChatGaiaId.value.trim();
            if (!inputVal) return;
            const gaiaId = parseToGaiaID(inputVal);
            try {
              const res = await api.getPublicIdentity(gaiaId);
              if (res && res.publicRecord) {
                const pubRecord = safeJsonParse(res.publicRecord, null);
                if (!pubRecord?.public_keys?.identity) {
                  throw new Error('Kontakt besitzt keinen gueltigen Schluesselsatz.');
                }
                const newContact = {
                  ID: res.id,
                  gaiaID: res.gaiaID,
                  displayName: res.displayName,
                  publicKey: pubRecord.public_keys.identity,
                  abuseScore: res.trustPassport?.abuseScore || res.abuseScore || { score: 0, escalationLevel: 0 },
                  trustPassport: res.trustPassport,
                  keyHistory: res.trustPassport?.keyHistory || buildInitialKeyHistory(pubRecord.public_keys.identity, true),
                  keyConfirmedAt: new Date().toISOString()
                };
                
                const exists = contacts.find(c => c.gaiaID === res.gaiaID);
                let nextActiveContact = newContact;
                if (!exists) {
                  const persisted = await api.saveMailContact({
                    id: newContact.id || newContact.ID,
                    gaiaId: newContact.gaiaID,
                    displayName: newContact.displayName,
                    publicKey: newContact.publicKey || '',
                    blocked: !!newContact.blocked
                  });
                  const mergedContact = {
                    ...newContact,
                    ...persisted,
                    gaiaID: persisted?.gaiaId || persisted?.gaiaID || newContact.gaiaID
                  };
                  const updated = [...contacts, mergedContact];
                  setContacts(updated);
                  localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
                  nextActiveContact = mergedContact;
                }
                
                setActiveChatContact(nextActiveContact);
                e.target.reset();
              } else {
                triggerAlert('Nicht gefunden', 'Diese Gaia-Adresse konnte nicht im föderierten Netz gefunden werden.', 'danger');
              }
            } catch (err) {
              triggerAlert('Fehler', err.message, 'danger');
            }
          }}>
            <input 
              name="newChatGaiaId" 
              type="text" 
              placeholder={t('suchen') || 'Neue Gaia-Adresse suchen...'} 
              className="input-field" 
              style={{ padding: '8px 12px', fontSize: '0.8rem', width: '100%' }}
            />
          </form>
        </div>
      )}

      <div className="list-scroll gaia-scrollbar">
        {currentMenu === 'contacts' ? (
          contacts.map(c => (
            <div 
              key={c.ID} 
              className="mail-card"
              onClick={() => {
                setIsComposing(true);
                setComposeTo(displayGaiaID(c.gaiaID));
                setComposeSubject('');
                setComposeBody('');
                setComposeReplyTo(null);
                setSelectedMail(null);
              }}
            >
              <div className="mail-card-header">
                <div className="mail-sender">{c.displayName}</div>
                <button
                  type="button"
                  className="btn-action"
                  onClick={event => {
                    event.stopPropagation();
                    openContactProfile(c.gaiaID);
                  }}
                >
                  {t('profil') || 'Profil'}
                </button>
                {c.abuseScore && c.abuseScore.score > 0 && (
                  <span className="abuse-badge" style={{ color: 'var(--warning)' }}>Score: {c.abuseScore.score}</span>
                )}
              </div>
              <div className="mail-subject" style={{ color: 'var(--text-secondary)' }}>{displayGaiaID(c.gaiaID)}</div>
              <div className="mail-preview">{t('click_to_write_mail') || 'Klicken zum Schreiben einer Mail'}</div>
            </div>
          ))
        ) : currentMenu === 'chat' ? (
          (() => {
            const displayed = contacts.filter(c => 
              pinnedChatIds.includes(c.ID) || 
              (activeChatContact && activeChatContact.ID === c.ID) || 
              (hasMessages(c) && !hiddenChatIds.includes(c.ID))
            ).sort((a, b) => {
              const aPinned = pinnedChatIds.includes(a.ID) ? 1 : 0;
              const bPinned = pinnedChatIds.includes(b.ID) ? 1 : 0;
              return bPinned - aPinned;
            });
            if (displayed.length === 0) {
              return (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {t('no_active_chats') || 'Keine aktiven Chats. Suche oben nach Kontakten, um einen Chat zu starten.'}
                </div>
              );
            }
            return displayed.map(c => {
              const isActive = activeChatContact && (activeChatContact.gaiaID === c.gaiaID || (activeChatContact.ID && activeChatContact.ID === c.ID) || (activeChatContact.id && activeChatContact.id === c.id));
              const unreadCount = getUnreadChatCount(c);
              const isPinned = pinnedChatIds.includes(c.ID) || pinnedChatIds.includes(c.id) || pinnedChatIds.includes(c.gaiaID);
              return (
                <div 
                  key={c.ID || c.id || c.gaiaID} 
                  className={`mail-card ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''}`}
                  onClick={() => {
                    setActiveChatContact(c);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, c, 'chat')}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mail-sender" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {c.displayName}
                      {isPinned && <span className="pin-indicator" title={t('pinned') || 'Angepinnt'} style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>📌</span>}
                    </div>
                    <div className="mail-subject" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{displayGaiaID(c.gaiaID)}</div>
                    <div className="mail-preview" style={{ marginTop: '4px' }}>{t('e2e_chat_room_open') || 'E2E Chat-Raum öffnen'}</div>
                  </div>
                  {unreadCount > 0 && (
                    <span className="card-unread-badge">{formatBadgeCount(unreadCount)}</span>
                  )}
                </div>
              );
            });
          })()
        ) : currentMenu === 'groups' ? (
          (() => {
            const displayed = rooms.filter(r => 
              pinnedChatIds.includes(r.ID) || 
              (activeRoom && activeRoom.ID === r.ID) || 
              (getUnreadRoomCount(r) > 0) ||
              !hiddenChatIds.includes(r.ID)
            ).sort((a, b) => {
              const aPinned = pinnedChatIds.includes(a.ID) ? 1 : 0;
              const bPinned = pinnedChatIds.includes(b.ID) ? 1 : 0;
              return bPinned - aPinned;
            });
            if (displayed.length === 0) {
              return (
                <div className="empty-action-card">
                  <strong>{t('groups_empty_title') || 'Noch keine Gruppen-Chats'}</strong>
                  <span>{t('groups_empty_desc') || 'Erstelle einen sicheren Arbeitsraum fuer Projekt-, Krisen- oder Teamkommunikation.'}</span>
                  <div>
                    <button type="button" className="btn-primary" onClick={() => setShowCreateGroupModal(true)}>
                      {t('gruppe_erstellen') || '+ Neue Gruppe'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowJoinGroupModal(true)}>
                      {t('gruppe_beitreten') || 'Gruppe beitreten'}
                    </button>
                  </div>
                </div>
              );
            }
            return displayed.map(r => {
              const isActive = activeRoom && activeRoom.ID === r.ID;
              const unreadCount = getUnreadRoomCount(r);
              const isPinned = pinnedChatIds.includes(r.ID);
              return (
                <div 
                  key={r.ID} 
                  className={`mail-card ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''}`}
                  onClick={() => {
                    setActiveRoom(r);
                    setSelectedMail(null);
                    setIsComposing(false);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, r, 'groups')}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mail-card-header" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{r.Avatar || 'G'}</span>
                        <span className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {r.Name}
                          {isPinned && <span className="pin-indicator" title={t('pinned') || 'Angepinnt'} style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>📌</span>}
                        </span>
                      </div>
                    </div>
                    <div className="mail-subject" style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.8rem' }}>
                      {r.Description || t('no_description') || 'Keine Beschreibung'}
                    </div>
                    <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                      {r.Members ? `${r.Members.length} ${t('mitglieder') || 'Mitglieder'}` : `0 ${t('mitglieder') || 'Mitglieder'}`}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <span className="card-unread-badge">{formatBadgeCount(unreadCount)}</span>
                  )}
                </div>
              );
            });
          })()
        ) : currentMenu === 'network_health' ? (
          <div className="empty-action-card">
            <strong>Signed public status</strong>
            <span>Anonymous aggregate metrics, cryptographic transparency, and the node-signed status file.</span>
            <div>
              <button type="button" className="btn-secondary" onClick={() => setMobileMenuOpen(false)}>
                Open Dashboard
              </button>
            </div>
          </div>
        ) : currentMenu === 'public_channels' ? (
          publicChannelsLoading ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Loading channels...
            </div>
          ) : publicChannels.length === 0 ? (
            <div className="empty-action-card">
              <strong>No public channels yet</strong>
              <span>Create the first GaiaCom public channel for signed announcements, release notes, or community updates.</span>
              <div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setActivePublicChannel(null);
                    if (setPublicChannelCreatorOpen) setPublicChannelCreatorOpen(true);
                    setMobileMenuOpen(false);
                  }}
                >
                  Create Channel
                </button>
              </div>
            </div>
          ) : (() => {
            const filtered = publicChannels.filter(channel => {
              if (!channelSearch) return true;
              const query = channelSearch.toLowerCase();
              return (
                (channel.name && channel.name.toLowerCase().includes(query)) ||
                (channel.description && channel.description.toLowerCase().includes(query))
              );
            });
            if (filtered.length === 0) {
              return (
                <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Keine Kanäle gefunden.
                </div>
              );
            }
            return filtered.map(channel => (
              <div
                key={channel.id}
                className={`mail-card ${activePublicChannel?.id === channel.id ? 'active' : ''}`}
                onClick={() => {
                  setActivePublicChannel(channel);
                  if (setPublicChannelCreatorOpen) setPublicChannelCreatorOpen(false);
                  setMobileMenuOpen(false);
                }}
              >
                <div className="mail-card-header">
                  <div className="mail-sender">{channel.name}</div>
                  {channel.isAdmin && <span className="abuse-badge" style={{ color: 'var(--accent-cyan)' }}>Admin</span>}
                </div>
                <div className="mail-subject">{channel.isSubscribed ? 'Subscribed' : 'Public'}</div>
                <div className="mail-preview">{channel.description || `${channel.subscriberCount || 0} subscribers`}</div>
              </div>
            ));
          })()
        ) : currentMenu === 'profile' ? (
          <div className="settings-menu-list" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div 
              className={`mail-card ${activeProfileSection === 'edit' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('edit');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>👤</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('edit_profile') || 'Profil bearbeiten'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('edit_profile_desc') || 'Anzeigename, Biografie und Avatar anpassen.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'mailbox_settings' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('mailbox_settings');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>📬</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('mailbox_settings_title') || 'Mailbox-Einstellungen'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('mailbox_settings_desc') || 'Signatur, Sprache, Mail-Filter regeln.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'password' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('password');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>🔒</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('change_password_title') || 'Passwort ändern'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('change_password_menu_desc') || 'GaiaCOM Login-Passwort aktualisieren.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'devices' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('devices');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>💻</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('device_sessions_title') || 'Angemeldete Geräte'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('device_sessions_menu_desc') || 'Aktive Sitzungen verwalten und beenden.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'keys' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('keys');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>🔑</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('kryptographische_schluessel') || 'Kryptographische Schlüssel'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('kryptographische_schluessel_desc') || 'Private Schlüssel und Backup Seed Phrase anzeigen.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'security' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('security');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>⏱</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('crypto_lock_title') || 'Kryptografische Sperre'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('crypto_lock_menu_desc') || 'Reload- und Inaktivitäts-Timer steuern.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'privacy' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('privacy');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>NHD</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Privacy
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Anonymous statistics opt-in for Network Health.
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'legal' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('legal');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>§</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('privacy_imprint_title') || 'Datenschutz & Impressum'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('privacy_imprint_menu_desc') || 'DSGVO, Datenschutz und Impressum anzeigen.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card danger-menu-card ${activeProfileSection === 'danger' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('danger');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>!</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('delete_account_title') || 'Account löschen'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('delete_account_menu_desc') || 'Konto und zuordenbare Daten vernichten.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentMenu === 'vault' ? (
          !driveUnlocked ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '0.85rem' }}>
              {t('vault_locked_pane_notice') || 'Drive ist gesperrt. Bitte rechts entsperren.'}
            </div>
          ) : driveRecords.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '0.85rem' }}>
              {t('vault_empty') || 'Keine Einträge gespeichert.'}
            </div>
          ) : (
            driveRecords.map(rec => (
              <div 
                key={rec.id} 
                className={`mail-card ${selectedDriveRecord?.id === rec.id ? 'active' : ''}`}
                onClick={() => setSelectedDriveRecord(rec)}
                style={{ padding: '12px 24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{rec.type === 'file' ? '📄 DATEI' : (rec.category || 'NOTE').toUpperCase()}</span>
                  <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{rec.title}</div>
                <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                  {rec.type === 'file'
                    ? `${rec.mimeType || 'Datei'} · ${rec.sizeBytes ? (rec.sizeBytes / 1024).toFixed(1) + ' KB' : '—'}${rec.cloudFileId ? ' · ☁️' : ''}`
                    : (rec.body && rec.body.length > 60 ? rec.body.substring(0, 60) + '...' : rec.body)}
                </div>
              </div>
            ))
          )
        ) : currentMenu === 'gaiadrop' ? (
          gaiaDropInbox.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '0.85rem' }}>
              {t('drop_empty') || 'Keine Drops geladen.'}
            </div>
          ) : (
            gaiaDropInbox.map(drop => (
              <div 
                key={drop.id} 
                className={`mail-card ${selectedDrop?.id === drop.id ? 'active' : ''} ${drop.status === 'new' ? 'unread' : ''}`}
                onClick={() => setSelectedDrop(drop)}
                style={{ padding: '12px 24px', borderLeft: drop.status === 'new' ? '3px solid var(--warning)' : 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--warning)', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{t('drop_proof') || 'DROP PROOF'}</span>
                  <span>{drop.created_at ? new Date(drop.created_at).toLocaleDateString() : 'Unbekannt'}</span>
                </div>
                <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {drop.sender_label || t('anonymous_sender') || 'Anonymer Absender'}
                </div>
                <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                  {(() => {
                    const rawText = drop.decrypted ? (typeof drop.decrypted === 'string' ? drop.decrypted : drop.decrypted.body) : (drop.decryptError || 'Entschlüsselung ausstehend...');
                    return rawText && rawText.length > 60 ? rawText.substring(0, 60) + '...' : rawText;
                  })()}
                </div>
              </div>
            ))
          )
        ) : (
          activeMailsList.map(mail => {
            const isActive = selectedMail && selectedMail.id === mail.id;
            const isUnread = !mail.isRead;
            const isChecked = selectedMailIds.includes(mail.id);
            const isStarred = mail.isStarred;
            const isImportant = mail.isImportant;

            return (
              <div 
                key={mail.id} 
                className={`mail-card ${isActive ? 'active' : ''} ${mail.untrusted ? 'untrusted' : ''} ${isUnread ? 'unread' : ''} ${mail.isSmtp ? 'smtp-legacy-card' : 'native-gaiacom-card'}`}
                onClick={() => {
                  if (mail.isDraft) {
                    setIsComposing(true);
                    setComposeTo(mail.recipient || '');
                    setComposeSubject(mail.subject || '');
                    setComposeBody(mail.body || '');
                    setComposeReplyTo(mail.messages?.[0]?.replyTo || null);
                    if (setIsSmtpMode) {
                      setIsSmtpMode(!!mail.isSmtp);
                    }
                    setSelectedMail(null);
                    if (activeDraftIdRef) {
                      activeDraftIdRef.current = mail.id;
                    }
                  } else {
                    setSelectedMail(mail);
                    setIsComposing(false);
                  }
                }}
                style={{
                  position: 'relative',
                  paddingLeft: '44px',
                  borderLeft: isUnread 
                    ? (mail.isSmtp ? '3px solid var(--warning)' : '3px solid var(--accent-cyan)')
                    : (mail.isSmtp ? '3px dashed rgba(241, 196, 15, 0.3)' : '1px solid rgba(255,255,255,0.05)'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                {/* Checkbox for Bulk Actions */}
                <div 
                  onClick={(e) => handleToggleSelect(e, mail.id)}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '16px',
                    width: '18px',
                    height: '18px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    background: isChecked ? 'var(--accent-cyan)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                >
                  {isChecked && <span style={{ color: '#000000', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                </div>

                <div className="mail-card-header">
                  <div className="mail-sender" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: isUnread ? 800 : 500 }}>
                    {mail.senderGaia || displayGaiaID(mail.sender)}
                    {mail.messages && mail.messages.length > 1 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', background: 'rgba(0,242,254,0.1)', padding: '1px 6px', borderRadius: '10px' }}>
                        {mail.messages.length}
                      </span>
                    )}
                    {isUnread && <span className="card-unread-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />}
                  </div>
                  <div className="mail-time" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Star toggle */}
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isStarred ? 'var(--warning, #ffcc00)' : 'var(--text-muted)',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMailboxState(mail.latestMessage || mail, { isStarred: !isStarred });
                      }}
                    >
                      {isStarred ? '★' : '☆'}
                    </button>

                    {/* Important toggle */}
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isImportant ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMailboxState(mail.latestMessage || mail, { isImportant: !isImportant });
                      }}
                      title="Wichtig markieren"
                    >
                      🏷️
                    </button>
                    <span>{new Date(mail.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mail-subject" style={{ fontWeight: isUnread ? 800 : 500, color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {mail.subject}
                </div>

                <div className="mail-preview">
                  {(() => {
                    const latest = mail.latestMessage || mail;
                    return latest.body && latest.body.length > 70 ? latest.body.substring(0, 70) + '...' : latest.body;
                  })()}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {/* Encryption / Connection badge */}
                  {mail.isSmtp ? (
                    <span style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--danger)', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                      ⚠️ Legacy SMTP
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(46,204,113,0.1)', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      🛡️ GaiaSecure
                    </span>
                  )}
                  {mail.untrusted && !mail.isSmtp && (
                    <span style={{ background: 'rgba(230,126,34,0.1)', color: 'var(--warning)', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                      Spam-Verdacht
                    </span>
                  )}
                  {/* Labels on the card */}
                  {(() => {
                    const currentBox = (mail.latestMessage || mail).mailbox || {};
                    const labels = parseMailboxLabels(currentBox.labels);
                    return labels.map(lbl => (
                      <span key={lbl} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {lbl}
                      </span>
                    ));
                  })()}
                </div>
              </div>
            );
          })
        )}

        {currentMenu !== 'contacts' && currentMenu !== 'chat' && currentMenu !== 'profile' && currentMenu !== 'groups' && currentMenu !== 'vault' && currentMenu !== 'gaiadrop' && activeMailsList.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '0.85rem' }}>
            {t('keine_mails') || 'Keine Mails vorhanden.'}
          </div>
        )}
      </div>
      {contextMenu && (
        <div 
          className="custom-context-menu" 
          style={{
            position: 'fixed',
            top: `${contextMenu.mouseY}px`,
            left: `${contextMenu.mouseX}px`,
            zIndex: 1000,
            background: 'var(--card-bg, #1a1a1c)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            padding: '4px 0',
            minWidth: '140px'
          }}
        >
          <button 
            type="button"
            className="context-menu-item"
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => {
              togglePinChat(contextMenu.target.ID);
              setContextMenu(null);
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            {pinnedChatIds.includes(contextMenu.target.ID) 
              ? (t('entpinnen') || 'Entpinnen') 
              : (t('anpinnen') || 'Anpinnen')}
          </button>
          <button 
            type="button"
            className="context-menu-item"
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: 'var(--warning, #ff3b30)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => {
              if (contextMenu.type === 'chat') {
                handleDeleteDM(contextMenu.target);
              } else {
                handleDeleteGroupRoom(contextMenu.target);
              }
              setContextMenu(null);
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            {contextMenu.type === 'chat' 
              ? (t('chat_loeschen') || 'Chat löschen') 
              : (contextMenu.target.CreatedBy === activeIdentity?.ID || contextMenu.target.CreatedBy === user?.id
                  ? (t('gruppe_loeschen') || 'Gruppe löschen')
                  : (t('gruppe_verlassen') || 'Gruppe verlassen'))}
          </button>
        </div>
      )}
    </section>
  );
};

export default ListPane;
