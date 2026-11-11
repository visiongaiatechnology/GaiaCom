import React, { useEffect, useRef } from 'react';
import Icon from '../ui/Icon';
import { REACTION_EMOJIS, reactionLabel } from './shared/emojiSet';

/*
 * Shared message primitives for the direct and group conversation surfaces.
 *
 * API stability (other panes import these): keep the exports below with the
 * same names and call signatures. `messagePreview` and `ReplyComposerPreview`
 * are used by the compose/reader package; only optional props were added.
 */

export const MESSAGE_REACTION_EMOJIS = REACTION_EMOJIS;

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

  (Array.isArray(messages) ? messages : []).forEach(message => {
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

const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])';

/**
 * Message action popover. Keyboard complete: focus enters the menu, Arrow keys
 * cycle items, Escape (and the explicit last item) closes it and restores focus.
 * Destructive actions carry a dedicated danger style and their own label.
 */
export function MessageActionMenu({
  open,
  message,
  meta,
  onClose,
  onTogglePin,
  onToggleSave,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onReport,
  reportLabel,
  canEdit = false,
  t
}) {
  const menuRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previousActive = document.activeElement;
    const node = menuRef.current;
    const first = node?.querySelector(MENU_ITEM_SELECTOR);
    if (first) first.focus();

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const items = Array.from(node?.querySelectorAll(MENU_ITEM_SELECTOR) || []);
      if (items.length === 0) return;
      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement);
      let nextIndex = 0;
      if (event.key === 'End') nextIndex = items.length - 1;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      else nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[nextIndex].focus();
    };

    node?.addEventListener('keydown', onKeyDown);
    return () => {
      node?.removeEventListener('keydown', onKeyDown);
      if (previousActive && typeof previousActive.focus === 'function') {
        previousActive.focus();
      }
    };
  }, [open]);

  if (!open || !message) return null;

  const pinned = !!meta?.pinned;
  const saved = !!meta?.saved;

  const run = action => () => {
    action?.(message);
    onClose?.();
  };

  return (
    <div
      ref={menuRef}
      className="vgt-chat-menu vgt-glass vgt-glass--floating"
      role="menu"
      aria-label={t('message_actions') || 'Nachrichtenaktionen'}
      onClick={event => event.stopPropagation()}
    >
      {canEdit && onEdit ? (
        <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={run(onEdit)}>
          <Icon name="edit" size={15} />
          <span>{t('bearbeiten') || 'Bearbeiten'}</span>
        </button>
      ) : null}

      {onReply ? (
        <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={run(onReply)}>
          <Icon name="reply" size={15} />
          <span>{t('message_reply') || 'Antworten'}</span>
        </button>
      ) : null}

      {onTogglePin ? (
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={pinned}
          className="vgt-chat-menu__item"
          onClick={() => { onTogglePin(message.id); onClose?.(); }}
        >
          <Icon name="pin" size={15} />
          <span>{pinned ? (t('message_unpin') || 'Lösen') : (t('message_pin') || 'Anheften')}</span>
        </button>
      ) : null}

      {onToggleSave ? (
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={saved}
          className="vgt-chat-menu__item"
          onClick={() => { onToggleSave(message.id); onClose?.(); }}
        >
          <Icon name="bookmark" size={15} />
          <span>{saved ? (t('message_unsave') || 'Nicht mehr merken') : (t('message_save') || 'Merken')}</span>
        </button>
      ) : null}

      {onReport ? (
        <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={run(onReport)}>
          <Icon name="alertTriangle" size={15} />
          <span>{reportLabel || t('report') || 'Melden'}</span>
        </button>
      ) : null}

      {onReact ? (
        <div className="vgt-chat-menu__group" role="group" aria-label={t('message_react') || 'Reagieren'}>
          <span className="vgt-chat-menu__group-label">{t('message_react') || 'Reagieren'}</span>
          <div className="vgt-chat-menu__reactions">
            {MESSAGE_REACTION_EMOJIS.map(emoji => (
              <button
                type="button"
                role="menuitem"
                key={emoji}
                className="vgt-chat-menu__reaction"
                aria-label={reactionLabel(emoji)}
                title={reactionLabel(emoji)}
                onClick={() => { onReact(message.id, emoji); onClose?.(); }}
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {onDelete ? (
        <button type="button" role="menuitem" className="vgt-chat-menu__item vgt-chat-menu__item--danger" onClick={run(onDelete)}>
          <Icon name="trash" size={15} />
          <span>{t('delete') || 'Löschen'}</span>
        </button>
      ) : null}

      <button type="button" role="menuitem" className="vgt-chat-menu__item vgt-chat-menu__item--quiet" onClick={onClose}>
        <Icon name="close" size={15} />
        <span>{t('close') || 'Schließen'}</span>
      </button>
    </div>
  );
}

export function MessageReactionStrip({ meta, t }) {
  const reactions = meta?.reactions || {};
  const entries = Object.entries(reactions).filter(([, count]) => Number(count) > 0);
  if (entries.length === 0) return null;

  return (
    <div className="vgt-chat-reactions" role="list" aria-label={t('message_reactions') || 'Reaktionen'}>
      {entries.map(([emoji, count]) => (
        <span className="vgt-chat-reaction" role="listitem" key={emoji}>
          <span aria-hidden="true">{emoji}</span>
          <span className="vgt-numeric">{count}</span>
          <span className="vgt-sr-only">{`${reactionLabel(emoji)}: ${count}`}</span>
        </span>
      ))}
    </div>
  );
}

export function ReplyContext({ replyTo, senderLabel, t }) {
  if (!replyTo) return null;

  return (
    <div className="vgt-reply-quote">
      <span className="vgt-reply-quote__label">
        <Icon name="reply" size={12} />
        {senderLabel || t('message_replied_message') || 'Antwort'}
      </span>
      <span className="vgt-reply-quote__body">{replyTo.bodyPreview || replyTo.messageId}</span>
    </div>
  );
}

export function ReplyComposerPreview({ replyTarget, onClear, t, senderLabel }) {
  if (!replyTarget) return null;

  return (
    <div className="vgt-chat-reply-banner">
      <Icon name="reply" size={15} className="vgt-chat-reply-banner__icon" />
      <div className="vgt-chat-reply-banner__copy">
        <strong>
          {t('message_replying_to') || 'Antwort an'}
          {senderLabel ? ` ${senderLabel}` : ''}
        </strong>
        <span>{messagePreview(replyTarget)}</span>
      </div>
      <button type="button" className="btn-icon" onClick={onClear} aria-label={t('close') || 'Antwort verwerfen'}>
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}

export function PinnedMessagesStrip({ messages, messageMeta, onJumpToMessage, t }) {
  const pinned = (Array.isArray(messages) ? messages : []).filter(message => messageMeta?.[message.id]?.pinned);
  if (pinned.length === 0) return null;

  return (
    <section className="vgt-chat-pinned" aria-label={t('message_pinned_title') || 'Angeheftete Nachrichten'}>
      <span className="vgt-chat-pinned__label">
        <Icon name="pin" size={13} />
        {t('message_pinned_title') || 'Angeheftet'}
      </span>
      <ul className="vgt-chat-pinned__list">
        {pinned.slice(-3).map(message => (
          <li key={message.id}>
            <button type="button" onClick={() => onJumpToMessage(message.id)}>
              <span>{messagePreview(message)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DateDivider({ label }) {
  if (!label) return null;

  return (
    <div className="vgt-chat-day" role="separator" aria-label={label}>
      <span className="vgt-chat-day__label">{label}</span>
    </div>
  );
}

export function UnreadDivider({ count }) {
  if (!count || count < 1) return null;

  return (
    <div className="vgt-chat-unread" role="separator" aria-label="Ungelesene Nachrichten">
      <span>{count === 1 ? '1 ungelesene Nachricht' : `${count} ungelesene Nachrichten`}</span>
    </div>
  );
}

export function ScrollToLatestButton({ count, onClick }) {
  if (!count || count < 1) return null;

  return (
    <button type="button" className="vgt-chat-jump" onClick={onClick}>
      <Icon name="chevronDown" size={15} />
      <span>{count === 1 ? '1 neue Nachricht' : `${count} neue Nachrichten`}</span>
    </button>
  );
}
