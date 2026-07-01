// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useEffect } from 'react';
import Icons from '../common/Icons';
import { renderMarkdown } from '../../utils/markdown';
import * as api from '../../api';
import * as gaiaCrypto from '../../crypto';
import { parseToGaiaID } from '../../utils/gaiaAddress';
import { safeJsonParse } from '../../utils/safeJson';

function parseMailboxLabels(labels) {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === 'string') {
    const parsed = safeJsonParse(labels, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'gaiacom-attachment';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function decryptChunkedAttachment(encryptedBlob, attachment) {
  const chunks = Array.isArray(attachment.chunks)
    ? [...attachment.chunks].sort((a, b) => (a.index || 0) - (b.index || 0))
    : [];
  if (chunks.length === 0) {
    throw new Error('Attachment chunk metadata missing');
  }

  const rawKey = gaiaCrypto.hexToBytes(attachment.keyHex);
  const cryptoKey = await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
  let offset = 0;
  const decryptedParts = [];

  for (const chunk of chunks) {
    const cipherSize = Number(chunk.cipherSize || 0);
    if (!cipherSize || !chunk.ivHex) {
      throw new Error('Attachment chunk metadata invalid');
    }
    const encryptedPart = encryptedBlob.slice(offset, offset + cipherSize);
    offset += cipherSize;
    const encryptedBuffer = await encryptedPart.arrayBuffer();
    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: gaiaCrypto.hexToBytes(chunk.ivHex) },
      cryptoKey,
      encryptedBuffer
    );
    decryptedParts.push(plainBuffer);
  }

  return new Blob(decryptedParts, { type: attachment.mimeType || 'application/octet-stream' });
}

export const ReaderPane = ({
  selectedMail,
  selectedMailProof,
  activeIdentity,
  contacts,
  handleReplyMail,
  handleExportDisclosurePackage,
  handleReportMail,
  setSelectedMail,
  isComposing,
  currentMenu,
  openContactProfile,
  t,
  updateMailboxState,
  snoozeMail,
  labelsList,
  saveLabel
}) => {
  const [expandedMsgs, setExpandedMsgs] = useState({});
  const [messageProofs, setMessageProofs] = useState({});
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [trustPassports, setTrustPassports] = useState({});
  const [attachmentError, setAttachmentError] = useState('');
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

  const submitNewLabel = async () => {
    const cleanName = newLabelName.trim();
    if (!cleanName) return;
    await saveLabel(cleanName, '#00f2fe');
    setNewLabelName('');
    setLabelModalOpen(false);
    setShowLabelMenu(false);
  };

  async function handleDownloadAttachment(attachment) {
    setAttachmentError('');
    try {
      if (attachment?.fileId && attachment?.keyHex) {
        const encryptedBlob = await api.downloadFileAttachment(attachment.fileId);
        const plainBlob = attachment.encryptionMode === 'aes-gcm-chunked-v1'
          ? await decryptChunkedAttachment(encryptedBlob, attachment)
          : await gaiaCrypto.decryptFileSymmetric(encryptedBlob, attachment.keyHex, attachment.ivHex);
        downloadBlob(
          new Blob([plainBlob], { type: attachment.mimeType || 'application/octet-stream' }),
          attachment.name || attachment.fileName || 'gaiacom-attachment'
        );
        return;
      }
      if (attachment?.downloadUrl) {
        window.open(attachment.downloadUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      throw new Error('Attachment download metadata missing');
    } catch (err) {
      setAttachmentError(err.message || 'Attachment konnte nicht entschlüsselt werden.');
    }
  }

  useEffect(() => {
    if (selectedMail) {
      const msgs = selectedMail.messages || [selectedMail];
      msgs.forEach(msg => {
        if (msg.sender && !msg.isSmtp) {
          fetchPassport(msg.sender);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMail]);

  const fetchPassport = async (sender) => {
    if (!sender || trustPassports[sender]) return;
    try {
      const formatted = parseToGaiaID(sender);
      const passport = await api.getTrustPassport(formatted);
      if (passport) {
        setTrustPassports(prev => ({ ...prev, [sender]: passport }));
      }
    } catch (_) {}
  };

  const downloadJSON = (filename, value) => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (selectedMail) {
      const msgs = selectedMail.messages || [selectedMail];
      // By default, expand the latest message
      const latestMsg = msgs[msgs.length - 1];
      setExpandedMsgs({ [latestMsg.id]: true });

      // If we have selectedMailProof for a single mail, cache it
      if (selectedMailProof && selectedMail.id) {
        setMessageProofs(prev => ({ ...prev, [selectedMail.id]: selectedMailProof }));
      }
    }
  }, [selectedMail, selectedMailProof]);

  if (isComposing || currentMenu === 'dashboard' || currentMenu === 'chat' || currentMenu === 'profile' || currentMenu === 'groups' || currentMenu === 'vault' || currentMenu === 'gaiadrop' || currentMenu === 'network_health' || currentMenu === 'public_channels' || currentMenu === 'abuse_center' || currentMenu === 'security_center' || currentMenu === 'gsn') {
    return null;
  }

  if (!selectedMail) {
    return (
      <div className="empty-reader-pane">
        <h2>{t('gaiacom_reader') || 'GaiaCOM Reader'}</h2>
        <p style={{ maxWidth: '380px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {t('select_mail_read') || 'Wähle eine Mail aus der Liste aus, um deren quantensichere Inhalte zu lesen, oder erstelle eine neue Nachricht.'}
        </p>
      </div>
    );
  }

  const messages = selectedMail.messages || [selectedMail];

  const toggleExpand = async (msgId, isSmtp) => {
    const isNowExpanded = !expandedMsgs[msgId];
    setExpandedMsgs(prev => ({ ...prev, [msgId]: isNowExpanded }));

    if (isNowExpanded && !isSmtp && !messageProofs[msgId]) {
      try {
        const proof = await api.getMessageProof(msgId);
        setMessageProofs(prev => ({ ...prev, [msgId]: proof }));
      } catch (_) {}
    }
  };

  return (
    <>
      <header className="reader-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button type="button" className="mobile-back-btn" onClick={() => setSelectedMail(null)}>← {t('posteingang') || 'Mails'}</button>
          
          <div className="reader-toolbar" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-action"
              onClick={async () => {
                await updateMailboxState(selectedMail, { folder: 'archive', isArchived: true });
                setSelectedMail(null);
              }}
              title="Archivieren"
            >
              📁 Archiv
            </button>
            <button
              type="button"
              className="btn-action"
              onClick={async () => {
                await updateMailboxState(selectedMail, { folder: 'trash' });
                setSelectedMail(null);
              }}
              title="Löschen"
            >
              🗑️ Löschen
            </button>
            <button
              type="button"
              className="btn-action"
              onClick={async () => {
                await updateMailboxState(selectedMail, { isSpam: true, folder: 'spam' });
                setSelectedMail(null);
              }}
              title="Spam melden"
            >
              ⚠️ Spam
            </button>
            
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn-action"
                onClick={() => {
                  setShowSnoozeMenu(!showSnoozeMenu);
                  setShowLabelMenu(false);
                }}
                title="Snooze"
              >
                ⏱ Snooze
              </button>
              {showSnoozeMenu && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 100,
                  background: 'var(--card-bg, #101014)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px 0',
                  minWidth: '150px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  marginTop: '4px'
                }}>
                  {[
                    { label: 'In 1 Stunde', value: 1 },
                    { label: 'Morgen früh', value: 24 },
                    { label: 'Nächste Woche', value: 168 }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => e.target.style.background = 'transparent'}
                      onClick={async () => {
                        const date = new Date();
                        date.setHours(date.getHours() + opt.value);
                        await snoozeMail(selectedMail, date);
                        setSelectedMail(null);
                        setShowSnoozeMenu(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn-action"
                onClick={() => {
                  setShowLabelMenu(!showLabelMenu);
                  setShowSnoozeMenu(false);
                }}
                title="Label Pick"
              >
                🏷️ Label
              </button>
              {showLabelMenu && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 100,
                  background: 'var(--card-bg, #101014)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px 0',
                  minWidth: '160px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  marginTop: '4px'
                }}>
                  {labelsList && labelsList.map(lbl => {
                    const currentBox = selectedMail.mailbox || {};
                    const currentLabels = parseMailboxLabels(currentBox.labels);
                    const hasLabel = currentLabels.includes(lbl.name);
                    return (
                      <button
                        key={lbl.id || lbl.name}
                        type="button"
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 12px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: hasLabel ? 'var(--accent-cyan)' : 'var(--text-primary)',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                        onClick={async () => {
                          let nextLabels;
                          if (hasLabel) {
                            nextLabels = currentLabels.filter(l => l !== lbl.name);
                          } else {
                            nextLabels = [...currentLabels, lbl.name];
                          }
                          await updateMailboxState(selectedMail, { labels: nextLabels });
                        }}
                      >
                        {hasLabel ? '✓ ' : ''}{lbl.name}
                      </button>
                    );
                  })}
                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                  <button
                    type="button"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                    onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                    onClick={() => {
                      setNewLabelName('');
                      setLabelModalOpen(true);
                    }}
                  >
                    + Neues Label...
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="reader-meta-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{selectedMail.subject}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {messages.length === 1 ? 'Einzelne Nachricht' : `${messages.length} Nachrichten in diesem Thread`}
          </span>
        </div>
      </header>

      <div className="reader-body" style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => {
          const isExpanded = !!expandedMsgs[msg.id];
          const proof = messageProofs[msg.id];

          // Check if sender key has changed in history
          const contact = contacts?.find(c => c.gaiaID === msg.sender || c.ID === msg.sender);
          const keyHistory = contact?.keyHistory || [];
          const hasKeyChanged = keyHistory.length > 1;

          return (
            <div
              key={msg.id}
              className="glass-panel"
              style={{
                borderRadius: '8px',
                border: isExpanded ? '1px solid rgba(0, 242, 254, 0.25)' : '1px solid var(--border-color)',
                background: isExpanded ? 'rgba(20, 20, 25, 0.7)' : 'rgba(10, 10, 12, 0.4)',
                boxShadow: isExpanded ? '0 4px 20px rgba(0, 242, 254, 0.05)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Accordion Header */}
              <div
                onClick={() => toggleExpand(msg.id, msg.isSmtp)}
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {msg.senderGaia}
                    </span>
                    {!isExpanded && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {msg.body && msg.body.length > 80 ? msg.body.substring(0, 80) + '...' : msg.body}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {msg.isSmtp ? (
                    <span style={{ background: 'rgba(255, 59, 48, 0.1)', color: 'var(--danger)', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                      ⚠️ SMTP Legacy
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                      🛡️ GaiaSecure
                    </span>
                  )}
                  {hasKeyChanged && (
                    <span style={{ background: 'rgba(241, 196, 15, 0.15)', color: 'var(--warning)', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }} title="Identitätsschlüssel geändert">
                      ⚠️ Schlüssel Geändert
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Accordion Body */}
              {isExpanded && (
                <div style={{ padding: '20px' }}>
                  {/* Sender & Recipient Metadata */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>{t('von') || 'Von'}:</strong>{' '}
                        <button type="button" className="link-button" onClick={(e) => { e.stopPropagation(); openContactProfile(msg.sender); }}>
                          {msg.senderGaia}
                        </button>
                      </div>
                      <div>
                        <strong>{t('an') || 'An'}:</strong>{' '}
                        <button type="button" className="link-button" onClick={(e) => { e.stopPropagation(); openContactProfile(msg.recipient); }}>
                          {msg.recipientGaia}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button className="btn-action" onClick={() => handleReplyMail(msg)}>
                        {t('antworten') || 'Antworten'}
                      </button>
                      <button className="btn-action" onClick={() => handleReplyMail(msg, { replyAll: true })}>
                        Reply All
                      </button>
                      <button className="btn-action" onClick={() => handleReplyMail(msg, { forward: true })}>
                        Forward
                      </button>
                      <button className="btn-action" onClick={() => handleExportDisclosurePackage(msg)}>
                        {t('export_disclosure') || 'Sicherheitsfall exportieren'}
                      </button>
                      {msg.sender !== activeIdentity.GaiaID && msg.sender !== activeIdentity.ID && (
                        <button className="btn-action btn-danger" onClick={() => handleReportMail(msg)}>
                          {t('melden') || 'Melden'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Trust Passport Card */}
                  {(() => {
                    const passport = trustPassports[msg.sender];
                    if (!passport || msg.isSmtp) return null;
                    const reputation = passport.reputationLabel || (passport.abuseScore?.score > 10 ? 'Suspicious' : 'Trusted');
                    const abuseScoreVal = passport.abuseScore?.score ?? passport.AbuseScore ?? 0;
                    const trustAgeVal = passport.trustAgeDays ?? passport.TrustAgeDays ?? 0;
                    return (
                      <div className="trust-passport-card" style={{
                        marginBottom: '16px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 242, 254, 0.15)',
                        background: 'rgba(0, 242, 254, 0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase' }}>🛡️ Trust Passport</span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: reputation === 'Trusted' ? 'rgba(46,204,113,0.15)' : 'rgba(230,126,34,0.15)',
                            color: reputation === 'Trusted' ? 'var(--success)' : 'var(--warning)'
                          }}>
                            {reputation}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <div><strong>Abuse Score:</strong> {abuseScoreVal}</div>
                          <div><strong>Trust Age:</strong> {trustAgeVal} Tage</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Warning Banners */}
                  {msg.untrusted && (
                    <div className="untrusted-mail-banner" style={{ marginBottom: '16px' }}>
                      <Icons.Alert />
                      <div>
                        <strong>{t('spam_warning_title') || 'SPAM/WARNUNG:'}</strong> {t('spam_warning_desc') || 'Der Absender dieser Mail befindet sich im Netzwerk-Quarantäne Status wegen Missbrauchs-Meldungen.'}
                      </div>
                    </div>
                  )}
                  {msg.isSmtp && (
                    <div className="smtp-security-banner" style={{ marginBottom: '16px' }}>
                      <Icons.Alert />
                      <div>
                        {t('smtp_security_warning') || 'Diese Mail wurde über das klassische, unverschlüsselte SMTP-Protokoll übertragen. Keine End-to-End-Verschlüsselung aktiv.'}
                      </div>
                    </div>
                  )}
                  {hasKeyChanged && (
                    <div className="untrusted-mail-banner" style={{ marginBottom: '16px', borderColor: 'var(--warning)', background: 'rgba(241, 196, 15, 0.05)' }}>
                      <Icons.Alert />
                      <div>
                        <strong>⚠️ {t('key_changed_warning_title') || 'SICHERHEITSHINWEIS:'}</strong> {t('key_changed_warning_desc') || 'Der Identitätsschlüssel dieses Absenders wurde aktualisiert oder weicht von dem zuvor bekannten ab. Bitte bestätigen Sie den Fingerprint über einen anderen sicheren Kommunikationsweg.'}
                      </div>
                    </div>
                  )}

                  {msg.isSmtp && (
                    <div className="glass-panel" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255, 59, 48, 0.25)', background: 'rgba(255, 59, 48, 0.02)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                        ⚠️ <strong>Warnung:</strong> Wenn Sie auf diese Mail antworten, wird die Nachricht unverschlüsselt über das öffentliche SMTP-Netzwerk übertragen.
                      </span>
                    </div>
                  )}
                  {!msg.isSmtp && (
                    <div className="glass-panel" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(46, 204, 113, 0.25)', background: 'rgba(46, 204, 113, 0.02)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                        🛡️ <strong>E2E Quanten-Resistent:</strong> Hybrid-Verschlüsselung aktiv (ML-KEM-768 + X25519 + AES-256-GCM). Der Server hat keinen Zugriff auf den Klartext dieser Nachricht.
                      </span>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="mail-content-text" style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
                    {renderMarkdown(msg.body)}
                  </div>

                  {/* GaiaProof Audit Trail */}
                  {!msg.isSmtp && proof && (
                    <div className="glass-panel" style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0, 242, 254, 0.25)', background: 'rgba(0, 242, 254, 0.03)' }}>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🛡️ GaiaProof Audit Trail
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{t('message_id') || 'Message ID'}:</span>
                          <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{proof.messageId}</code>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{t('ciphertext_hash') || 'Ciphertext Hash'}:</span>
                          <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{proof.ciphertextHash}</code>
                        </div>
                        {proof.senderSignature && (
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{t('sender_signature') || 'Sender Signature'}:</span>
                            <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{proof.senderSignature}</code>
                          </div>
                        )}
                        {proof.envelopeHash && (
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{t('envelope_hash') || 'Envelope Hash'}:</span>
                            <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{proof.envelopeHash}</code>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{t('server_received') || 'Server Received'}:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{new Date(proof.serverReceivedAt || proof.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                          <span>✓ Kryptographischer Zustell- und Integritätsbeweis verifiziert.</span>
                        </div>
                        
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ marginTop: '10px', fontSize: '0.75rem', padding: '4px 8px', cursor: 'pointer' }}
                          onClick={() => {
                            downloadJSON(`gaiaproof-${msg.id}.json`, proof);
                          }}
                        >
                          📥 Download GaiaProof (.json)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                      <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                        {t('attachments') || 'Anhänge'} ({msg.attachments.length})
                      </h5>
                      {attachmentError && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '8px' }}>
                          {attachmentError}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {msg.attachments.map((att, idx) => (
                          <button type="button" key={idx} className="attachment-file-pill" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--border-color)', maxWidth: 'fit-content', color: 'var(--text-primary)' }} onClick={() => handleDownloadAttachment(att)}>
                            <Icons.Attachment />
                            <span style={{ fontSize: '0.8rem' }}>{att.name} ({(att.size / 1024).toFixed(1)} KB)</span>
                            <Icons.Download />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {labelModalOpen && (
        <div className="gsn-report-overlay" style={{ position: 'fixed', inset: 0, zIndex: 25000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel gsn-report-dialog">
            <h3>Neues Label</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                type="text"
                className="input-field"
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                maxLength={40}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setLabelModalOpen(false)}>
                  Abbrechen
                </button>
                <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={submitNewLabel} disabled={!newLabelName.trim()}>
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReaderPane;
