// useChat attachment upload action (moved verbatim from useChat.js).
import * as api from '../../api';
import * as crypto from '../../crypto';
import { computeSha256Hex } from './helpers';

export function createChatUploadAction(ctx) {
  const { activeIdentity, setUploadProgress, triggerAlert } = ctx;

  async function uploadChatFile(file) {
    if (!file || !activeIdentity) return null;
    setUploadProgress(0);
    try {
      const cleanFile = await crypto.stripImageMetadata(file);
      const { encryptedBlob, keyHex, ivHex } = await crypto.encryptFileSymmetric(cleanFile);
      const encryptedSize = encryptedBlob.size;
      const encryptedBuf = await encryptedBlob.arrayBuffer();
      const fileHash = await computeSha256Hex(encryptedBuf);

      const initRes = await api.initUpload(file.name, encryptedSize, file.type, fileHash);
      const fileId = initRes.fileId;

      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(encryptedSize / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, encryptedSize);
        const chunkBlob = encryptedBlob.slice(start, end);
        const chunkBuf = await chunkBlob.arrayBuffer();
        const chunkHash = await computeSha256Hex(chunkBuf);
        await api.uploadChunk(fileId, i, chunkHash, chunkBlob);
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      await api.completeUpload(fileId);
      setUploadProgress(100);

      return {
        fileId,
        fileName: file.name,
        fileSize: encryptedSize,
        mimeType: file.type,
        keyHex,
        ivHex
      };
    } catch (err) {
      setUploadProgress(0);
      triggerAlert('Upload fehlgeschlagen', err.message, 'danger');
      throw err;
    }
  }

  return { uploadChatFile };
}
