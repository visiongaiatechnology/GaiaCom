import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import * as gaiaCrypto from '../../crypto';
import { parseToGaiaID } from '../../utils/gaiaAddress';
import {
  MAX_MAIL_ATTACHMENT_BYTES,
  exceedsLimit,
  limitError
} from '../../utils/mediaLimits';
import { safeHttpUrl } from '../../utils/safeHttpUrl';
import MailEmptyState from './mail/MailEmptyState';
import MailReaderHeader from './mail/MailReaderHeader';
import MailMessage from './mail/MailMessage';
import MailLabelDialog from './mail/MailLabelDialog';
import MailSecurityNotice from './mail/MailSecurityNotice';
import {
  findContact,
  getThreadMessages,
  getThreadSecurity,
  parseMailboxLabels
} from './mail/mailUtils';

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

async function decryptChunkedAttachment(encryptedBlob, attachment, maxBytes = MAX_MAIL_ATTACHMENT_BYTES) {
  const chunks = Array.isArray(attachment.chunks)
    ? [...attachment.chunks].sort((a, b) => (a.index || 0) - (b.index || 0))
    : [];
  if (chunks.length === 0) {
    throw new Error('Attachment chunk metadata missing');
  }
  // SEC-FE FE-03: reject oversized envelopes before any AES-GCM work.
  if (exceedsLimit(encryptedBlob?.size, maxBytes)) {
    throw limitError('Der Anhang', maxBytes);
  }

  const rawKey = gaiaCrypto.hexToBytes(attachment.keyHex);
  const cryptoKey = await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
  let offset = 0;
  let plainTotal = 0;
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
    plainTotal += plainBuffer.byteLength || 0;
    if (exceedsLimit(plainTotal, maxBytes)) {
      throw limitError('Der Anhang', maxBytes);
    }
    decryptedParts.push(plainBuffer);
  }

  return new Blob(decryptedParts, { type: attachment.mimeType || 'application/octet-stream' });
}

function downloadJSON(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const [trustPassports, setTrustPassports] = useState({});
  const [attachmentError, setAttachmentError] = useState('');
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

  const fetchPassport = async (sender) => {
    if (!sender || trustPassports[sender]) return;
    try {
      const formatted = parseToGaiaID(sender);
      const passport = await api.getTrustPassport(formatted);
      if (passport) {
        setTrustPassports((prev) => ({ ...prev, [sender]: passport }));
      }
    } catch (_) {}
  };

  async function handleDownloadAttachment(attachment) {
    setAttachmentError('');
    try {
      if (attachment?.fileId && attachment?.keyHex) {
        const encryptedBlob = await api.downloadFileAttachment(attachment.fileId, { maxBytes: MAX_MAIL_ATTACHMENT_BYTES });
        if (exceedsLimit(encryptedBlob?.size, MAX_MAIL_ATTACHMENT_BYTES)) {
          throw limitError('Der Anhang', MAX_MAIL_ATTACHMENT_BYTES);
        }
        const plainBlob = attachment.encryptionMode === 'aes-gcm-chunked-v1'
          ? await decryptChunkedAttachment(encryptedBlob, attachment, MAX_MAIL_ATTACHMENT_BYTES)
          : await gaiaCrypto.decryptFileSymmetric(encryptedBlob, attachment.keyHex, attachment.ivHex);
        if (exceedsLimit(plainBlob?.size, MAX_MAIL_ATTACHMENT_BYTES)) {
          throw limitError('Der Anhang', MAX_MAIL_ATTACHMENT_BYTES);
        }
        downloadBlob(
          new Blob([plainBlob], { type: attachment.mimeType || 'application/octet-stream' }),
          attachment.name || attachment.fileName || 'gaiacom-attachment'
        );
        return;
      }
      if (attachment?.downloadUrl) {
        // SEC-FE FE-04: legacy SMTP attachments carry an externally influenced
        // URL; only http(s) without embedded credentials may be opened.
        const safeDownloadUrl = safeHttpUrl(attachment.downloadUrl);
        if (!safeDownloadUrl) {
          throw new Error('Der Anhangslink ist keine sichere HTTP(S)-Adresse und wird nicht geöffnet.');
        }
        window.open(safeDownloadUrl, '_blank', 'noopener,noreferrer');
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
      msgs.forEach((msg) => {
        if (msg.sender && !msg.isSmtp) {
          fetchPassport(msg.sender);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMail]);

  useEffect(() => {
    if (selectedMail) {
      const msgs = getThreadMessages(selectedMail);
      // By default, expand the latest message
      const latestMsg = msgs[msgs.length - 1];
      setExpandedMsgs({ [latestMsg.id]: true });

      // If we have selectedMailProof for a single mail, cache it
      if (selectedMailProof && selectedMail.id) {
        setMessageProofs((prev) => ({ ...prev, [selectedMail.id]: selectedMailProof }));
      }
    }
  }, [selectedMail, selectedMailProof]);

  const toggleExpand = async (msgId, isSmtp) => {
    const isNowExpanded = !expandedMsgs[msgId];
    setExpandedMsgs((prev) => ({ ...prev, [msgId]: isNowExpanded }));

    if (isNowExpanded && !isSmtp && !messageProofs[msgId]) {
      try {
        const proof = await api.getMessageProof(msgId);
        setMessageProofs((prev) => ({ ...prev, [msgId]: proof }));
      } catch (_) {}
    }
  };

  const submitNewLabel = async () => {
    const cleanName = newLabelName.trim();
    if (!cleanName) return;
    // New labels use the Aegis Sage pigment value instead of the legacy neon cyan.
    await saveLabel(cleanName, '#6fc3b2');
    setNewLabelName('');
    setLabelModalOpen(false);
  };

  const handleArchive = async () => {
    await updateMailboxState(selectedMail, { folder: 'archive', isArchived: true });
    setSelectedMail(null);
  };

  const handleDelete = async () => {
    await updateMailboxState(selectedMail, { folder: 'trash' });
    setSelectedMail(null);
  };

  const handleSpam = async () => {
    await updateMailboxState(selectedMail, { isSpam: true, folder: 'spam' });
    setSelectedMail(null);
  };

  const handleSnooze = async (hours) => {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    await snoozeMail(selectedMail, date);
    setSelectedMail(null);
  };

  const handleToggleLabel = async (labelName) => {
    const currentLabels = parseMailboxLabels(selectedMail?.mailbox?.labels);
    const nextLabels = currentLabels.includes(labelName)
      ? currentLabels.filter((entry) => entry !== labelName)
      : [...currentLabels, labelName];
    await updateMailboxState(selectedMail, { labels: nextLabels });
  };

  const handleDownloadProof = (proof, msgId) => {
    downloadJSON(`gaiaproof-${msgId}.json`, proof);
  };

  if (isComposing || currentMenu === 'dashboard' || currentMenu === 'chat' || currentMenu === 'profile' || currentMenu === 'groups' || currentMenu === 'vault' || currentMenu === 'gaiadrop' || currentMenu === 'network_health' || currentMenu === 'public_channels' || currentMenu === 'abuse_center' || currentMenu === 'security_center' || currentMenu === 'gsn') {
    return null;
  }

  if (!selectedMail) {
    return <MailEmptyState t={t} />;
  }

  const messages = getThreadMessages(selectedMail);
  const security = getThreadSecurity(messages, contacts);
  const loadedProofs = messages.filter((msg) => Boolean(messageProofs[msg.id])).length;

  return (
    <section className="vgt-mail-reader" aria-labelledby="vgt-mail-reader-subject">
      <MailReaderHeader
        selectedMail={selectedMail}
        messages={messages}
        security={security}
        contacts={contacts}
        labelsList={labelsList}
        proofCount={loadedProofs}
        onBack={() => setSelectedMail(null)}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onSpam={handleSpam}
        onSnooze={handleSnooze}
        onToggleLabel={handleToggleLabel}
        onCreateLabel={() => {
          setNewLabelName('');
          setLabelModalOpen(true);
        }}
        t={t}
      />

      <div className="vgt-mail-reader__scroll">
        {attachmentError ? (
          <MailSecurityNotice tone="danger" icon="alertOctagon" role="alert" title={t('attachments') || 'Anhänge'}>
            {attachmentError}
          </MailSecurityNotice>
        ) : null}

        <div className="vgt-mail-reader__thread">
          {messages.map((msg, index) => (
            <MailMessage
              key={msg.id || `mail-message-${index}`}
              msg={msg}
              index={index}
              contact={findContact(contacts, msg.sender)}
              isExpanded={Boolean(expandedMsgs[msg.id])}
              onToggle={() => toggleExpand(msg.id, msg.isSmtp)}
              trustPassport={trustPassports[msg.sender]}
              proof={messageProofs[msg.id]}
              activeIdentity={activeIdentity}
              onReply={handleReplyMail}
              onReplyAll={(message) => handleReplyMail(message, { replyAll: true })}
              onForward={(message) => handleReplyMail(message, { forward: true })}
              onExportDisclosure={handleExportDisclosurePackage}
              onReport={handleReportMail}
              onOpenContactProfile={openContactProfile}
              onDownloadAttachment={handleDownloadAttachment}
              onDownloadProof={handleDownloadProof}
              t={t}
            />
          ))}
        </div>
      </div>

      <MailLabelDialog
        open={labelModalOpen}
        value={newLabelName}
        onChange={setNewLabelName}
        onCancel={() => setLabelModalOpen(false)}
        onSave={submitNewLabel}
        t={t}
      />
    </section>
  );
};

export default ReaderPane;
