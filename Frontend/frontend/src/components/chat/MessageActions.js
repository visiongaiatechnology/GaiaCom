// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

export const MESSAGE_REACTION_EMOJIS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F525}',
  '\u{2705}'
];

export function messagePreview(message) {
  const value = String(message?.body || '');
  if (value.length <= 96) return value;
  return `${value.slice(0, 96)}...`;
}

export function formatTimelineDayLabel(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((todayKey - dateKey) / 86400000);

  if (dayDiff === 0) return 'Heute';
  if (dayDiff === 1) return 'Gestern';

  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });
}

export function buildTimelineItems(messages) {
  const items = [];
  let lastDayKey = '';

  messages.forEach(message => {
    const date = new Date(message.createdAt);
    const dayKey = Number.isNaN(date.getTime()) ? `unknown-${message.id}` : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (dayKey !== lastDayKey) {
      items.push({
        type: 'divider',
        id: `divider-${dayKey}`,
        label: formatTimelineDayLabel(message.createdAt)
      });
      lastDayKey = dayKey;
    }

    items.push({
      type: 'message',
      id: message.id,
      message
    });
  });

  return items;
}

export function MessageActionMenu({
  open,
  message,
  meta,
  onClose,
  onTogglePin,
  onToggleSave,
  onReply,
  onReact,
  t
}) {
  if (!open || !message) return null;

  const pinned = !!meta?.pinned;
  const saved = !!meta?.saved;

  return (
    <div className="message-action-menu" role="menu" onClick={event => event.stopPropagation()}>
      <div className="message-action-row">
        <button type="button" onClick={() => { onTogglePin(message.id); onClose(); }}>
          {pinned ? (t('message_unpin') || 'Unpin') : (t('message_pin') || 'Pin')}
        </button>
        <button type="button" onClick={() => { onToggleSave(message.id); onClose(); }}>
          {saved ? (t('message_unsave') || 'Unsave') : (t('message_save') || 'Save')}
        </button>
        <button type="button" onClick={() => { onReply(message); onClose(); }}>
          {t('message_reply') || 'Reply'}
        </button>
      </div>
      <div className="message-reaction-row" aria-label={t('message_react') || 'React'}>
        {MESSAGE_REACTION_EMOJIS.map(emoji => (
          <button type="button" key={emoji} onClick={() => { onReact(message.id, emoji); onClose(); }}>
            {emoji}
          </button>
        ))}
      </div>
      <button type="button" className="message-action-close" onClick={onClose}>
        {t('close') || 'Close'}
      </button>
    </div>
  );
}

export function MessageReactionStrip({ meta }) {
  const reactions = meta?.reactions || {};
  const entries = Object.entries(reactions).filter(([, count]) => Number(count) > 0);
  if (entries.length === 0) return null;

  return (
    <div className="message-reaction-strip">
      {entries.map(([emoji, count]) => (
        <span key={emoji}>{emoji} {count}</span>
      ))}
    </div>
  );
}

export function ReplyContext({ replyTo, t }) {
  if (!replyTo) return null;

  return (
    <div className="message-reply-context">
      <strong>{t('message_replying_to') || 'Replying to'}</strong>
      <span>{replyTo.bodyPreview || replyTo.messageId}</span>
    </div>
  );
}

export function ReplyComposerPreview({ replyTarget, onClear, t }) {
  if (!replyTarget) return null;

  return (
    <div className="reply-composer-preview">
      <div>
        <strong>{t('message_replying_to') || 'Replying to'}</strong>
        <span>{messagePreview(replyTarget)}</span>
      </div>
      <button type="button" onClick={onClear} aria-label={t('close') || 'Close'}>x</button>
    </div>
  );
}

export function PinnedMessagesStrip({ messages, messageMeta, onJumpToMessage, t }) {
  const pinned = messages.filter(message => messageMeta?.[message.id]?.pinned);
  if (pinned.length === 0) return null;

  return (
    <div className="pinned-messages-strip" aria-label={t('message_pinned_title') || 'Pinned messages'}>
      <div className="pinned-title">{t('message_pinned_title') || 'Pinned messages'}</div>
      <div className="pinned-list">
        {pinned.slice(-3).map(message => (
          <button type="button" key={message.id} onClick={() => onJumpToMessage(message.id)}>
            <span>{messagePreview(message)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DateDivider({ label }) {
  if (!label) return null;

  return (
    <div className="chat-date-divider" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}

export function UnreadDivider({ count }) {
  if (!count || count < 1) return null;

  return (
    <div className="chat-unread-divider" aria-label="Ungelesene Nachrichten">
      <span>{count === 1 ? '1 ungelesene Nachricht' : `${count} ungelesene Nachrichten`}</span>
    </div>
  );
}

export function ScrollToLatestButton({ count, onClick }) {
  if (!count || count < 1) return null;

  return (
    <button type="button" className="chat-scroll-latest-btn" onClick={onClick}>
      {count === 1 ? '1 neue Nachricht' : `${count} neue Nachrichten`}
    </button>
  );
}
