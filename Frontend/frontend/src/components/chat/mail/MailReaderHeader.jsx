import React, { useState } from 'react';
import Icon from '../../ui/Icon';
import MailIdentityGlyph from './MailIdentityGlyph';
import MailMenu from './MailMenu';
import {
  findContact,
  formatDateTime,
  formatIsoDateTime,
  getDisplayName,
  getThreadRecipients,
  parseMailboxLabels
} from './mailUtils';

const SNOOZE_OPTIONS = [
  { label: 'In 1 Stunde', hours: 1 },
  { label: 'Morgen früh', hours: 24 },
  { label: 'Nächste Woche', hours: 168 }
];

/**
 * Reading header: subject, sender identity, recipients, timestamp and the
 * security context derived from message props. Mailbox operations live here so
 * they stay available while the thread scrolls.
 */
export default function MailReaderHeader({
  selectedMail,
  messages,
  security,
  contacts,
  labelsList,
  proofCount,
  onBack,
  onArchive,
  onDelete,
  onSpam,
  onSnooze,
  onToggleLabel,
  onCreateLabel,
  t
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  const latest = messages[messages.length - 1] || selectedMail || {};
  const senderAddress = latest.senderGaia || latest.sender || '';
  const senderContact = findContact(contacts, latest.sender);
  const senderName = getDisplayName(senderContact, senderAddress) || t('unknown_sender') || 'Unbekannt';

  const recipients = getThreadRecipients(messages);
  const recipientLabel =
    recipients.length === 0
      ? '—'
      : recipients.length === 1
        ? recipients[0]
        : `${recipients[0]} +${recipients.length - 1}`;

  const selectedLabels = parseMailboxLabels(selectedMail?.mailbox?.labels);
  const sentAt = latest.createdAt || latest.timestamp;
  const sentLabel = formatDateTime(sentAt);

  return (
    <header className="vgt-mail-reader__head">
      <div className="vgt-mail-reader__bar">
        <button
          type="button"
          className="mobile-back-btn vgt-mail-back"
          onClick={onBack}
        >
          <Icon name="chevronLeft" size={16} />
          <span>{t('posteingang') || 'Mailbox'}</span>
        </button>

        <div className="vgt-mail-reader__ops" role="group" aria-label={t('mail_actions') || 'Mail-Aktionen'}>
          <button
            type="button"
            className="btn-action"
            onClick={onArchive}
            title={t('archive') || 'Mail archivieren'}
          >
            <Icon name="archive" size={16} />
            <span>{t('archive_short') || 'Archiv'}</span>
          </button>
          <button
            type="button"
            className="btn-action"
            onClick={onDelete}
            title={t('delete') || 'Mail in den Papierkorb verschieben'}
          >
            <Icon name="trash" size={16} />
            <span>{t('delete_short') || 'Löschen'}</span>
          </button>
          <button
            type="button"
            className="btn-action"
            onClick={onSpam}
            title={t('report_spam') || 'Als Spam markieren'}
          >
            <Icon name="alertOctagon" size={16} />
            <span>{t('spam_short') || 'Spam'}</span>
          </button>

          <div className="vgt-mail-menu-anchor">
            <button
              type="button"
              className="btn-action"
              aria-haspopup="menu"
              aria-expanded={snoozeOpen}
              aria-controls="vgt-mail-snooze-menu"
              onClick={() => {
                setSnoozeOpen(!snoozeOpen);
                setLabelOpen(false);
              }}
            >
              <Icon name="clock" size={16} />
              <span>{t('snooze') || 'Snooze'}</span>
            </button>
            <MailMenu
              id="vgt-mail-snooze-menu"
              open={snoozeOpen}
              label={t('snooze') || 'Snooze'}
              onClose={() => setSnoozeOpen(false)}
            >
              {SNOOZE_OPTIONS.map((option) => (
                <button
                  key={option.hours}
                  type="button"
                  role="menuitem"
                  className="vgt-mail-menu__item"
                  onClick={() => {
                    setSnoozeOpen(false);
                    onSnooze(option.hours);
                  }}
                >
                  <Icon name="clock" size={14} />
                  <span>{t(`snooze_${option.hours}`) || option.label}</span>
                </button>
              ))}
            </MailMenu>
          </div>

          <div className="vgt-mail-menu-anchor">
            <button
              type="button"
              className="btn-action"
              aria-haspopup="menu"
              aria-expanded={labelOpen}
              aria-controls="vgt-mail-label-menu"
              onClick={() => {
                setLabelOpen(!labelOpen);
                setSnoozeOpen(false);
              }}
            >
              <Icon name="bookmark" size={16} />
              <span>{t('labels') || 'Label'}</span>
            </button>
            <MailMenu
              id="vgt-mail-label-menu"
              open={labelOpen}
              label={t('labels') || 'Labels'}
              onClose={() => setLabelOpen(false)}
            >
              {Array.isArray(labelsList) && labelsList.length > 0 ? (
                labelsList.map((label) => {
                  const active = selectedLabels.includes(label.name);
                  return (
                    <button
                      key={label.id || label.name}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={active}
                      className={`vgt-mail-menu__item${active ? ' is-selected' : ''}`}
                      onClick={() => onToggleLabel(label.name)}
                    >
                      <span
                        className="vgt-mail-label-dot"
                        style={{ '--vgt-label-color': label.color || 'var(--vgt-pigment)' }}
                        aria-hidden="true"
                      />
                      <span>{label.name}</span>
                      {active ? (
                        <span className="vgt-mail-menu__state" aria-hidden="true">
                          <Icon name="check" size={14} />
                        </span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <p className="vgt-mail-menu__empty">{t('no_labels') || 'Noch keine Labels angelegt.'}</p>
              )}
              <span className="vgt-mail-menu__divider" aria-hidden="true" />
              <button
                type="button"
                role="menuitem"
                className="vgt-mail-menu__item vgt-mail-menu__item--create"
                onClick={() => {
                  setLabelOpen(false);
                  onCreateLabel();
                }}
              >
                <Icon name="plus" size={14} />
                <span>{t('new_label') || 'Neues Label'}</span>
              </button>
            </MailMenu>
          </div>
        </div>
      </div>

      <div className="vgt-mail-reader__hero">
        <div className="vgt-mail-reader__hero-main">
          <MailIdentityGlyph name={senderName} address={senderAddress} size="lg" />
          <div className="vgt-mail-reader__hero-text">
            <p className="vgt-eyebrow">
              {messages.length > 1 ? t('mail_thread') || 'Mail-Thread' : t('mail_message') || 'Nachricht'}
            </p>
            <h2 className="vgt-h2" id="vgt-mail-reader-subject">
              {selectedMail?.subject || t('no_subject') || 'Ohne Betreff'}
            </h2>
            <p className="vgt-caption vgt-mail-reader__sender-line">
              <span className="vgt-mail-reader__sender-name">{senderName}</span>
              <span className="vgt-mail-reader__dot" aria-hidden="true">·</span>
              <span>
                {t('to_recipients') || 'An'}{' '}
                <span className="vgt-mail-reader__address" title={recipients.join(', ')}>
                  {recipientLabel}
                </span>
              </span>
            </p>
            <div className="vgt-mail-reader__chips">
              {security.hasLegacySmtp ? (
                <span className="vgt-status vgt-status--warn">
                  {t('smtp_legacy') || 'SMTP · nicht Ende-zu-Ende'}
                </span>
              ) : security.isGaiaOnly ? (
                <span className="vgt-status vgt-status--ok">
                  {t('e2e_gaia_network') || 'E2E · GaiaCOM-Netz'}
                </span>
              ) : null}
              {security.hasUntrusted ? (
                <span className="vgt-status vgt-status--danger">
                  {t('quarantine') || 'Quarantäne'}
                </span>
              ) : null}
              {security.hasKeyChange ? (
                <span className="vgt-status vgt-status--warn">
                  {t('key_changed') || 'Schlüsselwechsel'}
                </span>
              ) : null}
              {proofCount > 0 ? (
                <span className="vgt-status vgt-status--signed">
                  {t('gaiaproof') || 'GaiaProof'}{' '}
                  <span className="vgt-numeric">{proofCount}</span>
                </span>
              ) : null}
              {selectedLabels.map((labelName) => {
                const label = Array.isArray(labelsList)
                  ? labelsList.find((entry) => entry.name === labelName)
                  : null;
                return (
                  <span key={labelName} className="vgt-mail-label">
                    <span
                      className="vgt-mail-label-dot"
                      style={{ '--vgt-label-color': label?.color || 'var(--vgt-pigment)' }}
                      aria-hidden="true"
                    />
                    {labelName}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="vgt-mail-reader__hero-side">
          <time
            className="vgt-mail-time vgt-numeric"
            dateTime={formatIsoDateTime(sentAt)}
            title={sentLabel || undefined}
          >
            {sentLabel || t('time_unknown') || 'Zeitpunkt unbekannt'}
          </time>
          <span className="vgt-caption">
            {messages.length === 1 ? (
              t('single_message') || 'Einzelne Nachricht'
            ) : (
              <>
                <span className="vgt-numeric">{messages.length}</span>{' '}
                {t('thread_messages') || 'Nachrichten in diesem Thread'}
              </>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
