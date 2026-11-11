// useEmails compose/send actions (moved verbatim from useEmails.js).
// Factory: receives the hook's state/setters as a context object each render.
import * as api from '../../api';
import * as crypto from '../../crypto';
import { parseToGaiaID } from '../../utils/gaiaAddress';
import { deliverDeviceEnvelopes, encryptForRecipientDevices } from '../../utils/deviceFanout';
import {
  GAIA_MAIL_CHUNK_BYTES,
  GAIA_MAIL_MAX_BYTES,
  computeSha256Hex,
  encryptedChunkedSize,
  parsePublicRecordValue,
  randomHex
} from './mailHelpers';

export function createComposeActions(ctx) {
  const {
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    isSmtpMode,
    composeTo,
    composeSubject,
    composeBody,
    composeReplyTo,
    composeScheduledFor,
    uploadedMeta,
    activeDraftIdRef,
    pollEmails,
    fetchMailboxMetadata,
    verifyRecipientsAndRun,
    triggerAlert,
    setComposeTo,
    setComposeSubject,
    setComposeBody,
    setComposeReplyTo,
    setComposeScheduledFor,
    setComposeError,
    setUploadProgress,
    setUploadFile,
    setUploadedMeta,
    setIsComposing
  } = ctx;

  // --- File Upload via backend chunks ---
  async function handleFileUpload(e) {
    let file = e.target.files[0];
    if (!file) return;

    if (isSmtpMode) {
      const maxSmtpBytes = 30 * 1024 * 1024;
      if (file.size > maxSmtpBytes) {
        triggerAlert('SMTP Limit überschritten', 'Klassische SMTP-Mails unterstützen maximal 30MB Dateianhänge. Bitte wähle eine kleinere Datei.', 'danger');
        return;
      }
    } else {
      const maxGaiaBytes = GAIA_MAIL_MAX_BYTES;
      if (file.size > maxGaiaBytes) {
        triggerAlert('Sicherheitslimit überschritten', 'Verschlüsselte GaiaCOM-Anhänge dürfen maximal 10GB groß sein.', 'danger');
        return;
      }
    }

    setUploadProgress(5);
    setUploadFile(file);
    setUploadedMeta(null);

    try {
      if (isSmtpMode) {
        setUploadProgress(100);
        setUploadedMeta({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          mode: 'smtp-legacy-metadata'
        });
        triggerAlert('SMTP-Anhang vorgemerkt', `Die Datei "${file.name}" wurde fuer den Legacy-SMTP-Pfad markiert.`);
        return;
      }

      if (file.type.startsWith('image/')) {
        setUploadProgress(10);
        file = await crypto.stripImageMetadata(file);
        setUploadFile(file);
      }
      setUploadProgress(20);

      const rawKey = window.crypto.getRandomValues(new Uint8Array(32));
      const keyHex = crypto.bytesToHex(rawKey);
      const cryptoKey = await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
      const encryptedSize = encryptedChunkedSize(file.size);
      const envelopeHashSource = new TextEncoder().encode(`${file.name}:${file.size}:${file.type}:${Date.now()}:${randomHex(16)}`);
      const fileHash = await computeSha256Hex(envelopeHashSource);
      const initRes = await api.initUpload(file.name, encryptedSize, 'application/octet-stream', fileHash);
      const fileId = initRes.fileId;
      const totalChunks = Math.max(1, Math.ceil(file.size / GAIA_MAIL_CHUNK_BYTES));
      const chunks = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * GAIA_MAIL_CHUNK_BYTES;
        const end = Math.min(start + GAIA_MAIL_CHUNK_BYTES, file.size);
        const plainBuffer = await file.slice(start, end).arrayBuffer();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          cryptoKey,
          plainBuffer
        );
        const encryptedChunk = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
        const chunkHash = await computeSha256Hex(encryptedBuffer);

        await api.uploadChunk(fileId, i, chunkHash, encryptedChunk);
        chunks.push({
          index: i,
          ivHex: crypto.bytesToHex(iv),
          plainSize: end - start,
          cipherSize: encryptedBuffer.byteLength
        });
        setUploadProgress(Math.floor(20 + ((i + 1) / totalChunks) * 75));
      }

      await api.completeUpload(fileId);
      setUploadProgress(100);

      const fileMeta = {
        fileId,
        name: file.name,
        size: file.size,
        encryptedSize,
        mimeType: file.type || 'application/octet-stream',
        hash: fileHash,
        keyHex,
        encryptionMode: 'aes-gcm-chunked-v1',
        chunkSize: GAIA_MAIL_CHUNK_BYTES,
        chunks
      };

      setUploadedMeta(fileMeta);
      triggerAlert('Datei verschlüsselt', `Die Datei "${file.name}" wurde lokal mit hybriden Post-Quanten-Verfahren zerteilt, verschlüsselt und hochgeladen.`);
    } catch (err) {
      triggerAlert('Upload failed', err.message, 'danger');
      setUploadFile(null);
    }
  }

  async function handleSendMail(e) {
    e.preventDefault();
    setComposeError('');

    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim() || !activeIdentity) {
      setComposeError('Empfänger, Betreff und Nachricht sind erforderlich.');
      return;
    }

    try {
      const attachmentsList = uploadedMeta ? [uploadedMeta] : [];

      if (composeScheduledFor) {
        if (isSmtpMode) {
          const draftPayload = {
            id: activeDraftIdRef.current || undefined,
            identityId: activeIdentity.ID,
            recipientGaia: composeTo,
            subject: composeSubject,
            body: composeBody,
            attachments: attachmentsList,
            replyTo: composeReplyTo,
            scheduledFor: new Date(composeScheduledFor).toISOString(),
            securityWarning: 'SMTP-Legacy: Nachricht verlässt den nativen GaiaCOM-Sicherheitskontext.'
          };
          await api.saveMailDraft(draftPayload);
        } else {
          const recipientGaiaFormat = parseToGaiaID(composeTo);
          const res = await api.getPublicIdentity(recipientGaiaFormat);
          if (!res || !res.publicRecord) {
            throw new Error(`Empfänger-Identität "${recipientGaiaFormat}" nicht gefunden.`);
          }
          const pubRecord = parsePublicRecordValue(res.publicRecord);
          if (!pubRecord?.public_keys) {
            throw new Error('Empfaenger besitzt keinen gueltigen Schluesselsatz.');
          }

          const emailContent = {
            subject: composeSubject,
            body: composeBody,
            attachments: attachmentsList,
            replyTo: composeReplyTo,
            recipientGaia: recipientGaiaFormat
          };

          const plaintext = JSON.stringify(emailContent);
          const encryptedEnvelopes = await encryptForRecipientDevices({ plaintext, recipientIdentityId: res.id, recipientPublicKeys: { ...pubRecord.public_keys, keyset_proof: pubRecord.keyset_proof }, senderSignPrivate: derivedKeys.sign.private, senderDeviceVault: deviceKeyVault });
          const selfEnvelopes = await encryptForRecipientDevices({ plaintext, recipientIdentityId: activeIdentity.ID, recipientPublicKeys: { pke: derivedKeys.pke.public, box: derivedKeys.box.public, hqc256: derivedKeys.hqc256?.public, identity: derivedKeys.sign.public, mldsa87: derivedKeys.mldsa87?.public || '' }, senderSignPrivate: derivedKeys.sign.private, senderDeviceVault: deviceKeyVault });

          const envelopeDraftData = {
            recipientEnvelopes: encryptedEnvelopes.map(envelope => ({ recipientId: res.id, envelope })),
            selfEnvelopes
          };

          if (attachmentsList.length > 0) {
            await api.grantAttachmentsAccess(attachmentsList, [res.id, activeIdentity.ID]);
          }

          const draftPayload = {
            id: activeDraftIdRef.current || undefined,
            identityId: activeIdentity.ID,
            recipientGaia: composeTo,
            subject: composeSubject,
            body: composeBody,
            attachments: attachmentsList,
            replyTo: composeReplyTo,
            scheduledFor: new Date(composeScheduledFor).toISOString(),
            envelopeDraft: JSON.stringify(envelopeDraftData)
          };
          await api.saveMailDraft(draftPayload);
        }
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeReplyTo(null);
        setComposeScheduledFor('');
        setUploadFile(null);
        setUploadedMeta(null);
        setUploadProgress(0);
        setIsComposing(false);
        activeDraftIdRef.current = null;
        fetchMailboxMetadata();
        triggerAlert('Versand geplant', `Der verzögerte Versand wurde für ${new Date(composeScheduledFor).toLocaleString()} geplant.`);
        return;
      }

      if (isSmtpMode) {
        await api.sendSmtpMail(
          activeIdentity.ID,
          composeTo.trim(),
          composeSubject.trim(),
          composeBody,
          attachmentsList
        );
        if (activeDraftIdRef.current) {
          await api.deleteMailDraft(activeDraftIdRef.current).catch(() => {});
          activeDraftIdRef.current = null;
        }
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeReplyTo(null);
        setUploadFile(null);
        setUploadedMeta(null);
        setUploadProgress(0);
        setIsComposing(false);
        fetchMailboxMetadata();
        await pollEmails();
        triggerAlert('SMTP gesendet', 'Legacy-SMTP Mail wurde gesendet und rot als unsichere Nachricht im Ausgang markiert.', 'warning');
        return;
      } else {
        const recipientGaiaFormat = parseToGaiaID(composeTo);
        const res = await api.getPublicIdentity(recipientGaiaFormat);
        if (!res || !res.publicRecord) {
          throw new Error(`Empfänger-Identität "${recipientGaiaFormat}" nicht gefunden.`);
        }
        const pubRecord = parsePublicRecordValue(res.publicRecord);
        if (!pubRecord?.public_keys) {
          throw new Error('Empfaenger besitzt keinen gueltigen Schluesselsatz.');
        }

        verifyRecipientsAndRun(
          [res.gaiaID],
          [pubRecord],
          async () => {
            try {
              const emailContent = {
                subject: composeSubject,
                body: composeBody,
                attachments: attachmentsList,
                replyTo: composeReplyTo,
                recipientGaia: recipientGaiaFormat
              };

              const plaintext = JSON.stringify(emailContent);
              const encryptedEnvelopes = await encryptForRecipientDevices({ plaintext, recipientIdentityId: res.id, recipientPublicKeys: { ...pubRecord.public_keys, keyset_proof: pubRecord.keyset_proof }, senderSignPrivate: derivedKeys.sign.private, senderDeviceVault: deviceKeyVault });
              const selfEnvelopes = await encryptForRecipientDevices({ plaintext, recipientIdentityId: activeIdentity.ID, recipientPublicKeys: { pke: derivedKeys.pke.public, box: derivedKeys.box.public, hqc256: derivedKeys.hqc256?.public, identity: derivedKeys.sign.public, mldsa87: derivedKeys.mldsa87?.public || '' }, senderSignPrivate: derivedKeys.sign.private, senderDeviceVault: deviceKeyVault });

              if (attachmentsList.length > 0) {
                await api.grantAttachmentsAccess(attachmentsList, [res.id, activeIdentity.ID]);
              }

              await deliverDeviceEnvelopes(activeIdentity.ID, res.id, encryptedEnvelopes);
              await deliverDeviceEnvelopes(activeIdentity.ID, activeIdentity.ID, selfEnvelopes);

              if (activeDraftIdRef.current) {
                await api.deleteMailDraft(activeDraftIdRef.current).catch(() => {});
                activeDraftIdRef.current = null;
              }

              setComposeTo('');
              setComposeSubject('');
              setComposeBody('');
              setComposeReplyTo(null);
              setUploadFile(null);
              setUploadedMeta(null);
              setUploadProgress(0);
              setIsComposing(false);
              fetchMailboxMetadata();
              triggerAlert(
                'Mail gesendet',
                'Ihre GaiaCOM Nachricht wurde verschlüsselt und versendet!',
                'success'
              );
              pollEmails();
            } catch (err) {
              setComposeError(err.message);
            }
          }
        );
        return;
      }

    } catch (err) {
      setComposeError(err.message);
    }
  }

  return { handleFileUpload, handleSendMail };
}
