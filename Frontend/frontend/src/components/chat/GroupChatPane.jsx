import React, { useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import { PinnedMessagesStrip, buildTimelineItems, messagePreview } from './MessageActions';
import ChatEmptyState from './shared/ChatEmptyState';
import { buildRoleBadges } from './shared/roleBadges';
import { deriveGroupSecurityState, buildTopSecretSuiteIndex } from './shared/securityState';
import useGroupChatSession from './group/useGroupChatSession';
import useGroupChatExports from './group/useGroupChatExports';
import GroupSidebar from './group/GroupSidebar';
import GroupChannelHeader from './group/GroupChannelHeader';
import GroupMessageList from './group/GroupMessageList';
import GroupComposer from './group/GroupComposer';
import GroupMembersPanel from './group/GroupMembersPanel';
import GroupChatModals from './group/GroupChatModals';
import { parseToGaiaID, displayGaiaID } from '../../utils/gaiaAddress';

/**
 * S14 — Group chat (rooms, channels, members).
 *
 * Thin orchestrator: room/channel derivations stay here because they decide what
 * every child renders; session, egress and moderation flows live in ./group.
 * Every callback that the legacy pane consumed is still consumed the same way.
 */
export const GroupChatPane = ({
  activeRoom,
  channels,
  activeChannel,
  setActiveChannel,
  chatMessages,
  activeIdentity,
  chatInputText,
  setChatInputText,
  handleSendGroupMessage,
  handleUpdateMemberRole,
  handleLeaveRoom,
  setShowCreateChannelModal,
  triggerAlert,
  t,
  openContactProfile,
  handleOpenGroupSettings,
  handleDeleteChatMessage,
  handleClearGroupChannel,
  setActiveRoom,
  setMobileMenuOpen,
  messageMeta = {},
  onToggleMessagePin,
  onToggleMessageSaved,
  onReactToMessage,
  unreadMarker,
  messageReplyTarget,
  setMessageReplyTarget,
  getSenderRoles,
  contacts,
  fetchRooms,
  slowModeCooldowns = {},
  pinnedMessageIds = [],
  handleKickMember,
  handleTransferOwnership,
  handleGetJoinRequests,
  handleModerateJoinRequest,
  handleGetModerationLogs,
  handleSearchPublicRooms,
  handleCreateRoomInviteLink,
  handleJoinViaInviteLink,
  handleCreateJoinRequest,
  joinRequests,
  moderationLogs,
  publicRoomsSearchResult,
  displayGaiaID: displayGaiaIDProp
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [kickConfirmMemberId, setKickConfirmMemberId] = useState(null);

  const composerInputRef = useRef(null);

  const members = activeRoom?.Members || [];
  const actor = members.find(member => member.IdentityID === activeIdentity?.ID);
  const isOwner = actor?.Role === 'owner';
  const isAdmin = actor?.Role === 'admin';
  const isPrivileged = isOwner || isAdmin;
  const isReadOnly = Boolean(activeRoom?.ReadOnly) && !isPrivileged;
  /* FE-02: no security/audit state is inferred from the free-text room
     description. The backend exposes no crisis/audit flag (`Backend` grep for
     "crisis" = 0), so the pane renders no crisis claim at all. */
  const isPrivateRoom = activeRoom ? activeRoom.IsPrivate !== false : true;

  const slowModeCooldown = slowModeCooldowns?.[activeRoom?.id || activeRoom?.ID] || 0;
  const isSlowModeActive = slowModeCooldown > 0;
  const isComposerDisabled = isReadOnly || isSlowModeActive;

  const actorIsAdmin = Boolean(activeRoom?.Members?.find(
    member => member.IdentityID === activeIdentity?.ID && member.Role === 'admin'
  ));
  const actorCanManage = Boolean(
    activeRoom &&
    activeIdentity &&
    (
      activeRoom.CreatorID === activeIdentity.ID ||
      activeRoom.CreatedBy === activeIdentity.ID ||
      actorIsAdmin
    )
  );

  const channelMessages = useMemo(() => {
    if (!activeChannel) return [];
    return chatMessages.filter(message => message.channelId === activeChannel.id);
  }, [activeChannel, chatMessages]);

  const filteredMessages = useMemo(() => {
    if (!localSearchQuery.trim()) return channelMessages;
    const query = localSearchQuery.toLowerCase();
    return channelMessages.filter(message =>
      message.body && message.body.toLowerCase().includes(query)
    );
  }, [channelMessages, localSearchQuery]);

  const timelineItems = useMemo(() => buildTimelineItems(filteredMessages), [filteredMessages]);
  const lastMessageId = filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1].id : '';

  /* M-15: the room security state is derived from the room flags and the last
     delivered channel envelope; the static "Verschlüsselung aktiv" claim is gone. */
  const securityState = useMemo(
    () => deriveGroupSecurityState({ room: activeRoom, messages: channelMessages }),
    [activeRoom, channelMessages]
  );

  const topSecretSuites = useMemo(
    () => buildTopSecretSuiteIndex(channelMessages),
    [channelMessages]
  );

  const session = useGroupChatSession({
    activeRoom,
    activeChannel,
    activeIdentity,
    chatInputText,
    lastMessageId,
    composerInputRef,
    setChatInputText
  });

  const exports = useGroupChatExports({
    activeRoom,
    activeChannel,
    activeIdentity,
    channelMessages,
    triggerAlert,
    t
  });

  const isOwnMessage = message => (
    (message.sender && activeIdentity?.ID && message.sender === activeIdentity.ID) ||
    (message.sender && activeIdentity?.GaiaID && parseToGaiaID(message.sender) === parseToGaiaID(activeIdentity.GaiaID)) ||
    (message.senderGaia && activeIdentity?.GaiaID && parseToGaiaID(message.senderGaia) === parseToGaiaID(activeIdentity.GaiaID))
  );

  const senderNameFor = message => {
    if (isOwnMessage(message)) {
      return activeIdentity?.DisplayName || activeIdentity?.displayName || t('you') || 'Du';
    }
    const senderMember = activeRoom?.Members?.find(member =>
      member.IdentityID === message.sender ||
      (member.Identity?.GaiaID && parseToGaiaID(member.Identity.GaiaID) === parseToGaiaID(message.sender)) ||
      (member.Identity?.GaiaID && parseToGaiaID(member.Identity.GaiaID) === parseToGaiaID(message.senderGaia))
    );
    return senderMember?.Identity?.DisplayName ||
      senderMember?.Username ||
      (message.senderGaia ? displayGaiaID(message.senderGaia) : '') ||
      (message.sender ? displayGaiaID(message.sender) : t('unknown_sender') || 'Unbekannt');
  };

  const memberNameForGaiaID = gaiaID => {
    const member = activeRoom?.Members?.find(entry =>
      entry.Identity?.GaiaID && parseToGaiaID(entry.Identity.GaiaID) === parseToGaiaID(gaiaID)
    );
    return member?.Identity?.DisplayName || member?.Username || displayGaiaID(gaiaID);
  };

  const roleBadgesFor = message => buildRoleBadges(
    getSenderRoles?.(message.senderGaia || message.sender),
    t,
    99
  );

  const replyToMessage = message => {
    setMessageReplyTarget({
      messageId: message.id,
      sender: message.sender,
      senderGaia: message.senderGaia,
      bodyPreview: messagePreview(message),
      createdAt: message.createdAt,
      channelId: message.channelId,
      roomId: message.roomId
    });
  };

  const localKickMember = memberId => {
    setKickConfirmMemberId(memberId);
  };

  const confirmKickMember = async () => {
    if (!activeRoom || !activeIdentity) return;
    const memberId = kickConfirmMemberId;
    if (!memberId) return;
    setKickConfirmMemberId(null);

    try {
      await handleKickMember(activeRoom.ID || activeRoom.id, memberId);
      triggerAlert('Mitglied entfernt', 'Das Mitglied wurde aus der Gruppe entfernt.');
      if (fetchRooms) {
        await fetchRooms();
      }
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  const copyInviteCode = secretHash => {
    if (!secretHash) return;
    navigator.clipboard.writeText(secretHash);
    triggerAlert(t('kopiert') || 'Kopiert', t('code_kopieren_success') || 'Der Einladungscode wurde kopiert.');
  };

  const filteredMembers = useMemo(() => {
    if (!activeRoom?.Members) return [];
    if (!memberSearchQuery.trim()) return activeRoom.Members;
    const query = memberSearchQuery.toLowerCase();
    return activeRoom.Members.filter(member => {
      const displayName = (member.Identity?.DisplayName || member.Username || '').toLowerCase();
      const gaiaID = (member.Identity?.GaiaID || '').toLowerCase();
      return displayName.includes(query) || gaiaID.includes(query);
    });
  }, [activeRoom, memberSearchQuery]);

  const typingLabel = session.typingMembers.length === 0
    ? ''
    : session.typingMembers.length === 1
      ? `${memberNameForGaiaID(session.typingMembers[0].actorGaiaId)} tippt gerade...`
      : `${session.typingMembers.length} Mitglieder tippen gerade...`;

  const kickTarget = members.find(member => member.IdentityID === kickConfirmMemberId);
  const kickMemberName = kickTarget?.Identity?.DisplayName || kickTarget?.Username || '';

  if (!activeRoom) {
    return (
      <div className="vgt-group vgt-group--empty">
        <h1 className="vgt-sr-only">Gruppenchat</h1>
        <ChatEmptyState
          icon="users"
          title={t('keine_gruppe_ausgewaehlt') || 'Keine Gruppe ausgewählt'}
          description="Wähle im linken Panel eine Gruppe aus, um ihre Kanäle zu öffnen."
        />
      </div>
    );
  }

  const composerPlaceholder = isReadOnly
    ? (t('room_read_only_placeholder') || 'Nur Owner und Admins können schreiben')
    : isSlowModeActive
      ? `Slow Mode: Bitte warte ${slowModeCooldown}s…`
      : `${t('message_to_channel') || 'Nachricht an'} #${activeChannel?.name || ''}`;

  return (
    <div className="vgt-group">
      <div className="vgt-chat-mobilebar">
        <button type="button" className="btn-secondary" onClick={() => setMobileMenuOpen?.(true)}>
          <Icon name="menu" size={16} />
          <span>{t('menu') || 'Menü'}</span>
        </button>
        <button type="button" className="btn-ghost" onClick={() => setActiveRoom(null)}>
          <Icon name="chevronLeft" size={16} />
          <span>{t('gruppen_chats') || 'Gruppen'}</span>
        </button>
      </div>

      {sidebarOpen ? (
        <button type="button" className="vgt-group__scrim" aria-label="Kanäle schließen" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <GroupSidebar
        room={activeRoom}
        channels={channels}
        activeChannel={activeChannel}
        canManage={actorCanManage}
        isPrivate={isPrivateRoom}
        securityState={securityState}
        readOnly={isReadOnly}
        open={sidebarOpen}
        onSelectChannel={channel => { setActiveChannel(channel); setSidebarOpen(false); }}
        onCreateChannel={() => setShowCreateChannelModal(true)}
        onOpenSettings={handleOpenGroupSettings}
        onLeaveRoom={id => handleLeaveRoom(id)}
        onCopyInvite={copyInviteCode}
        onClose={() => setSidebarOpen(false)}
        t={t}
      />

      <section className="vgt-group__main" aria-label="Kanal">
        {activeChannel ? (
          <>
            <GroupChannelHeader
              roomName={activeRoom.Name}
              channel={activeChannel}
              securityState={securityState}
              typingLabel={typingLabel}
              searchQuery={localSearchQuery}
              onSearchChange={setLocalSearchQuery}
              membersOpen={showMembersPanel}
              onToggleMembers={() => setShowMembersPanel(open => !open)}
              onClearChannel={handleClearGroupChannel}
              onReport={exports.report.openModal}
              onExportEncrypted={exports.encryptedExport.openModal}
              onExportProof={exports.gaiaProof.openModal}
              onOpenSidebar={() => setSidebarOpen(true)}
              memberCount={members.length}
              t={t}
            />

            <PinnedMessagesStrip
              messages={channelMessages}
              messageMeta={messageMeta}
              onJumpToMessage={session.jumpToMessage}
              t={t}
            />

            <GroupMessageList
              scrollRef={session.scrollRef}
              timelineItems={timelineItems}
              messageCount={filteredMessages.length}
              hasSearchQuery={Boolean(localSearchQuery.trim())}
              activeIdentity={activeIdentity}
              messageMeta={messageMeta}
              unreadMarker={unreadMarker}
              actionMessageId={session.actionMessageId}
              onOpenActions={session.openMessageActions}
              onStartLongPress={session.startLongPress}
              onCancelLongPress={session.cancelLongPress}
              onCloseActions={() => session.setActionMessageId(null)}
              onTogglePin={onToggleMessagePin}
              onToggleSave={onToggleMessageSaved}
              onReply={replyToMessage}
              onReact={onReactToMessage}
              onDelete={message => handleDeleteChatMessage(message.id)}
              onReport={exports.report.openModal}
              isOwnMessage={isOwnMessage}
              senderNameFor={senderNameFor}
              roleBadgesFor={roleBadgesFor}
              onOpenSender={gaiaID => openContactProfile?.(gaiaID)}
              ownMentionHandles={session.ownMentionHandles}
              suiteByMessageId={topSecretSuites}
              emptyHint="Starte die Konversation. Der Kanal-Sicherheitsstatus wird aus dem Envelope der letzten Nachricht abgeleitet."
              searchEmptyHint="Keine Nachrichten entsprechen deiner Suche."
              t={t}
            />

            <GroupComposer
              channelName={activeChannel.name}
              inputRef={composerInputRef}
              chatInputText={chatInputText}
              onInputChange={event => setChatInputText(event.target.value)}
              onKeyDown={session.handleComposerKeyDown}
              disabled={isComposerDisabled}
              placeholder={composerPlaceholder}
              isReadOnly={isReadOnly}
              slowModeSeconds={slowModeCooldown}
              showEmojiPicker={showEmojiPicker}
              onToggleEmojiPicker={() => setShowEmojiPicker(open => !open)}
              onAppendEmoji={emoji => {
                setChatInputText(previous => previous + emoji);
                setShowEmojiPicker(false);
              }}
              mentionMenuOpen={session.mentionMenuOpen}
              mentionSuggestions={session.mentionSuggestions}
              selectedMentionIndex={session.selectedMentionIndex}
              onApplyMention={session.applyMention}
              replyTarget={messageReplyTarget}
              onClearReply={() => setMessageReplyTarget(null)}
              pendingMessageCount={session.pendingMessageCount}
              onScrollToLatest={() => session.scrollToLatest('smooth')}
              onSend={handleSendGroupMessage}
              t={t}
            />
          </>
        ) : (
          <>
            {/* B-04: the channel header owns the single h1 whenever a channel is
                open; the empty state needs its own route-level heading. */}
            <h1 className="vgt-sr-only">{`Gruppenchat ${activeRoom.Name || ''}`.trim()}</h1>
            <ChatEmptyState
              icon="chat"
              title={t('kein_kanal_ausgewaehlt') || 'Kein Kanal ausgewählt'}
              description={t('select_channel_chat') || 'Wähle einen Kanal aus der linken Seitenleiste aus, um zu chatten.'}
              action={(
                <button type="button" className="btn-secondary" onClick={() => setSidebarOpen(true)}>
                  Kanäle anzeigen
                </button>
              )}
            />
          </>
        )}
      </section>

      {showMembersPanel ? (
        <GroupMembersPanel
          totalCount={members.length}
          members={filteredMembers}
          memberSearchQuery={memberSearchQuery}
          onSearchChange={setMemberSearchQuery}
          activeIdentity={activeIdentity}
          actorIsAdmin={actorIsAdmin}
          onClose={() => setShowMembersPanel(false)}
          onOpenProfile={gaiaID => openContactProfile?.(gaiaID)}
          onUpdateMemberRole={handleUpdateMemberRole}
          onKick={localKickMember}
          t={t}
        />
      ) : null}

      <GroupChatModals
        report={exports.report}
        encryptedExport={exports.encryptedExport}
        gaiaProof={exports.gaiaProof}
        kick={{
          open: Boolean(kickConfirmMemberId),
          memberName: kickMemberName,
          onConfirm: confirmKickMember,
          onCancel: () => setKickConfirmMemberId(null)
        }}
        roomName={activeRoom.Name}
        t={t}
      />
    </div>
  );
};

export default GroupChatPane;
