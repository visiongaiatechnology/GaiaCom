import React from 'react';
import Icon from '../../ui/Icon';
import { renderMarkdown } from '../../../utils/markdown';
import MailIdentityGlyph from './MailIdentityGlyph';
import MailSecurityNotice from './MailSecurityNotice';
import MailAttachments from './MailAttachments';
import MailProofPanel from './MailProofPanel';
import { formatDateTime, formatIsoDateTime, getDisplayName } from './mailUtils';

function TrustPassport({ passport }) {
  const reputation =
    passport.reputationLabel || (passport.abuseScore?.score > 10 ? 'Suspicious' : 'Trusted');
  const reputationTone = reputation === 'Trusted' ? 'vgt-status--ok' : 'vgt-status--warn';
  const abuseScore = passport.abuseScore?.score ?? passport.AbuseScore ?? 0;
  const trustAge = passport.trustAgeDays ?? passport.TrustAgeDays ?? 0;

  return (
    <section className="vgt-mail-passport" aria-label="Trust Passport">
      <div className="vgt-mail-passport__head">
        <span className="vgt-mail-passport__label">
          <Icon name="fingerprint" size={14} />
          Trust Passport
        </span>
        <span className={`vgt-status ${reputationTone}`}>{reputation}</span>
      </div>
      <dl className="vgt-mail-passport__facts">
        <div className="vgt-mail-passport__fact">
          <dt>Abuse Score</dt>
          <dd className="vgt-numeric">{abuseScore}</dd>
        </div>
        <div className="vgt-mail-passport__fact">
          <dt>Trust Age</dt>
          <dd>
            <span className="vgt-numeric">{trustAge}</span> Tage
          </dd>
        </div>
      </dl>
      <p className="vgt-mail-passport__note">
        Reputationslabel aus dem Abuse Score abgeleitet. Keine zusätzliche Servergarantie.
      </p>
    </section>
  );
}

/**
 * One message inside a mail thread.
 *
 * Reading order is deliberate: the expanded message leads with the body text
 * (the actual mail), then the reply actions, then attachments, and only at the
 * end the collapsible security evidence (delivery path, quarantine/key-change
 * notices, trust passport and GaiaProof). In a single-message thread the
 * thread disclosure row is omitted entirely, because the reader header already
 * carries sender, subject, recipients and time — no duplicated header block.
 */
export default function MailMessage({
  msg,
  index,
  contact,
  isExpanded,
  onToggle,
  single = false,
  trustPassport,
  proof,
  activeIdentity,
  onReply,
  onReplyAll,
  onForward,
  onExportDisclosure,
  onReport,
  onOpenContactProfile,
  onDownloadAttachment,
  onDownloadProof,
  t
}) {
  const senderAddress = msg.senderGaia || msg.sender || '';
  const senderName = getDisplayName(contact, senderAddress) || t('unknown_sender') || 'Unbekannt';
  const recipientAddress = msg.recipientGaia || msg.recipient || '';
  const sentAt = msg.createdAt || msg.timestamp;
  const sentLabel = formatDateTime(sentAt);
  const hasKeyChanged = Array.isArray(contact?.keyHistory) && contact.keyHistory.length > 1;
  const isOwnMessage = Boolean(
    activeIdentity && (msg.sender === activeIdentity.GaiaID || msg.sender === activeIdentity.ID)
  );
  const bodyText = typeof msg.body === 'string' ? msg.body.trim() : '';
  const snippet = bodyText ? bodyText.slice(0, 140) : '';
  const panelId = `vgt-mail-msg-panel-${msg.id || index}`;
  const senderId = `vgt-mail-msg-sender-${msg.id || index}`;
  const expanded = single || isExpanded;
  const securityChips = (
    <>
      {msg.isSmtp ? (
        <span className="vgt-status vgt-status--warn">{t('smtp_short') || 'SMTP'}</span>
      ) : (
        <span className="vgt-status vgt-status--ok">{t('e2e') || 'E2E'}</span>
      )}
      {msg.untrusted ? (
        <span className="vgt-status vgt-status--danger">
          {t('quarantine') || 'Quarantäne'}
        </span>
      ) : null}
      {hasKeyChanged ? (
        <span className="vgt-status vgt-status--warn">
          {t('key_changed') || 'Schlüsselwechsel'}
        </span>
      ) : null}
    </>
  );

  return (
    <article className={`vgt-mail-msg${expanded ? ' is-open' : ''}${single ? ' vgt-mail-msg--single' : ''}`}>
      {!single ? (
        <h3 className="vgt-mail-msg__heading">
          <button
            type="button"
            className="vgt-mail-msg__disclosure"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
          >
            <MailIdentityGlyph name={senderName} address={senderAddress} size="sm" />
            <span className="vgt-mail-msg__summary">
              <span className="vgt-mail-msg__sender" id={senderId}>
                {senderName}
              </span>
              <span className="vgt-mail-msg__snippet">
                {expanded
                  ? senderAddress
                  : snippet || t('no_preview') || 'Keine Textvorschau'}
              </span>
            </span>
            <span className="vgt-mail-msg__signals">
              {securityChips}
              <time className="vgt-mail-time vgt-numeric" dateTime={formatIsoDateTime(sentAt)}>
                {sentLabel || t('time_unknown') || 'Zeitpunkt unbekannt'}
              </time>
              <span className="vgt-mail-msg__chevron" aria-hidden="true">
                <Icon name="chevronDown" size={16} />
              </span>
            </span>
          </button>
        </h3>
      ) : null}

      {expanded ? (
        <div className="vgt-mail-msg__panel" id={panelId} aria-labelledby={single ? undefined : senderId}>
          <div className="vgt-mail-msg__body">
            {bodyText ? (
              renderMarkdown(msg.body)
            ) : (
              <p className="vgt-mail-msg__body-empty">
                {t('mail_empty_body') || 'Diese Nachricht enthält keinen Text.'}
              </p>
            )}
          </div>

          <div className="vgt-mail-msg__actions" role="group" aria-label={t('message_actions') || 'Nachrichten-Aktionen'}>
            <button type="button" className="btn-primary vgt-mail-msg__action" onClick={() => onReply(msg)}>
              <Icon name="reply" size={16} />
              {t('antworten') || 'Antworten'}
            </button>
            <button type="button" className="btn-ghost vgt-mail-msg__action" onClick={() => onReplyAll(msg)}>
              <Icon name="users" size={16} />
              {t('reply_all') || 'Allen antworten'}
            </button>
            <button type="button" className="btn-ghost vgt-mail-msg__action" onClick={() => onForward(msg)}>
              <Icon name="arrowRight" size={16} />
              {t('forward') || 'Weiterleiten'}
            </button>
            <button type="button" className="btn-ghost vgt-mail-msg__action" onClick={() => onExportDisclosure(msg)}>
              <Icon name="export" size={16} />
              {t('export_disclosure') || 'Sicherheitsfall exportieren'}
            </button>
            {!isOwnMessage ? (
              <button type="button" className="btn-ghost vgt-mail-msg__action vgt-mail-msg__action--danger" onClick={() => onReport(msg)}>
                <Icon name="alertTriangle" size={16} />
                {t('melden') || 'Melden'}
              </button>
            ) : null}
          </div>

          <MailAttachments
            attachments={msg.attachments}
            msgId={msg.id || index}
            onDownload={onDownloadAttachment}
            t={t}
          />

          <details className="vgt-mail-msg__security">
            <summary className="vgt-mail-msg__security-summary">
              <Icon name="shieldCheck" size={15} />
              <span className="vgt-label">{t('security_and_proof') || 'Sicherheit & Nachweis'}</span>
              <span className="vgt-mail-msg__security-chips">
                {msg.untrusted ? (
                  <span className="vgt-status vgt-status--danger">
                    {t('quarantine') || 'Quarantäne'}
                  </span>
                ) : null}
                {msg.isSmtp ? (
                  <span className="vgt-status vgt-status--warn">{t('smtp_short') || 'SMTP'}</span>
                ) : null}
                {hasKeyChanged ? (
                  <span className="vgt-status vgt-status--warn">
                    {t('key_changed') || 'Schlüsselwechsel'}
                  </span>
                ) : null}
              </span>
              <span className="vgt-mail-msg__security-chevron" aria-hidden="true">
                <Icon name="chevronDown" size={15} />
              </span>
            </summary>

            <div className="vgt-mail-msg__security-body">
              <p className="vgt-mail-msg__meta">
                <span className="vgt-mail-msg__meta-part">
                  <span className="vgt-label">{t('von') || 'Von'}</span>
                  <button
                    type="button"
                    className="vgt-mail-link"
                    onClick={() => onOpenContactProfile(msg.sender)}
                  >
                    {senderAddress || senderName}
                  </button>
                </span>
                {recipientAddress ? (
                  <span className="vgt-mail-msg__meta-part">
                    <span className="vgt-label">{t('an') || 'An'}</span>
                    <span>{recipientAddress}</span>
                  </span>
                ) : null}
                <span className="vgt-mail-msg__meta-part">
                  <span className="vgt-label">{t('time') || 'Zeit'}</span>
                  <time className="vgt-numeric" dateTime={formatIsoDateTime(sentAt)}>
                    {sentLabel || t('time_unknown') || 'Zeitpunkt unbekannt'}
                  </time>
                </span>
              </p>

              {msg.untrusted ? (
                <MailSecurityNotice
                  tone="danger"
                  role="alert"
                  title={t('spam_warning_title') || 'Spam-Warnung'}
                >
                  {t('spam_warning_desc') ||
                    'Diese Nachricht hat verdächtige Reputationssignale.'}
                </MailSecurityNotice>
              ) : null}

              {msg.isSmtp ? (
                <MailSecurityNotice
                  tone="warning"
                  icon="shieldOff"
                  role="alert"
                  title={t('smtp_security_title') || 'Nicht Ende-zu-Ende verschlüsselt'}
                >
                  {t('smtp_security_warning') ||
                    'Diese Mail wurde über das klassische SMTP-Protokoll übertragen. Keine Ende-zu-Ende-Verschlüsselung aktiv.'}{' '}
                  {t('smtp_reply_warning') ||
                    'Antworten werden ebenfalls unverschlüsselt über SMTP übertragen.'}
                </MailSecurityNotice>
              ) : (
                <p className="vgt-mail-msg__delivery">
                  <Icon name="shieldCheck" size={16} />
                  <span>
                    {t('mail_delivery_gaia') ||
                      'Zugestellt über das GaiaCOM-Netz. Kein SMTP-Fallback.'}
                  </span>
                </p>
              )}

              {hasKeyChanged ? (
                <MailSecurityNotice tone="warning" icon="key" role="alert" title="Sicherheitshinweis">
                  {t('key_changed_warning_desc') ||
                    'Der Identitätsschlüssel dieses Absenders wurde aktualisiert oder weicht von dem zuvor bekannten ab. Bitte bestätigen Sie den Fingerprint über einen anderen sicheren Kommunikationsweg.'}
                </MailSecurityNotice>
              ) : null}

              {trustPassport && !msg.isSmtp ? <TrustPassport passport={trustPassport} /> : null}

              {!msg.isSmtp && proof ? (
                <MailProofPanel proof={proof} msgId={msg.id} onDownload={onDownloadProof} t={t} />
              ) : null}
            </div>
          </details>
        </div>
      ) : null}
    </article>
  );
}
