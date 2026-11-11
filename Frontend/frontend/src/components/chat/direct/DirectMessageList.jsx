import React from 'react';
import { DateDivider, UnreadDivider } from '../MessageActions';
import DirectMessageBubble from './DirectMessageBubble';

/**
 * Scrollable conversation stream (Z1). Day separators, unread marker and message
 * groups are derived from the existing timeline builder; keys stay the message
 * ids so re-renders do not remount bubbles.
 */
export default function DirectMessageList({
  scrollRef,
  timelineItems,
  messageCount,
  activeIdentity,
  messageMeta,
  unreadMarker,
  editingMessageId,
  editInputText,
  onEditInputTextChange,
  onCancelEdit,
  onSaveEdit,
  onStartEdit,
  actionMessageId,
  onOpenActions,
  onStartLongPress,
  onCancelLongPress,
  onCloseActions,
  onTogglePin,
  onToggleSave,
  onReply,
  onReact,
  onDelete,
  onReport,
  triggerAlert,
  suiteByMessageId = {},
  emptyHint,
  t
}) {
  return (
    <div
      className="vgt-chat-stream gaia-scrollbar"
      ref={scrollRef}
      onClick={onCloseActions}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Nachrichtenverlauf"
    >
      {timelineItems.map(item => {
        if (item.type === 'divider') {
          return <DateDivider key={item.id} label={item.label} />;
        }

        const message = item.message;
        const showUnreadDivider = unreadMarker?.firstUnreadMessageId &&
          unreadMarker.firstUnreadMessageId === message.id;
        const meta = messageMeta[message.id] || {};
        const isEditing = editingMessageId === message.id;

        return (
          <React.Fragment key={message.id}>
            {showUnreadDivider ? <UnreadDivider count={unreadMarker?.count || 0} /> : null}
            <DirectMessageBubble
              message={message}
              meta={meta}
              isOutgoing={message.sender === activeIdentity?.GaiaID}
              isEditing={isEditing}
              editInputText={editInputText}
              onEditInputTextChange={onEditInputTextChange}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onOpenActions={onOpenActions}
              onStartLongPress={onStartLongPress}
              onCancelLongPress={onCancelLongPress}
              actionOpen={actionMessageId === message.id}
              onCloseActions={onCloseActions}
              onTogglePin={onTogglePin}
              onToggleSave={onToggleSave}
              onReply={onReply}
              onReact={onReact}
              onEdit={onStartEdit}
              onDelete={onDelete}
              onReport={onReport}
              triggerAlert={triggerAlert}
              activeIdentity={activeIdentity}
              securitySuite={suiteByMessageId[message.id] || null}
              t={t}
            />
          </React.Fragment>
        );
      })}

      {messageCount === 0 ? (
        <div className="vgt-chat-stream__empty">
          <p>{emptyHint}</p>
        </div>
      ) : null}
    </div>
  );
}
