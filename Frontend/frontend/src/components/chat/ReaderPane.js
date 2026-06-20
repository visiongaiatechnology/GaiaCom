import React from 'react';
import Icons from '../common/Icons';
import { renderMarkdown } from '../../utils/markdown';

export const ReaderPane = ({
  selectedMail,
  selectedMailProof,
  activeIdentity,
  handleReplyMail,
  handleExportDisclosurePackage,
  handleReportMail,
  setSelectedMail,
  isComposing,
  currentMenu,
  openContactProfile,
  t
}) => {
  if (isComposing || currentMenu === 'chat' || currentMenu === 'profile' || currentMenu === 'groups') {
    return null;
  }

  if (!selectedMail) {
    return (
      <div className="empty-reader-pane">
        <h2>GaiaCOM Reader</h2>
        <p style={{ maxWidth: '380px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {t('select_mail_read') || 'Wähle eine Mail aus der Liste aus, um deren quantensichere Inhalte zu lesen, oder erstelle eine neue Nachricht.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="reader-header">
        <button type="button" className="mobile-back-btn" onClick={() => setSelectedMail(null)}>← {t('posteingang') || 'Mails'}</button>
        <div className="reader-meta-info">
          <h2>{selectedMail.subject}</h2>
          <div className="sender-address">
            {t('von') || 'Von'}: <button type="button" className="link-button" onClick={() => openContactProfile(selectedMail.sender)}>
              {selectedMail.senderGaia}
            </button>
          </div>
          <div className="recipient-address">
            An: <button type="button" className="link-button" onClick={() => openContactProfile(selectedMail.recipient)}>
              {selectedMail.recipientGaia}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="mail-time">{new Date(selectedMail.createdAt).toLocaleString()}</span>
          <button className="btn-action" onClick={() => handleReplyMail(selectedMail)}>
            {t('antworten') || 'Antworten'}
          </button>
          <button className="btn-action" onClick={() => handleExportDisclosurePackage(selectedMail)}>
            {t('export_disclosure') || 'Sicherheitsfall exportieren'}
          </button>
          {selectedMail.sender !== activeIdentity.GaiaID && selectedMail.sender !== activeIdentity.ID && (
            <button className="btn-action btn-danger" onClick={() => handleReportMail(selectedMail)}>
              {t('melden') || 'Melden'}
            </button>
          )}
        </div>
      </header>

      {/* Content Body */}
      <div className="reader-body">
        {/* Warnings */}
        {selectedMail.untrusted && (
          <div className="untrusted-mail-banner">
            <Icons.Alert />
            <div>
              <strong>{t('spam_warning_title') || 'SPAM/WARNUNG:'}</strong> {t('spam_warning_desc') || 'Der Absender dieser Mail befindet sich im Netzwerk-Quarantäne Status wegen Missbrauchs-Meldungen.'}
            </div>
          </div>
        )}
        {selectedMail.isSmtp && (
          <div className="smtp-security-banner">
            <Icons.Alert />
            <div>
              {t('smtp_security_warning') || 'Diese Mail wurde über das klassische, unverschlüsselte SMTP-Protokoll übertragen. Keine End-to-End-Verschlüsselung aktiv.'}
            </div>
          </div>
        )}

        {/* Text */}
        <p>{renderMarkdown(selectedMail.body)}</p>

        {/* GaiaProof Audit Trail */}
        {selectedMailProof && (
          <div className="glass-panel" style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0, 242, 254, 0.25)', background: 'rgba(0, 242, 254, 0.03)' }}>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🛡️ GaiaProof Audit Trail
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Message ID:</span>
                <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedMailProof.messageId}</code>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ciphertext Hash:</span>
                <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedMailProof.ciphertextHash}</code>
              </div>
              {selectedMailProof.senderSignature && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sender Signature:</span>
                  <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedMailProof.senderSignature}</code>
                </div>
              )}
              {selectedMailProof.envelopeHash && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Envelope Hash:</span>
                  <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedMailProof.envelopeHash}</code>
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Server Received:</span>
                <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedMailProof.serverReceivedAt || selectedMailProof.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                <span>✓ Kryptographischer Zustell- und Integritätsbeweis verifiziert.</span>
              </div>
            </div>
          </div>
        )}

        {/* Attachments rendering */}
        {selectedMail.attachments && selectedMail.attachments.length > 0 && (
          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
              {t('attachments') || 'Anhänge'} ({selectedMail.attachments.length})
            </h4>
            {selectedMail.attachments.map((att, idx) => (
              <div key={idx} className="attachment-file-pill" style={{ cursor: 'pointer' }} onClick={() => window.open(att.downloadUrl, '_blank')}>
                <Icons.Attachment />
                <span>{att.name} ({(att.size / 1024).toFixed(1)} KB)</span>
                <Icons.Download />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ReaderPane;
