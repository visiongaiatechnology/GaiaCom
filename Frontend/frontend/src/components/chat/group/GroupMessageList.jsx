import React from 'react';
import { DateDivider, UnreadDivider } from '../MessageActions';
import GroupMessageBubble from './GroupMessageBubble';

/**
 * Scrollable channel stream. Day separators and the unread marker come from the
 * shared timeline builder; keys stay the message ids.
 */
export default function GroupMessageList({
  scrollRef,
  timelineItems,
  messageCount,
  hasSearchQuery,
  activeIdentity,
  messageMeta,
  unreadMarker,
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
  isOwnMessage,
  senderNameFor,
  roleBadgesFor,
  onOpenSender,
  ownMentionHandles,
  suiteByMessageId = {},
  emptyHint,
  searchEmptyHint,
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
      aria-label="Kanalverlauf"
    >
      {timelineItems.map(item => {
        if (item.type === 'divider') {
          return <DateDivider key={item.id} label={item.label} />;
        }

        const message = item.message;
        const showUnreadDivider = unreadMarker?.firstUnreadMessageId &&
          unreadMarker.firstUnreadMessageId === message.id;
        const meta = messageMeta[message.id] || {};

        return (
          <React.Fragment key={message.id}>
            {showUnreadDivider ? <UnreadDivider count={unreadMarker?.count || 0} /> : null}
            <GroupMessageBubble
              message={message}
              meta={meta}
              outgoing={isOwnMessage(message)}
              senderName={senderNameFor(message)}
              roleBadges={roleBadgesFor(message)}
              actionOpen={actionMessageId === message.id}
              onOpenActions={onOpenActions}
              onStartLongPress={onStartLongPress}
              onCancelLongPress={onCancelLongPress}
              onCloseActions={onCloseActions}
              onTogglePin={onTogglePin}
              onToggleSave={onToggleSave}
              onReply={onReply}
              onReact={onReact}
              onDelete={onDelete}
              onReport={onReport}
              onOpenSender={onOpenSender}
              ownMentionHandles={ownMentionHandles}
              securitySuite={suiteByMessageId[message.id] || null}
              t={t}
            />
          </React.Fragment>
        );
      })}

      {messageCount === 0 ? (
        <div className="vgt-chat-stream__empty">
          <p>{hasSearchQuery ? searchEmptyHint : emptyHint}</p>
        </div>
      ) : null}
    </div>
  );
}
