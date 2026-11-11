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
 * Trust and data-egress flows of a group channel: report the room, export the
 * channel password-encrypted, or build a signed GaiaProof package.
 * API calls and payload shapes are unchanged from the legacy pane.
 */
export default function useGroupChatExports({ activeRoom, activeChannel, activeIdentity, channelMessages, triggerAlert, t }) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('harassment');
  const [reportSeverity, setReportSeverity] = useState('medium');
  const [reportComment, setReportComment] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  const [exportPasswordModalOpen, setExportPasswordModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportBusy, setExportBusy] = useState(false);

  const [gaiaProofConfirmOpen, setGaiaProofConfirmOpen] = useState(false);

  const openReportGroupModal = () => {
    setReportCategory('harassment');
    setReportSeverity('medium');
    setReportComment('');
    setReportModalOpen(true);
  };

  const submitGroupReport = async () => {
    const comment = reportComment.trim();
    if (comment.length > REPORT_COMMENT_LIMIT) {
      triggerAlert?.('Meldung zu lang', `Maximal ${REPORT_COMMENT_LIMIT} Zeichen.`);
      return;
    }
    setReportBusy(true);
    try {
      await api.submitAbuseReport(
        activeIdentity.ID,
        'room',
        activeRoom.ID || activeRoom.id,
        reportCategory,
        reportSeverity,
        null,
        comment
      );
      setReportModalOpen(false);
      triggerAlert?.(t('success') || 'Erfolg', t('report_success') || 'Gruppe wurde erfolgreich gemeldet.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('report_failed') || 'Fehler beim Melden: ') + err.message);
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
      const envelope = await crypto.encryptLocalRecord(channelMessages, password);
      downloadJSON(`group-export-${activeRoom.Name || 'group'}-${activeChannel.name}.json`, envelope);
      setExportPasswordModalOpen(false);
      setExportPassword('');
      triggerAlert?.(t('success') || 'Erfolg', t('export_success') || 'Gruppenkanal wurde erfolgreich verschlüsselt exportiert.');
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
      for (const message of channelMessages) {
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
        roomID: activeRoom.id || activeRoom.ID,
        channelID: activeChannel.id,
        messages: exportedMessages
      };

      downloadJSON(
        `gaiaproof-group-${activeRoom.Name || 'group'}-${activeChannel.name}.json`,
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
      openModal: openReportGroupModal,
      closeModal: () => setReportModalOpen(false),
      submit: submitGroupReport
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