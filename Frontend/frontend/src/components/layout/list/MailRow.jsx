import React from 'react';
import Icon from '../../ui/Icon';
import {
  initialsMark,
  listTimestamp,
  parseMailboxLabels,
  truncateText
} from './format';

/**
 * VGT GLASS 2100 — dense mail row.
 *
 * Two-line hierarchy (sender/subject + preview/meta), right-aligned timestamp,
 * real unread/thread/security signals, hairline row (no card). The row body is
 * a real <button>; star/important are sibling buttons so every control is
 * keyboard reachable and valid HTML.
 */
export default function MailRow({
  mail,
  isActive,
  isChecked,
  isUnread,
  isStarred,
  isImportant,
  onOpen,
  onToggleSelect,
  onToggleStar,
  onToggleImportant,
  t
}) {
  const latest = mail.latestMessage || mail;
  const senderLabel = mail.senderGaia || mail.sender || '';
  const subject = mail.subject || ((typeof t === 'function' && t('no_subject')) || 'Kein Betreff');
  const timestamp = listTimestamp(mail.createdAt);
  const threadCount = mail.messages && mail.messages.length > 1 ? mail.messages.length : null;
  const labels = parseMailboxLabels((latest && latest.mailbox && latest.mailbox.labels) || []);
  const preview = truncateText(latest && latest.body, 88);

  const rowClass = [
    'vgt-inbox-row',
    'vgt-inbox-row--mail',
    isActive ? 'is-active' : '',
    isUnread ? 'is-unread' : '',
    mail.untrusted ? 'is-untrusted' : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={rowClass}>
      <span className="vgt-inbox-row__check-wrap">
        <input
          type="checkbox"
          className="vgt-inbox-row__check"
          checked={isChecked}
          onChange={(event) => onToggleSelect(event, mail.id)}
          aria-label={`${subject} auswählen`}
        />
      </span>

      <button
        type="button"
        className="vgt-inbox-row__main"
        onClick={onOpen}
        aria-current={isActive ? 'true' : undefined}
      >
        <span className="vgt-inbox-row__avatar" aria-hidden="true">
          {initialsMark(senderLabel)}
        </span>
        <span className="vgt-inbox-row__body">
          <span className="vgt-inbox-row__line vgt-inbox-row__line--top">
            {isUnread ? <span className="vgt-inbox-row__dot" aria-hidden="true" /> : null}
            <span className="vgt-inbox-row__name">{senderLabel}</span>
            {threadCount ? (
              <span className="vgt-inbox-row__thread vgt-numeric" title={`${threadCount} Nachrichten`}>
                {threadCount}
              </span>
            ) : null}
            <time
              className="vgt-inbox-row__time vgt-numeric"
              title={timestamp.title}
              dateTime={timestamp.dateTime}
            >
              {timestamp.label}
            </time>
          </span>
          <span className="vgt-inbox-row__subject">{subject}</span>
          {preview ? <span className="vgt-inbox-row__preview">{preview}</span> : null}
          <span className="vgt-inbox-row__tags">
            {mail.isSmtp ? (
              <span className="vgt-inbox-chip vgt-inbox-chip--legacy">
                <Icon name="alertTriangle" size={12} />
                <span>Legacy SMTP</span>
              </span>
            ) : (
              <span className="vgt-inbox-chip vgt-inbox-chip--secure">
                <Icon name="shieldCheck" size={12} />
                <span>GaiaSecure</span>
              </span>
            )}
            {mail.untrusted && !mail.isSmtp ? (
              <span className="vgt-inbox-chip vgt-inbox-chip--warn">Spam-Verdacht</span>
            ) : null}
            {labels.map((label) => (
              <span key={label} className="vgt-inbox-chip vgt-inbox-chip--label">{label}</span>
            ))}
          </span>
        </span>
        {isUnread ? <span className="vgt-sr-only">Ungelesen</span> : null}
      </button>

      <span className="vgt-inbox-row__actions">
        <button
          type="button"
          className={`btn-icon vgt-inbox-row__icon vgt-inbox-row__icon--star${isStarred ? ' is-on' : ''}`}
          aria-pressed={isStarred ? 'true' : 'false'}
          aria-label={isStarred ? 'Markierung entfernen' : 'Mail markieren'}
          title={isStarred ? 'Markierung entfernen' : 'Mail markieren'}
          onClick={onToggleStar}
        >
          <Icon name="star" size={16} />
        </button>
        <button
          type="button"
          className={`btn-icon vgt-inbox-row__icon vgt-inbox-row__icon--important${isImportant ? ' is-on' : ''}`}
          aria-pressed={isImportant ? 'true' : 'false'}
          aria-label={isImportant ? 'Wichtig-Markierung entfernen' : 'Als wichtig markieren'}
          title={isImportant ? 'Wichtig-Markierung entfernen' : 'Als wichtig markieren'}
          onClick={onToggleImportant}
        >
          <Icon name="bookmark" size={16} />
        </button>
      </span>
    </li>
  );
}
