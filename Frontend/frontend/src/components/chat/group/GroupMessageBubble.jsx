import React from 'react';
import Icon from '../../ui/Icon';
import { MessageActionMenu, MessageReactionStrip, ReplyContext } from '../MessageActions';
import { formatDayClock, formatFullDateTime } from '../shared/formatTime';
import { renderMarkdown } from '../../../utils/markdown';
import { suiteAlgorithmLabel } from '../shared/securityState';

/**
 * One message of a group channel. Incoming messages carry the sender identity
 * (real member record + governance roles); own messages align to the other edge.
 * All actions live in the keyboard-reachable menu.
 */
export default function GroupMessageBubble({
  message,
  meta,
  outgoing,
  senderName,
  roleBadges = [],
  actionOpen,
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
  onOpenSender,
  ownMentionHandles,
  securitySuite = null,
  t
}) {
  const className = [
    'vgt-msg',
    outgoing ? 'vgt-msg--own' : 'vgt-msg--peer',
    meta?.pinned ? 'is-pinned' : '',
    meta?.saved ? 'is-saved' : '',
    message.topSecret ? 'is-secret' : ''
  ].filter(Boolean).join(' ');

  return (
    <article
      className={className}
      data-message-id={message.id}
      onContextMenu={event => onOpenActions(event, message.id)}
      onTouchStart={() => onStartLongPress(message.id)}
      onTouchEnd={onCancelLongPress}
      onTouchMove={onCancelLongPress}
    >
      {!outgoing ? (
        <div className="vgt-msg__sender">
          <button
            type="button"
            className="vgt-msg__sender-name"
            onClick={() => onOpenSender(message.senderGaia || message.sender)}
          >
            {senderName}
          </button>
          {roleBadges.map(role => (
            <span key={role.key} className={`vgt-role vgt-role--${role.variant}`}>{role.label}</span>
          ))}
        </div>
      ) : null}

      {message.topSecret ? (
        <p
          className="vgt-msg__secret"
          title={securitySuite?.raw ? `Suite aus dem Envelope dieser Nachricht: ${securitySuite.raw}` : undefined}
        >
          <Icon name="lock" size={12} />
          <span>TOP SECRET · {suiteAlgorithmLabel(securitySuite)}</span>
        </p>
      ) : null}

      <ReplyContext replyTo={message.replyTo} t={t} />

      <div className="vgt-msg__body">
        {message.body ? (
          <div className="vgt-msg__text">
            {renderMarkdown(message.body, { mentionHandles: ownMentionHandles })}
          </div>
        ) : null}
      </div>

      <MessageReactionStrip meta={meta} t={t} />

      <footer className="vgt-msg__meta">
        <time className="vgt-msg__time vgt-numeric" dateTime={message.createdAt} title={formatFullDateTime(message.createdAt)}>
          {formatDayClock(message.createdAt)}
        </time>

        {meta?.pinned ? (
          <span className="vgt-msg__flag" title={t('message_pinned') || 'Angeheftet'}>
            <Icon name="pin" size={12} />
            <span className="vgt-sr-only">Angeheftet</span>
          </span>
        ) : null}

        {meta?.saved ? (
          <span className="vgt-msg__flag">
            <Icon name="bookmark" size={12} />
            <span>{t('message_saved') || 'Gemerkt'}</span>
          </span>
        ) : null}

        {message.untrusted ? (
          <span className="vgt-msg__flag vgt-msg__flag--danger">
            <Icon name="alertTriangle" size={12} />
            <span>{t('untrusted') || 'Nicht vertrauenswürdig'}</span>
          </span>
        ) : null}

        <button
          type="button"
          className="btn-icon vgt-msg__more"
          onClick={event => onOpenActions(event, message.id)}
          aria-label="Nachrichtenaktionen"
          aria-haspopup="menu"
          aria-expanded={actionOpen}
        >
          <Icon name="more" size={15} />
        </button>
      </footer>

      <MessageActionMenu
        open={actionOpen}
        message={message}
        meta={meta}
        onClose={onCloseActions}
        onTogglePin={onTogglePin}
        onToggleSave={onToggleSave}
        onReply={onReply}
        onReact={onReact}
        onDelete={onDelete}
        onReport={onReport}
        reportLabel={t('report_group') || 'Gruppe melden'}
        canEdit={false}
        t={t}
      />
    </article>
  );
}
