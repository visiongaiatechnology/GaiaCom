import React from 'react';
import Icon from '../../ui/Icon';
import {
  MessageActionMenu,
  MessageReactionStrip,
  ReplyContext
} from '../MessageActions';
import MessageAttachments from './MessageAttachments';
import { formatDayClock, formatFullDateTime } from '../shared/formatTime';
import { renderMarkdown } from '../../../utils/markdown';
import { suiteAlgorithmLabel } from '../shared/securityState';

function deliveryIndicator(message) {
  if (message.isRead) return { variant: 'read', label: 'Gelesen' };
  if (message.delivered) return { variant: 'delivered', label: 'Zugestellt' };
  return { variant: 'sent', label: (t('gesendet') || 'Gesendet') };
}

/**
 * One message of the 1:1 conversation. The bubble is the Z1 content plane:
 * near-opaque, readable, edge language aligned to the sender side. All message
 * actions stay available through the keyboard-reachable menu.
 */
export default function DirectMessageBubble({
  message,
  meta,
  isOutgoing,
  isEditing,
  editInputText,
  onEditInputTextChange,
  onCancelEdit,
  onSaveEdit,
  onOpenActions,
  onStartLongPress,
  onCancelLongPress,
  actionOpen,
  onCloseActions,
  onTogglePin,
  onToggleSave,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onReport,
  triggerAlert,
  activeIdentity,
  securitySuite = null,
  t
}) {
  const mentionHandles = [
    activeIdentity?.DisplayName,
    activeIdentity?.displayName,
    activeIdentity?.GaiaID
  ];
  const hasBeenEdited = message.editedAt &&
    !Number.isNaN(new Date(message.editedAt).getTime()) &&
    new Date(message.editedAt).getFullYear() > 1970;
  const delivery = isOutgoing ? deliveryIndicator(message) : null;
  const className = [
    'vgt-msg',
    isOutgoing ? 'vgt-msg--own' : 'vgt-msg--peer',
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

      {isEditing ? (
        <form
          className="vgt-msg__edit"
          onSubmit={event => { event.preventDefault(); onSaveEdit(message); }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              onCancelEdit();
            }
          }}
        >
          <label className="vgt-sr-only" htmlFor={`edit-${message.id}`}>Nachricht bearbeiten</label>
          <textarea
            id={`edit-${message.id}`}
            className="input-field vgt-msg__edit-input"
            value={editInputText}
            onChange={event => onEditInputTextChange(event.target.value)}
            rows={2}
          />
          <div className="vgt-msg__edit-actions">
            <button type="button" className="btn-secondary" onClick={onCancelEdit}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={!editInputText.trim()}>Speichern</button>
          </div>
        </form>
      ) : (
        <>
          <div className="vgt-msg__body">
            {message.body ? (
              <div className="vgt-msg__text">
                {renderMarkdown(message.body, { mentionHandles })}
              </div>
            ) : null}
            <MessageAttachments attachments={message.attachments} triggerAlert={triggerAlert} />
            {hasBeenEdited ? <span className="vgt-msg__edited" title={formatFullDateTime(message.editedAt)}>bearbeitet</span> : null}
          </div>

          <MessageReactionStrip meta={meta} t={t} />
        </>
      )}

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

        {delivery ? (
          <span className={`vgt-msg__delivery vgt-msg__delivery--${delivery.variant}`} title={delivery.label} aria-label={delivery.label}>
            {delivery.variant === 'sent' ? <Icon name="check" size={13} /> : (
              <span className="vgt-msg__ticks" aria-hidden="true">
                <Icon name="check" size={13} />
                <Icon name="check" size={13} />
              </span>
            )}
            <span className="vgt-sr-only">{delivery.label}</span>
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
        onEdit={onEdit}
        onDelete={onDelete}
        onReport={onReport}
        reportLabel={t('report_contact') || 'Kontakt melden'}
        canEdit={isOutgoing && !isEditing}
        t={t}
      />
    </article>
  );
}
