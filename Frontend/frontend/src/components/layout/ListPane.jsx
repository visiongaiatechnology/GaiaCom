import React from 'react';
import ListPaneHeader from './list/ListPaneHeader';
import MailboxToolbar from './list/MailboxToolbar';
import EmptyState from './list/EmptyState';
import MailRow from './list/MailRow';
import ConversationRow from './list/ConversationRow';
import ContactRow from './list/ContactRow';
import ChannelRow from './list/ChannelRow';
import { VaultRow, DropRow } from './list/RecordRows';
import ProfileSettingsNav from './list/ProfileSettingsNav';
import ContextMenu from './list/ContextMenu';
import { ChatStartToolbar, GroupActions, ChannelsToolbar, DropToolbar } from './list/ListToolbars';
import { COMPOSE_MENUS, isEmailMenu, resolveListScope, resolveListTitle } from './list/menuConfig';
import { selectVisibleChats, selectVisibleChannels, selectVisibleRooms } from './list/selectors';
import usePinnedChats from './list/usePinnedChats';
import useMailSelection from './list/useMailSelection';
import useConversationMenu from './list/useConversationMenu';
import createInboxActions from './list/useInboxActions';

/**
 * VGT GLASS 2100 — list rail (second column) orchestrator.
 *
 * Owns the pane composition and wires the same props/state/handlers as before.
 * Presentation lives in ./list/** and the stateful helpers in ./list/use*.js so
 * this file stays a thin, readable orchestrator.
 */
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
  const canComposeMail = COMPOSE_MENUS.includes(currentMenu);
  const [channelSearch, setChannelSearch] = React.useState('');

  const { pinnedChatIds, hiddenChatIds, persistPinned, persistHidden, togglePinChat, hasMessages } = usePinnedChats({
    activeIdentity,
    chatMessages,
    contacts,
    parseToGaiaID
  });

  const { selectedMailIds, handleToggleSelect, handleBulkAction, clearSelection } = useMailSelection({
    activeIdentity,
    activeMailsList,
    pollEmails,
    triggerAlert,
    currentMenu,
    mailboxSearch,
    mailboxLabel
  });

  const {
    contextMenu,
    handleContextMenu,
    handleDelete,
    handleTogglePin,
    closeContextMenu,
    pinLabel,
    deleteLabel
  } = useConversationMenu({
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
  });

  const actions = createInboxActions({
    setIsComposing,
    setComposeTo,
    setComposeSubject,
    setComposeBody,
    setComposeReplyTo,
    setSelectedMail,
    setIsSmtpMode,
    activeDraftIdRef,
    displayGaiaID,
    setActiveChatContact,
    setActiveRoom,
    setActivePublicChannel,
    setPublicChannelCreatorOpen,
    setMobileMenuOpen,
    setActiveProfileSection,
    setCurrentMenu,
    setMailboxLabel,
    activeIdentity,
    triggerAlert,
    t,
    parseToGaiaID,
    buildInitialKeyHistory,
    contacts,
    setContacts,
    user
  });

  const emailMenu = isEmailMenu(currentMenu);
  const title = resolveListTitle(currentMenu, t);
  const scope = resolveListScope(currentMenu, t);

  const visibleChats = currentMenu === 'chat'
    ? selectVisibleChats(contacts, { pinnedChatIds, activeChatContact, hiddenChatIds, hasMessages })
    : [];
  const visibleRooms = currentMenu === 'groups'
    ? selectVisibleRooms(rooms, { pinnedChatIds, activeRoom, hiddenChatIds, getUnreadRoomCount })
    : [];
  const visibleChannels = currentMenu === 'public_channels'
    ? selectVisibleChannels(publicChannels, channelSearch)
    : [];

  let listCount = null;
  if (emailMenu) listCount = activeMailsList.length;
  else if (currentMenu === 'contacts') listCount = contacts.length;
  else if (currentMenu === 'chat') listCount = visibleChats.length;
  else if (currentMenu === 'groups') listCount = visibleRooms.length;
  else if (currentMenu === 'public_channels') listCount = visibleChannels.length;
  else if (currentMenu === 'vault') listCount = driveUnlocked ? driveRecords.length : null;
  else if (currentMenu === 'gaiadrop') listCount = gaiaDropInbox.length;

  return (
    <section className="mail-list-pane vgt-inbox" aria-labelledby="vgt-inbox-title">
      <ListPaneHeader
        t={t}
        title={title}
        scope={scope}
        count={listCount}
        canComposeMail={canComposeMail}
        onStartCompose={actions.handleStartCompose}
        onOpenMenu={() => setMobileMenuOpen(true)}
        onCollapse={() => setMailListCollapsed(true)}
        titleLevel={emailMenu ? 'h1' : 'h2'}
      />

      {emailMenu ? (
        <MailboxToolbar
          t={t}
          currentMenu={currentMenu}
          mailboxSearch={mailboxSearch}
          setMailboxSearch={setMailboxSearch}
          onFolderChange={actions.handleFolderChange}
          labelsList={labelsList}
          mailboxLabel={mailboxLabel}
          onLabelToggle={actions.handleLabelToggle}
          selectedMailIds={selectedMailIds}
          onBulkAction={handleBulkAction}
          onClearSelection={clearSelection}
        />
      ) : null}

      {currentMenu === 'chat' ? (
        <ChatStartToolbar t={t} onSubmit={actions.handleNewChatSubmit} />
      ) : null}

      {currentMenu === 'groups' ? (
        <GroupActions
          t={t}
          onCreate={() => setShowCreateGroupModal(true)}
          onJoin={() => setShowJoinGroupModal(true)}
        />
      ) : null}

      {currentMenu === 'public_channels' ? (
        <ChannelsToolbar
          t={t}
          onCreate={actions.handleOpenChannelCreator}
          onRefresh={refreshPublicChannels}
          refreshing={publicChannelsLoading}
          channelSearch={channelSearch}
          onSearchChange={setChannelSearch}
        />
      ) : null}

      {currentMenu === 'gaiadrop' ? (
        <DropToolbar
          t={t}
          activeIdentity={activeIdentity}
          displayGaiaID={displayGaiaID}
          onLoad={loadGaiaDropInbox}
          loading={gaiaDropLoading}
          onCopy={actions.handleCopyDropAddress}
        />
      ) : null}

      <div className="list-scroll gaia-scrollbar vgt-inbox__scroll">
        {currentMenu === 'contacts' ? (
          contacts.length === 0 ? (
            <EmptyState
              icon="users"
              title="Noch keine Kontakte"
              description="Dein Adressbuch ist leer. Suche im Chat nach einer Gaia-Adresse, um einen Kontakt hinzuzufügen."
              actions={[{ label: 'Zu den Chats', variant: 'secondary', icon: 'chat', onClick: () => setCurrentMenu('chat') }]}
            />
          ) : (
            <ul className="vgt-inbox__list">
              {contacts.map(c => (
                <ContactRow
                  key={c.ID}
                  contact={c}
                  t={t}
                  displayGaiaID={displayGaiaID}
                  onCompose={() => actions.handleOpenContact(c)}
                  onOpenProfile={() => openContactProfile(c.gaiaID)}
                />
              ))}
            </ul>
          )
        ) : currentMenu === 'chat' ? (
          visibleChats.length === 0 ? (
            <EmptyState
              icon="chat"
              title="Keine aktiven Chats"
              description={t('no_active_chats') || 'Suche oben nach Kontakten, um einen Chat zu starten.'}
            />
          ) : (
            <ul className="vgt-inbox__list">
              {visibleChats.map(c => (
                <ConversationRow
                  key={c.ID || c.id || c.gaiaID}
                  kind="chat"
                  item={c}
                  isActive={Boolean(activeChatContact && (activeChatContact.gaiaID === c.gaiaID || (activeChatContact.ID && activeChatContact.ID === c.ID) || (activeChatContact.id && activeChatContact.id === c.id)))}
                  unreadCount={getUnreadChatCount(c)}
                  isPinned={pinnedChatIds.includes(c.ID) || pinnedChatIds.includes(c.id) || pinnedChatIds.includes(c.gaiaID)}
                  onSelect={() => actions.handleOpenChat(c)}
                  onContextMenu={handleContextMenu}
                  t={t}
                  displayGaiaID={displayGaiaID}
                  formatBadgeCount={formatBadgeCount}
                />
              ))}
            </ul>
          )
        ) : currentMenu === 'groups' ? (
          visibleRooms.length === 0 ? (
            <EmptyState
              icon="users"
              title={t('groups_empty_title') || 'Noch keine Gruppen-Chats'}
              description={t('groups_empty_desc') || 'Erstelle einen sicheren Arbeitsraum fuer Projekt-, Krisen- oder Teamkommunikation.'}
              actions={[
                { label: t('gruppe_erstellen') || '+ Neue Gruppe', onClick: () => setShowCreateGroupModal(true) },
                { label: t('gruppe_beitreten') || 'Gruppe beitreten', variant: 'secondary', onClick: () => setShowJoinGroupModal(true) }
              ]}
            />
          ) : (
            <ul className="vgt-inbox__list">
              {visibleRooms.map(r => (
                <ConversationRow
                  key={r.ID}
                  kind="group"
                  item={r}
                  isActive={Boolean(activeRoom && activeRoom.ID === r.ID)}
                  unreadCount={getUnreadRoomCount(r)}
                  isPinned={pinnedChatIds.includes(r.ID)}
                  onSelect={() => actions.handleOpenRoom(r)}
                  onContextMenu={handleContextMenu}
                  t={t}
                  displayGaiaID={displayGaiaID}
                  formatBadgeCount={formatBadgeCount}
                />
              ))}
            </ul>
          )
        ) : currentMenu === 'network_health' ? (
          <EmptyState
            icon="activity"
            title="Signierter Netzwerkstatus"
            description="Anonyme aggregierte Kennzahlen, kryptografische Transparenz und die vom Knoten signierte Statusdatei."
            actions={[{ label: 'Dashboard öffnen', variant: 'secondary', onClick: () => setMobileMenuOpen(false) }]}
          />
        ) : currentMenu === 'public_channels' ? (
          publicChannelsLoading ? (
            <p className="vgt-inbox__status" role="status">Kanäle werden geladen …</p>
          ) : publicChannels.length === 0 ? (
            <EmptyState
              icon="megaphone"
              title="Noch keine öffentlichen Kanäle"
              description="Erstelle den ersten GaiaCom-Kanal für signierte Ankündigungen, Release Notes oder Community-Updates."
              actions={[{ label: 'Kanal erstellen', icon: 'plus', onClick: actions.handleOpenChannelCreator }]}
            />
          ) : visibleChannels.length === 0 ? (
            <EmptyState
              icon="search"
              title="Keine Kanäle gefunden"
              description="Passe den Suchbegriff an oder setze die Suche zurück."
              actions={[{ label: 'Suche zurücksetzen', variant: 'secondary', onClick: () => setChannelSearch('') }]}
            />
          ) : (
            <ul className="vgt-inbox__list">
              {visibleChannels.map(channel => (
                <ChannelRow
                  key={channel.id}
                  channel={channel}
                  isActive={activePublicChannel?.id === channel.id}
                  onSelect={() => actions.handleOpenChannel(channel)}
                  t={t}
                />
              ))}
            </ul>
          )
        ) : currentMenu === 'profile' ? (
          <ProfileSettingsNav
            t={t}
            activeProfileSection={activeProfileSection}
            onSelect={actions.handleOpenProfileSection}
          />
        ) : currentMenu === 'vault' ? (
          !driveUnlocked ? (
            <EmptyState
              icon="lock"
              title="Tresor ist gesperrt"
              description={t('vault_locked_pane_notice') || 'Bitte entsperre den Tresor im rechten Bereich.'}
            />
          ) : driveRecords.length === 0 ? (
            <EmptyState
              icon="drive"
              title="Noch keine Einträge"
              description={t('vault_empty') || 'Im Tresor sind keine Einträge gespeichert.'}
            />
          ) : (
            <ul className="vgt-inbox__list">
              {driveRecords.map(rec => (
                <VaultRow
                  key={rec.id}
                  record={rec}
                  isSelected={selectedDriveRecord?.id === rec.id}
                  onSelect={() => setSelectedDriveRecord(rec)}
                />
              ))}
            </ul>
          )
        ) : currentMenu === 'gaiadrop' ? (
          gaiaDropInbox.length === 0 ? (
            <EmptyState
              icon="seal"
              title="Keine Drops geladen"
              description={t('drop_empty') || 'Lade deine GaiaDrop-Inbox, um verschlüsselte Drops zu entschlüsseln.'}
              actions={[{
                label: gaiaDropLoading
                  ? (t('drop_btn_decrypting') || 'Laden...')
                  : (t('drop_btn_load') || 'Inbox laden'),
                icon: 'refresh',
                onClick: loadGaiaDropInbox,
                disabled: Boolean(gaiaDropLoading)
              }]}
            />
          ) : (
            <ul className="vgt-inbox__list">
              {gaiaDropInbox.map(drop => (
                <DropRow
                  key={drop.id}
                  drop={drop}
                  t={t}
                  isSelected={selectedDrop?.id === drop.id}
                  onSelect={() => setSelectedDrop(drop)}
                />
              ))}
            </ul>
          )
        ) : emailMenu ? (
          activeMailsList.length === 0 ? (
            <EmptyState
              icon="inbox"
              title={t('keine_mails') || 'Keine Mails vorhanden.'}
              description="Dieser Ordner enthält keine Nachrichten."
              actions={canComposeMail ? [{ label: t('mail_compose') || 'Schreiben', icon: 'plus', onClick: actions.handleStartCompose }] : []}
            />
          ) : (
            <ul className="vgt-inbox__list">
              {activeMailsList.map(mail => (
                <MailRow
                  key={mail.id}
                  mail={mail}
                  isActive={Boolean(selectedMail && selectedMail.id === mail.id)}
                  isChecked={selectedMailIds.includes(mail.id)}
                  isUnread={!mail.isRead}
                  isStarred={Boolean(mail.isStarred)}
                  isImportant={Boolean(mail.isImportant)}
                  onOpen={() => actions.handleOpenMail(mail)}
                  onToggleSelect={handleToggleSelect}
                  onToggleStar={() => updateMailboxState(mail.latestMessage || mail, { isStarred: !mail.isStarred })}
                  onToggleImportant={() => updateMailboxState(mail.latestMessage || mail, { isImportant: !mail.isImportant })}
                  t={t}
                />
              ))}
            </ul>
          )
        ) : null}
      </div>

      {contextMenu ? (
        <ContextMenu
          menu={contextMenu}
          toggleLabel={pinLabel}
          deleteLabel={deleteLabel}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
          onClose={closeContextMenu}
        />
      ) : null}
    </section>
  );
};

export default ListPane;
