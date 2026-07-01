// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useState } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';
import { parseToGaiaID } from '../utils/gaiaAddress';
import { safeJsonParse } from '../utils/safeJson';

function parsePublicRecordValue(recordValue) {
  if (!recordValue) return null;
  if (typeof recordValue === 'string') {
    return safeJsonParse(recordValue, null);
  }
  if (typeof recordValue === 'object') return recordValue;
  return null;
}

export default function useGaiaDrop({
  activeIdentity,
  derivedKeys,
  triggerAlert,
  showConfirm,
  t
}) {
  const [dropTargetInput, setDropTargetInput] = useState('');
  const [dropSenderInput, setDropSenderInput] = useState('');
  const [dropMessageInput, setDropMessageInput] = useState('');
  const [dropStatus, setDropStatus] = useState('');
  const [dropError, setDropError] = useState('');
  const [gaiaDropInbox, setGaiaDropInbox] = useState([]);
  const [gaiaDropLoading, setGaiaDropLoading] = useState(false);
  const [gaiaDropError, setGaiaDropError] = useState('');
  const [selectedDrop, setSelectedDrop] = useState(null);

  async function handleSubmitPublicGaiaDrop(e) {
    if (e) e.preventDefault();
    setDropError('');
    setDropStatus('');

    const targetGaiaId = parseToGaiaID(dropTargetInput);
    const messageBody = dropMessageInput.trim();
    const senderLabel = dropSenderInput.trim().slice(0, 80);
    if (!targetGaiaId || !messageBody) {
      setDropError('GaiaID und Nachricht sind erforderlich.');
      return;
    }

    try {
      const identity = await api.getPublicIdentity(targetGaiaId);
      const publicRecord = parsePublicRecordValue(identity?.publicRecord);
      const publicKeys = publicRecord?.public_keys;
      if (!publicKeys?.pke || !publicKeys?.box || !publicKeys?.identity) {
        throw new Error('Empfaenger besitzt keinen vollstaendigen GaiaDrop-Schluesselsatz.');
      }

      const encryptedPayload = await crypto.encryptAnonymousDrop(JSON.stringify({
        type: 'gaiadrop.text.v1',
        body: messageBody.slice(0, 5000),
        senderLabel,
        submittedAt: new Date().toISOString()
      }), publicKeys);
      const receipt = await api.submitGaiaDrop(targetGaiaId, senderLabel, encryptedPayload);
      setDropMessageInput('');
      setDropStatus(`GaiaDrop empfangen. Proof: ${(receipt?.payloadHash || '').slice(0, 16)}...`);
    } catch (err) {
      setDropError(err.message || 'GaiaDrop konnte nicht gesendet werden.');
    }
  }

  async function loadGaiaDropInbox() {
    if (!activeIdentity || !derivedKeys) return;
    setGaiaDropLoading(true);
    setGaiaDropError('');
    try {
      const submissions = await api.getGaiaDropInbox(activeIdentity.ID);
      const decrypted = await Promise.all((submissions || []).map(async drop => {
        try {
          const plaintext = await crypto.decryptAnonymousDrop(
            drop.payload,
            {
              pke: derivedKeys.pke.public,
              box: derivedKeys.box.public,
              identity: derivedKeys.sign.public
            },
            {
              pke: derivedKeys.pke.private,
              box: derivedKeys.box.private
            }
          );
          let content = { body: plaintext };
          content = safeJsonParse(plaintext, content);
          return { ...drop, decrypted: content, decryptError: '' };
        } catch (err) {
          return { ...drop, decrypted: null, decryptError: err.message || 'Decrypt failed' };
        }
      }));
      setGaiaDropInbox(decrypted);
    } catch (err) {
      setGaiaDropError(err.message || 'GaiaDrop Inbox konnte nicht geladen werden.');
    } finally {
      setGaiaDropLoading(false);
    }
  }

  async function handleSelectDrop(drop) {
    setSelectedDrop(drop);
    if (drop && drop.status === 'new') {
      try {
        await api.markGaiaDropRead(drop.id);
        setGaiaDropInbox(prev => prev.map(d => d.id === drop.id ? { ...d, status: 'read' } : d));
      } catch (err) {
        console.error("Failed to mark drop as read:", err);
      }
    }
  }

  async function handleDeleteDrop(dropId) {
    showConfirm(
      t('drop_delete_title') || 'GaiaDrop löschen',
      t('drop_delete_desc') || 'Möchtest du diesen Drop wirklich unwiderruflich löschen?',
      async () => {
        try {
          await api.deleteGaiaDrop(dropId);
          setSelectedDrop(null);
          setGaiaDropInbox(prev => prev.filter(d => d.id !== dropId));
          triggerAlert('Drop gelöscht', 'Der Drop wurde erfolgreich gelöscht.');
        } catch (err) {
          triggerAlert('Fehler', err.message, 'danger');
        }
      },
      null,
      t('loeschen') || 'Löschen',
      t('abbrechen') || 'Abbrechen',
      true
    );
  }

  return {
    dropTargetInput, setDropTargetInput,
    dropSenderInput, setDropSenderInput,
    dropMessageInput, setDropMessageInput,
    dropStatus, setDropStatus,
    dropError, setDropError,
    gaiaDropInbox, setGaiaDropInbox,
    gaiaDropLoading, setGaiaDropLoading,
    gaiaDropError, setGaiaDropError,
    selectedDrop, setSelectedDrop,
    handleSubmitPublicGaiaDrop,
    loadGaiaDropInbox,
    handleSelectDrop,
    handleDeleteDrop
  };
}
