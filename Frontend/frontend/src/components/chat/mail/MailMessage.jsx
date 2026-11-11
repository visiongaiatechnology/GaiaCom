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
 * One message inside a mail thread: collapsed summary row plus the expanded
 * reading surface with routing data, security context, proof and attachments.
 * All actions call the handlers that were already wired in AppMainContent.
 */
export default function MailMessage({
  msg,
  index,
  contact,
  isExpanded,
  onToggle,
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

  return (
    <article className={`vgt-mail-msg${isExpanded ? ' is-open' : ''}`}>
      <h3 className="vgt-mail-msg__heading">
        <button
          type="button"
          className="vgt-mail-msg__disclosure"
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <MailIdentityGlyph name={senderName} address={senderAddress} size="sm" />
          <span className="vgt-mail-msg__summary">
            <span className="vgt-mail-msg__sender" id={senderId}>
              {senderName}
            </span>
            <span className="vgt-mail-msg__snippet">
              {isExpanded
                ? senderAddress
                : snippet || t('no_preview') || 'Keine Textvorschau'}
            </span>
          </span>
          <span className="vgt-mail-msg__signals">
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
            <time className="vgt-mail-time vgt-numeric" dateTime={formatIsoDateTime(sentAt)}>
              {sentLabel || t('time_unknown') || 'Zeitpunkt unbekannt'}
            </time>
            <span className="vgt-mail-msg__chevron" aria-hidden="true">
              <Icon name="chevronDown" size={16} />
            </span>
          </span>
        </button>
      </h3>

      {isExpanded ? (
        <div className="vgt-mail-msg__panel" id={panelId} aria-labelledby={senderId}>
          <dl className="vgt-mail-routing">
            <div className="vgt-mail-routing__row">
              <dt>{t('von') || 'Von'}</dt>
              <dd>
                <button
                  type="button"
                  className="vgt-mail-link"
                  onClick={() => onOpenContactProfile(msg.sender)}
                >
                  {senderName}
                </button>
                {senderAddress && senderName !== senderAddress ? (
                  <span className="vgt-mail-routing__address vgt-mono">{senderAddress}</span>
                ) : null}
              </dd>
            </div>
            <div className="vgt-mail-routing__row">
              <dt>{t('an') || 'An'}</dt>
              <dd>
                {recipientAddress ? (
                  <button
                    type="button"
                    className="vgt-mail-link"
                    onClick={() => onOpenContactProfile(msg.recipient)}
                  >
                    {recipientAddress}
                  </button>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="vgt-mail-routing__row">
              <dt>{t('time') || 'Zeit'}</dt>
              <dd>
                <time className="vgt-numeric" dateTime={formatIsoDateTime(sentAt)}>
                  {sentLabel || t('time_unknown') || 'Zeitpunkt unbekannt'}
                </time>
              </dd>
            </div>
          </dl>

          <div className="vgt-mail-msg__actions" role="group" aria-label={t('message_actions') || 'Nachrichten-Aktionen'}>
            <button type="button" className="btn-primary vgt-mail-msg__action" onClick={() => onReply(msg)}>
              <Icon name="reply" size={16} />
              {t('antworten') || 'Antworten'}
            </button>
            <button type="button" className="btn-secondary vgt-mail-msg__action" onClick={() => onReplyAll(msg)}>
              <Icon name="users" size={16} />
              {t('reply_all') || 'Allen antworten'}
            </button>
            <button type="button" className="btn-secondary vgt-mail-msg__action" onClick={() => onForward(msg)}>
              <Icon name="arrowRight" size={16} />
              {t('forward') || 'Weiterleiten'}
            </button>
            <button type="button" className="btn-secondary vgt-mail-msg__action" onClick={() => onExportDisclosure(msg)}>
              <Icon name="export" size={16} />
              {t('export_disclosure') || 'Sicherheitsfall exportieren'}
            </button>
            {!isOwnMessage ? (
              <button type="button" className="btn-danger vgt-mail-msg__action" onClick={() => onReport(msg)}>
                <Icon name="alertTriangle" size={16} />
                {t('melden') || 'Melden'}
              </button>
            ) : null}
          </div>

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

          <div className="vgt-mail-msg__body">
            {bodyText ? (
              renderMarkdown(msg.body)
            ) : (
              <p className="vgt-mail-msg__body-empty">
                {t('mail_empty_body') || 'Diese Nachricht enthält keinen Text.'}
              </p>
            )}
          </div>

          {!msg.isSmtp && proof ? (
            <MailProofPanel proof={proof} msgId={msg.id} onDownload={onDownloadProof} t={t} />
          ) : null}

          <MailAttachments
            attachments={msg.attachments}
            msgId={msg.id || index}
            onDownload={onDownloadAttachment}
            t={t}
          />
        </div>
      ) : null}
    </article>
  );
}
