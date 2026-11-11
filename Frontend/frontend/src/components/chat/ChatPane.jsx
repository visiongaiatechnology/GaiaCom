import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../ui/Icon';
import { buildTimelineItems, messagePreview } from './MessageActions';
import ChatEmptyState from './shared/ChatEmptyState';
import { deriveDirectSecurityState, buildTopSecretSuiteIndex } from './shared/securityState';
import useDirectChatSession from './direct/useDirectChatSession';
import useDirectChatComposer from './direct/useDirectChatComposer';
import useDirectChatExports from './direct/useDirectChatExports';
import DirectChatHeader from './direct/DirectChatHeader';
import DirectChatBanners from './direct/DirectChatBanners';
import DirectMessageList from './direct/DirectMessageList';
import DirectComposer from './direct/DirectComposer';
import DirectChatModals from './direct/DirectChatModals';

/**
 * S13 — Direct chat ("Quanten-Chat").
 *
 * Thin orchestrator: owns only the surface-local search/edit state. Session,
 * composer and export logic live in ./direct hooks; every visual section is a
 * subcomponent. Props, callbacks and data flow are unchanged from the legacy
 * ChatPane, so the surrounding app keeps working without adaptation.
 */
export const ChatPane = ({
  activeChatContact,
  activeDirectTopSecret = false,
  setDirectTopSecretEnabled,
  chatMessages,
  activeIdentity,
  chatInputText,
  setChatInputText,
  handleSendChatMessage,
  setMobileMenuOpen,
  setActiveChatContact,
  showEmojiPicker,
  setShowEmojiPicker,
  handleDeleteChatMessage,
  handleEditChatMessage,
  openContactProfile,
  messageMeta = {},
  onToggleMessagePin,
  onToggleMessageSaved,
  onReactToMessage,
  messageReplyTarget,
  setMessageReplyTarget,
  t,
  getSenderRoles,
  contactPresence,
  unreadMarker,
  uploadProgress,
  uploadChatFile,
  driveRecords = [],
  prepareDriveRecordForChatShare,
  toggleBlockContact,
  triggerAlert
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInputText, setEditInputText] = useState('');

  const visibleMessages = useMemo(() => {
    if (!activeChatContact || !activeIdentity) return [];
    return chatMessages.filter(message =>
      (message.sender === activeChatContact.gaiaID && message.recipient === activeIdentity.GaiaID) ||
      (message.sender === activeIdentity.GaiaID && message.recipient === activeChatContact.gaiaID)
    );
  }, [activeChatContact, activeIdentity, chatMessages]);

  const filteredMessages = useMemo(() => {
    if (!localSearchQuery.trim()) return visibleMessages;
    const query = localSearchQuery.toLowerCase();
    return visibleMessages.filter(message => {
      const body = String(message.body || '').toLowerCase();
      const sender = String(message.senderGaia || message.sender || '').toLowerCase();
      return body.includes(query) || sender.includes(query);
    });
  }, [localSearchQuery, visibleMessages]);

  /* M-13: the header chip is derived from the delivered envelope / contact
     capability; no unconditional encryption claim is rendered. */
  const securityState = useMemo(
    () => deriveDirectSecurityState({
      topSecretActive: activeDirectTopSecret,
      contact: activeChatContact,
      messages: visibleMessages
    }),
    [activeDirectTopSecret, activeChatContact, visibleMessages]
  );

  /* Suite evidence for the (rare) messages explicitly flagged top-secret. */
  const topSecretSuites = useMemo(
    () => buildTopSecretSuiteIndex(visibleMessages),
    [visibleMessages]
  );

  const timelineItems = useMemo(() => buildTimelineItems(filteredMessages), [filteredMessages]);
  const lastMessageId = filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1].id : '';

  const session = useDirectChatSession({
    activeChatContact,
    activeIdentity,
    contactPresence,
    visibleMessages,
    lastMessageId
  });

  const composer = useDirectChatComposer({
    activeChatContact,
    activeIdentity,
    isBlocked: session.isBlocked,
    chatInputText,
    setChatInputText,
    showEmojiPicker,
    setShowEmojiPicker,
    handleSendChatMessage,
    uploadChatFile,
    driveRecords,
    prepareDriveRecordForChatShare,
    triggerAlert,
    t
  });

  const exports = useDirectChatExports({
    activeChatContact,
    activeIdentity,
    visibleMessages,
    triggerAlert,
    t
  });

  useEffect(() => {
    setLocalSearchQuery('');
    setSearchOpen(false);
  }, [activeChatContact?.ID, activeChatContact?.gaiaID]);

  if (!activeChatContact) {
    return (
      <div className="vgt-chat vgt-chat--empty">
        <h1 className="vgt-sr-only">Chat</h1>
        <ChatEmptyState
          icon="chat"
          title={t('kein_chat_ausgewaehlt') || 'Kein Chat ausgewählt'}
          description="Wähle einen Kontakt im linken Panel aus, um den Chat zu öffnen."
        />
      </div>
    );
  }

  const replyToMessage = message => {
    setMessageReplyTarget({
      messageId: message.id,
      sender: message.sender,
      senderGaia: message.senderGaia,
      bodyPreview: messagePreview(message),
      createdAt: message.createdAt
    });
  };

  const startEditingMessage = message => {
    setEditingMessageId(message.id);
    setEditInputText(message.body || '');
  };

  const saveEditedMessage = async message => {
    if (!editInputText.trim()) return;
    const succeeded = await handleEditChatMessage?.(message, editInputText);
    if (succeeded) {
      setEditingMessageId(null);
      setEditInputText('');
    }
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditInputText('');
  };

  const peerTopSecretHint = Boolean(
    activeChatContact?.mldsa87Public ||
    activeChatContact?.mldsa87 ||
    activeChatContact?.publicKeys?.mldsa87 ||
    activeChatContact?.public_keys?.mldsa87
  );

  return (
    <div className="vgt-chat">
      <div className="vgt-chat-mobilebar">
        <button type="button" className="btn-secondary" onClick={() => setMobileMenuOpen?.(true)}>
          <Icon name="menu" size={16} />
          <span>{t('menu') || 'Menü'}</span>
        </button>
        <button type="button" className="btn-ghost" onClick={() => setActiveChatContact?.(null)}>
          <Icon name="chevronLeft" size={16} />
          <span>{t('quanten_chat') || 'Chats'}</span>
        </button>
      </div>

      <DirectChatHeader
        contact={activeChatContact}
        statusLabel={session.statusLabel}
        isOnline={session.isOnline}
        isTyping={session.contactTyping}
        securityState={securityState}
        topSecret={activeDirectTopSecret}
        peerTopSecretHint={peerTopSecretHint}
        getSenderRoles={getSenderRoles}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen(open => !open)}
        onOpenProfile={openContactProfile}
        isBlocked={session.isBlocked}
        onToggleBlock={toggleBlockContact}
        onOpenReport={exports.report.openModal}
        onToggleTopSecret={setDirectTopSecretEnabled}
        onExportEncrypted={exports.encryptedExport.openModal}
        onExportProof={exports.gaiaProof.openModal}
        t={t}
      />

      {searchOpen ? (
        <div className="vgt-chat-search">
          <Icon name="search" size={16} className="vgt-chat-search__icon" />
          <label className="vgt-sr-only" htmlFor="vgt-chat-search-input">Chat durchsuchen</label>
          <input
            id="vgt-chat-search-input"
            type="search"
            className="input-field"
            placeholder="Chat durchsuchen…"
            value={localSearchQuery}
            onChange={event => setLocalSearchQuery(event.target.value)}
          />
          {localSearchQuery ? (
            <button
              type="button"
              className="btn-icon"
              onClick={() => setLocalSearchQuery('')}
              aria-label="Suche löschen"
            >
              <Icon name="close" size={15} />
            </button>
          ) : null}
        </div>
      ) : null}

      <DirectChatBanners
        hasKeyRotation={session.hasKeyRotation}
        recentSecurityAlerts={session.recentSecurityAlerts}
        isBlocked={session.isBlocked}
        onOpenProfile={() => openContactProfile?.(activeChatContact.gaiaID)}
        onDismissKeyRotation={session.dismissKeyRotationNotice}
        t={t}
      />

      <DirectMessageList
        scrollRef={session.scrollRef}
        timelineItems={timelineItems}
        messageCount={filteredMessages.length}
        activeIdentity={activeIdentity}
        messageMeta={messageMeta}
        unreadMarker={unreadMarker}
        editingMessageId={editingMessageId}
        editInputText={editInputText}
        onEditInputTextChange={setEditInputText}
        onCancelEdit={cancelEditing}
        onSaveEdit={saveEditedMessage}
        onStartEdit={startEditingMessage}
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
        triggerAlert={triggerAlert}
        suiteByMessageId={topSecretSuites}
        emptyHint="Starte die Konversation. Der Sicherheitsstatus in der Kopfzeile wird aus dem Envelope der letzten Nachricht abgeleitet."
        t={t}
      />

      <DirectComposer
        inputRef={composer.inputRef}
        fileInputRef={composer.fileInputRef}
        chatInputText={chatInputText}
        onInputChange={composer.handleInputChange}
        onComposerKeyDown={composer.handleComposerKeyDown}
        isBlocked={session.isBlocked}
        isRecording={composer.isRecording}
        recordingTime={composer.recordingTime}
        onStartRecording={composer.startRecording}
        onStopRecording={composer.stopRecording}
        uploadProgress={uploadProgress}
        uploading={composer.uploading}
        stagedAttachments={composer.stagedAttachments}
        onRemoveStaged={composer.removeStagedAttachment}
        showEmojiPicker={showEmojiPicker}
        onToggleEmojiPicker={() => setShowEmojiPicker(previous => !previous)}
        onAppendEmoji={composer.appendChatEmoji}
        onFileSelect={composer.handleFileSelect}
        drivePickerOpen={composer.drivePickerOpen}
        onToggleDrivePicker={() => composer.setDrivePickerOpen(previous => !previous)}
        shareableDriveRecords={composer.shareableDriveRecords}
        onAttachDrive={composer.attachDriveRecord}
        mentionOpen={composer.mentionOpen}
        mentionCandidates={composer.mentionCandidates}
        onInsertMention={composer.insertMention}
        replyTarget={messageReplyTarget}
        onClearReply={() => setMessageReplyTarget(null)}
        pendingMessageCount={session.pendingMessageCount}
        onScrollToLatest={() => session.scrollToLatest('smooth')}
        onSend={composer.handleSendWrapper}
        t={t}
      />

      <DirectChatModals
        report={exports.report}
        encryptedExport={exports.encryptedExport}
        gaiaProof={exports.gaiaProof}
        contactName={activeChatContact.displayName}
        t={t}
      />
    </div>
  );
};

export default ChatPane;
