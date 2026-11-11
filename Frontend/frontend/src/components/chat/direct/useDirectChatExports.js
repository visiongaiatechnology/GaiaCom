import { useState } from 'react';
import * as api from '../../../api';
import * as crypto from '../../../crypto';
import { assertSecureExportClean, sanitizeSecureExport } from '../../../utils/secureExport';

export const REPORT_COMMENT_LIMIT = 8000;

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trust and data-egress flows of a direct conversation: abuse report,
 * password-encrypted local export and the signed GaiaProof package.
 * API calls and payload shapes are unchanged from the legacy pane.
 */
export default function useDirectChatExports({ activeChatContact, activeIdentity, visibleMessages, triggerAlert, t }) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('harassment');
  const [reportSeverity, setReportSeverity] = useState('medium');
  const [reportComment, setReportComment] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  const [exportPasswordModalOpen, setExportPasswordModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportBusy, setExportBusy] = useState(false);

  const [gaiaProofConfirmOpen, setGaiaProofConfirmOpen] = useState(false);

  const openReportContactModal = () => {
    setReportCategory('harassment');
    setReportSeverity('medium');
    setReportComment('');
    setReportModalOpen(true);
  };

  const submitContactReport = async () => {
    if (!activeIdentity || !activeChatContact) return;
    const comment = reportComment.trim();
    if (comment.length > REPORT_COMMENT_LIMIT) {
      triggerAlert?.('Meldung zu lang', `Maximal ${REPORT_COMMENT_LIMIT} Zeichen.`, 'warning');
      return;
    }
    setReportBusy(true);
    try {
      await api.submitAbuseReport(
        activeIdentity.ID,
        'user',
        activeChatContact.ID,
        reportCategory,
        reportSeverity,
        null,
        comment
      );
      setReportModalOpen(false);
      triggerAlert?.(t('success') || 'Erfolg', t('report_success') || 'Kontakt wurde erfolgreich gemeldet.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('report_failed') || 'Fehler beim Melden: ') + err.message, 'danger');
    } finally {
      setReportBusy(false);
    }
  };

  const openEncryptedExportModal = () => {
    setExportPassword('');
    setExportPasswordModalOpen(true);
  };

  const submitEncryptedExport = async () => {
    const password = exportPassword.trim();
    if (!password) {
      triggerAlert?.('Export blockiert', 'Bitte gib ein Export-Passwort ein.', 'warning');
      return;
    }
    setExportBusy(true);
    try {
      const envelope = await crypto.encryptLocalRecord(visibleMessages, password);
      downloadJSON(`chatexport-${activeChatContact.displayName || 'chat'}.json`, envelope);
      setExportPasswordModalOpen(false);
      setExportPassword('');
      triggerAlert?.(t('success') || 'Erfolg', t('export_success') || 'Chat wurde erfolgreich verschlüsselt exportiert.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('export_failed') || 'Export failed: ') + err.message, 'danger');
    } finally {
      setExportBusy(false);
    }
  };

  const submitGaiaProofExport = async () => {
    setGaiaProofConfirmOpen(false);
    try {
      const exportedMessages = [];
      for (const message of visibleMessages) {
        let proof = null;
        if (message.id) {
          try {
            proof = await api.getMessageProof(message.id);
          } catch (_) {}
        }
        exportedMessages.push({
          id: message.id,
          sender: message.sender,
          recipient: message.recipient,
          body: message.body,
          timestamp: message.timestamp,
          attachments: message.attachments,
          proof
        });
      }

      const gaiaProofPackage = {
        version: 'gaiaproof-chat-v1',
        exportedAt: new Date().toISOString(),
        chatPartner: activeChatContact.gaiaID,
        chatPartnerPublicKey: activeChatContact.publicKey,
        messages: exportedMessages
      };

      downloadJSON(
        `gaiaproof-chat-${activeChatContact.displayName || 'chat'}.json`,
        assertSecureExportClean(sanitizeSecureExport(gaiaProofPackage))
      );
      triggerAlert?.(t('success') || 'Erfolg', t('gaiaproof_export_success') || 'GaiaProof-Paket wurde erfolgreich exportiert.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('gaiaproof_export_failed') || 'GaiaProof-Export failed: ') + err.message, 'danger');
    }
  };

  return {
    report: {
      open: reportModalOpen,
      category: reportCategory,
      setCategory: setReportCategory,
      severity: reportSeverity,
      setSeverity: setReportSeverity,
      comment: reportComment,
      setComment: setReportComment,
      busy: reportBusy,
      openModal: openReportContactModal,
      closeModal: () => setReportModalOpen(false),
      submit: submitContactReport
    },
    encryptedExport: {
      open: exportPasswordModalOpen,
      password: exportPassword,
      setPassword: setExportPassword,
      busy: exportBusy,
      openModal: openEncryptedExportModal,
      closeModal: () => setExportPasswordModalOpen(false),
      submit: submitEncryptedExport
    },
    gaiaProof: {
      open: gaiaProofConfirmOpen,
      openModal: () => setGaiaProofConfirmOpen(true),
      closeModal: () => setGaiaProofConfirmOpen(false),
      submit: submitGaiaProofExport
    }
  };
}