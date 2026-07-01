// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
/**
 * useDrive.js – GaiaDrive Hook
 * -------------------------------------------------------
 * Replaces useVault (GaiaVault) with GaiaDrive.
 *
 * Architecture
 * ─────────────
 * LOCAL STORAGE (always)
 *   • The metadata index (including per-file keyHex + ivHex) is
 *     encrypted with AES-GCM via crypto.encryptLocalRecord (PBKDF2).
 *     Stored in localStorage under `gaia_drive_<userId>`.
 *   • Raw encrypted file blobs are stored in the browser's
 *     Origin Private File System (OPFS).
 *
 * CLOUD SYNC (optional, per-file, ≤ 20 MB, 2-week TTL)
 *   • Cloud copies expire after 14 days. Local copy is never deleted.
 *
 * Record shape
 * ─────────────
 * {
 *   id:               string,
 *   type:             'note' | 'file',
 *   title:            string,
 *   category:         string,
 *   body?:            string,           // for type='note'
 *   fileName?:        string,           // for type='file'
 *   mimeType?:        string,
 *   sizeBytes?:       number,
 *   opfsName?:        string,           // encrypted blob filename in OPFS
 *   keyHex?:          string,           // AES-GCM key (stored in encrypted index)
 *   ivHex?:           string,           // AES-GCM IV  (stored in encrypted index)
 *   cloudFileId?:     string,           // server fileId (for cloud copies)
 *   cloudUploadedAt?: string,           // ISO date of cloud upload
 *   cloudExpiresAt?:  string,           // ISO date of cloud expiry (upload + 14 days)
 *   createdAt:        string,
 *   updatedAt:        string
 * }
 */
import { useState, useCallback } from 'react';
import * as crypto from '../crypto';
import { createClientMessageId } from '../utils/payload';
import * as api from '../api';
import { safeJsonParse } from '../utils/safeJson';

const CLOUD_TTL_DAYS = 14;
const MAX_CLOUD_BYTES = 20 * 1024 * 1024; // 20 MB
const CLOUD_CHUNK_BYTES = 1024 * 1024; // 1 MB

// ─── OPFS helpers ──────────────────────────────────────────────────────────

async function getOPFSRoot() {
  if (!navigator.storage || !navigator.storage.getDirectory) {
    throw new Error('OPFS wird auf diesem Gerät nicht unterstützt.');
  }
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('gaiadrive', { create: true });
}

async function writeOPFSFile(opfsName, blob) {
  const dir = await getOPFSRoot();
  const fh  = await dir.getFileHandle(opfsName, { create: true });
  const writable = await fh.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function readOPFSFile(opfsName) {
  const dir = await getOPFSRoot();
  const fh  = await dir.getFileHandle(opfsName);
  return fh.getFile(); // returns a File (which is a Blob)
}

async function deleteOPFSFile(opfsName) {
  try {
    const dir = await getOPFSRoot();
    await dir.removeEntry(opfsName);
  } catch (_) { /* ignore if already gone */ }
}

// ─── SHA-256 hex helper (for chunk hash) ───────────────────────────────────

async function sha256Hex(arrayBuffer) {
  const digest = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Main Hook ─────────────────────────────────────────────────────────────

export default function useDrive({ user, triggerAlert }) {
  const [driveUnlocked, setDriveUnlocked]             = useState(false);
  const [drivePasswordInput, setDrivePasswordInput]   = useState('');
  const [driveError, setDriveError]                   = useState('');
  const [driveRecords, setDriveRecords]               = useState([]);
  const [selectedDriveRecord, setSelectedDriveRecord] = useState(null);

  // Text-note draft state
  const [draftTitle, setDraftTitle]       = useState('');
  const [draftCategory, setDraftCategory] = useState('identity');
  const [draftBody, setDraftBody]         = useState('');

  // Cloud upload progress (0-100 or null)
  const [driveUploadProgress, setDriveUploadProgress] = useState(null);

  const storageKey = user ? `gaia_drive_${user.id}` : '';

  // ── Persist encrypted index to localStorage ────────────────────────────

  const persistRecords = useCallback(async (nextRecords, password) => {
    const pwd = password || drivePasswordInput;
    if (!user || !pwd) throw new Error('Drive-Passwort erforderlich.');
    const envelope = await crypto.encryptLocalRecord(
      { version: 2, records: nextRecords, updatedAt: new Date().toISOString() },
      pwd
    );
    localStorage.setItem(storageKey, JSON.stringify(envelope));
    setDriveRecords(nextRecords);
  }, [user, storageKey, drivePasswordInput]);

  // ── Unlock ──────────────────────────────────────────────────────────────

  async function handleUnlockDrive(e) {
    if (e) e.preventDefault();
    setDriveError('');
    if (!user) return;
    if (!drivePasswordInput) { setDriveError('Passwort erforderlich.'); return; }

    const stored = localStorage.getItem(storageKey);
    try {
      if (!stored) {
        // First-time setup
        await persistRecords([], drivePasswordInput);
        setDriveUnlocked(true);
        triggerAlert('GaiaDrive eingerichtet', 'Dein verschlüsselter lokaler Drive wurde angelegt.');
        return;
      }
      const envelope = safeJsonParse(stored, null);
      if (!envelope) throw new Error('Invalid drive envelope.');
      const decrypted = await crypto.decryptLocalRecord(envelope, drivePasswordInput);
      setDriveRecords(Array.isArray(decrypted.records) ? decrypted.records : []);
      setDriveUnlocked(true);
    } catch (_) {
      setDriveError('Drive konnte nicht entsperrt werden. Falsches Passwort?');
    }
  }

  // ── Lock ────────────────────────────────────────────────────────────────

  function handleLockDrive() {
    setDriveUnlocked(false);
    setDrivePasswordInput('');
    setDriveError('');
    setDriveRecords([]);
    setDraftTitle('');
    setDraftBody('');
    setSelectedDriveRecord(null);
    setDriveUploadProgress(null);
  }

  // ── Add text note ────────────────────────────────────────────────────────

  async function handleAddNote(e) {
    if (e) e.preventDefault();
    if (!driveUnlocked || !draftTitle.trim() || !draftBody.trim()) return;
    try {
      const now = new Date().toISOString();
      const record = {
        id: createClientMessageId(),
        type: 'note',
        title: draftTitle.trim().slice(0, 100),
        category: draftCategory,
        body: draftBody.trim().slice(0, 10000),
        createdAt: now,
        updatedAt: now
      };
      await persistRecords([record, ...driveRecords]);
      setDraftTitle('');
      setDraftBody('');
      triggerAlert('GaiaDrive', 'Notiz lokal verschlüsselt gespeichert.');
    } catch (err) {
      setDriveError(err.message);
    }
  }

  // ── Add file (local only via OPFS) ────────────────────────────────────────

  async function handleAddFile(file) {
    if (!driveUnlocked || !file) return;
    try {
      // Encrypt the raw file
      const { encryptedBlob, keyHex, ivHex } = await crypto.encryptFileSymmetric(file);

      // Store encrypted blob in OPFS
      const opfsName = `${createClientMessageId()}.enc`;
      await writeOPFSFile(opfsName, encryptedBlob);

      const now = new Date().toISOString();
      const record = {
        id: createClientMessageId(),
        type: 'file',
        title: file.name,
        category: 'files',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        opfsName,
        keyHex,   // stored inside the PBKDF2-encrypted metadata index
        ivHex,
        createdAt: now,
        updatedAt: now
      };
      await persistRecords([record, ...driveRecords]);
      triggerAlert('GaiaDrive', `"${file.name}" lokal verschlüsselt gespeichert.`);
      return record;
    } catch (err) {
      setDriveError(err.message);
    }
  }

  // ── Download / decrypt local file ────────────────────────────────────────

  async function handleDownloadFile(record) {
    if (!driveUnlocked || record.type !== 'file') return;
    if (!record.opfsName || !record.keyHex || !record.ivHex) {
      setDriveError('Schlüsseldaten fehlen – Datei kann nicht entschlüsselt werden.');
      return;
    }
    try {
      const encFile        = await readOPFSFile(record.opfsName);
      const decryptedBlob  = await crypto.decryptFileSymmetric(encFile, record.keyHex, record.ivHex);
      const typedBlob      = new Blob([decryptedBlob], { type: record.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(typedBlob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = record.fileName || record.title;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setDriveError('Datei konnte nicht entschlüsselt werden: ' + err.message);
    }
  }

  // ── Upload to cloud (2-week TTL, encrypts then uploads) ──────────────────

  async function handleCloudUpload(record) {
    if (!driveUnlocked || record.type !== 'file') return;
    if (!record.opfsName) { setDriveError('Keine lokale OPFS-Datei gefunden.'); return; }
    if ((record.sizeBytes || 0) > MAX_CLOUD_BYTES) {
      setDriveError('Dateien über 20 MB können nicht in die Cloud hochgeladen werden.');
      return;
    }
    try {
      setDriveUploadProgress(0);

      // Read the already-encrypted blob from OPFS
      const encFile      = await readOPFSFile(record.opfsName);
      const encBuffer    = await encFile.arrayBuffer();
      const encBlob      = new Blob([encBuffer], { type: 'application/octet-stream' });
      const fileHash     = await sha256Hex(encBuffer);

      // Init upload on server
      const { fileId } = await api.initUpload(
        record.opfsName,
        encBlob.size,
        'application/octet-stream',
        fileHash
      );

      const totalChunks = Math.ceil(encBlob.size / CLOUD_CHUNK_BYTES);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CLOUD_CHUNK_BYTES;
        const end = Math.min(start + CLOUD_CHUNK_BYTES, encBlob.size);
        const chunkBlob = encBlob.slice(start, end);
        const chunkBuffer = await chunkBlob.arrayBuffer();
        const chunkHash = await sha256Hex(chunkBuffer);
        await api.uploadChunk(fileId, i, chunkHash, chunkBlob);
        setDriveUploadProgress(Math.round(((i + 1) / totalChunks) * 80));
      }

      await api.completeUpload(fileId);
      setDriveUploadProgress(100);

      const now        = new Date();
      const expiresAt  = new Date(now.getTime() + CLOUD_TTL_DAYS * 86400 * 1000).toISOString();

      const updatedRecord = { ...record, cloudFileId: fileId, cloudUploadedAt: now.toISOString(), cloudExpiresAt: expiresAt };
      const updated = driveRecords.map(r =>
        r.id === record.id
          ? updatedRecord
          : r
      );
      await persistRecords(updated);

      setTimeout(() => setDriveUploadProgress(null), 1500);
      triggerAlert(
        'Cloud-Sync erfolgreich',
        `"${record.title}" wurde verschlüsselt hochgeladen. Cloud-Kopie wird nach 2 Wochen automatisch gelöscht – die lokale Kopie bleibt erhalten.`
      );
      return updatedRecord;
    } catch (err) {
      setDriveUploadProgress(null);
      setDriveError('Cloud-Upload fehlgeschlagen: ' + err.message);
    }
  }

  // ── Download from cloud (if local OPFS blob is missing) ──────────────────

  async function prepareDriveRecordForChatShare(record) {
    if (!driveUnlocked || record?.type !== 'file') {
      throw new Error('GaiaDrive ist gesperrt oder der Eintrag ist keine Datei.');
    }
    if (!record.keyHex || !record.ivHex) {
      throw new Error('GaiaDrive-Datei besitzt keine gueltigen Schluesseldaten.');
    }
    const expiresAt = record.cloudExpiresAt ? new Date(record.cloudExpiresAt).getTime() : 0;
    if (record.cloudFileId && expiresAt > Date.now()) {
      return record;
    }
    if (!record.opfsName) {
      throw new Error('Lokale GaiaDrive-Kopie fehlt. Datei kann nicht fuer den Chat vorbereitet werden.');
    }
    const uploaded = await handleCloudUpload(record);
    if (!uploaded?.cloudFileId) {
      throw new Error('GaiaDrive-Upload konnte keine Cloud-Datei erzeugen.');
    }
    return uploaded;
  }

  async function handleCloudDownload(record) {
    if (!driveUnlocked || !record.cloudFileId) return;
    if (!record.keyHex || !record.ivHex) {
      setDriveError('Schlüsseldaten fehlen – Cloud-Download nicht möglich.');
      return;
    }
    try {
      const encBlob        = await api.downloadFileAttachment(record.cloudFileId);
      const decryptedBlob  = await crypto.decryptFileSymmetric(encBlob, record.keyHex, record.ivHex);
      const typedBlob      = new Blob([decryptedBlob], { type: record.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(typedBlob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = record.fileName || record.title;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      // Also restore the OPFS copy so future downloads work offline
      if (record.opfsName) {
        const encForOpfs = await crypto.encryptFileSymmetric(typedBlob);
        // Note: re-encryption creates new keys – update the record
        const updatedRecord = {
          ...record,
          keyHex: encForOpfs.keyHex,
          ivHex:  encForOpfs.ivHex
        };
        await writeOPFSFile(record.opfsName, encForOpfs.encryptedBlob);
        const updated = driveRecords.map(r => r.id === record.id ? updatedRecord : r);
        await persistRecords(updated);
      }
    } catch (err) {
      if (err.message.includes('expired') || err.message.includes('404')) {
        const updated = driveRecords.map(r =>
          r.id === record.id
            ? { ...r, cloudFileId: undefined, cloudUploadedAt: undefined, cloudExpiresAt: undefined }
            : r
        );
        await persistRecords(updated);
        setDriveError('Die Cloud-Kopie ist abgelaufen und wurde gelöscht. Lokale Kopie prüfen.');
      } else {
        setDriveError('Cloud-Download fehlgeschlagen: ' + err.message);
      }
    }
  }

  // ── Delete record ────────────────────────────────────────────────────────

  async function handleDeleteRecord(recordId) {
    if (!driveUnlocked) return;
    try {
      const record = driveRecords.find(r => r.id === recordId);
      if (record?.opfsName) {
        await deleteOPFSFile(record.opfsName);
      }
      const next = driveRecords.filter(r => r.id !== recordId);
      await persistRecords(next);
      if (selectedDriveRecord?.id === recordId) setSelectedDriveRecord(null);
      triggerAlert('GaiaDrive', 'Eintrag wurde gelöscht.');
    } catch (err) {
      setDriveError(err.message);
    }
  }

  return {
    driveUnlocked,
    drivePasswordInput, setDrivePasswordInput,
    driveError, setDriveError,
    driveRecords,
    selectedDriveRecord, setSelectedDriveRecord,
    draftTitle, setDraftTitle,
    draftCategory, setDraftCategory,
    draftBody, setDraftBody,
    driveUploadProgress,
    handleUnlockDrive,
    handleLockDrive,
    handleAddNote,
    handleAddFile,
    handleDownloadFile,
    handleCloudUpload,
    prepareDriveRecordForChatShare,
    handleCloudDownload,
    handleDeleteRecord
  };
}
