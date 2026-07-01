// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useRef } from 'react';
import * as api from '../../../api';
import * as crypto from '../../../crypto';

const emojis = ['🚀', '🐼', '🤖', '🔒', '💎', '🛡️', '🌍', '🔥'];

export default function GsnPostComposer({
  activeIdentity,
  createPost,
  repostOfPostId,
  setRepostOfPostId,
  triggerAlert,
  t
}) {
  const [postBody, setPostBody] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadedImageMeta, setUploadedImageMeta] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    
    setUploadingImage(true);
    setImageUploadProgress(5);
    try {
      const cleanFile = await crypto.stripImageMetadata(file);
      setImageUploadProgress(10);
      
      const { encryptedBlob, keyHex, ivHex } = await crypto.encryptFileSymmetric(cleanFile);
      const encryptedSize = encryptedBlob.size;
      const encryptedBuf = await encryptedBlob.arrayBuffer();
      
      const hashBuf = await window.crypto.subtle.digest('SHA-256', encryptedBuf);
      const fileHash = Array.prototype.map.call(new Uint8Array(hashBuf), x => ('00' + x.toString(16)).slice(-2)).join('');
      setImageUploadProgress(15);
      
      const initRes = await api.initUpload(file.name, encryptedSize, file.type, fileHash);
      const fileId = initRes.fileId;
      
      const CHUNK_SIZE = 1024 * 1024;
      const totalChunks = Math.ceil(encryptedSize / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, encryptedSize);
        const chunkBlob = encryptedBlob.slice(start, end);
        const chunkBuf = await chunkBlob.arrayBuffer();
        
        const chunkHashBuf = await window.crypto.subtle.digest('SHA-256', chunkBuf);
        const chunkHash = Array.prototype.map.call(new Uint8Array(chunkHashBuf), x => ('00' + x.toString(16)).slice(-2)).join('');
        
        await api.uploadChunk(fileId, i, chunkHash, chunkBlob);
        setImageUploadProgress(Math.round(20 + ((i + 1) / totalChunks) * 80));
      }
      
      await api.completeUpload(fileId);
      setImageUploadProgress(100);
      
      setUploadedImageMeta({
        fileId,
        fileName: file.name,
        fileSize: encryptedSize,
        mimeType: file.type,
        keyHex,
        ivHex
      });
      
      triggerAlert(t('success') || 'Erfolg', t('gsn_image_uploaded') || 'Bild wurde verschlüsselt und hochgeladen.');
    } catch (err) {
      console.error(err);
      URL.revokeObjectURL(previewUrl);
      setImagePreviewUrl('');
      triggerAlert(t('error') || 'Fehler', (t('gsn_upload_failed') || 'Bild-Upload fehlgeschlagen: ') + err.message, 'danger');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postBody.trim() && !uploadedImageMeta) return;

    let imageAttachmentStr = '';
    if (uploadedImageMeta) {
      imageAttachmentStr = JSON.stringify({
        fileId: uploadedImageMeta.fileId,
        keyHex: uploadedImageMeta.keyHex,
        ivHex: uploadedImageMeta.ivHex,
        fileName: uploadedImageMeta.fileName
      });
    }

    try {
      await createPost(postBody, imageAttachmentStr, repostOfPostId);
      setPostBody('');
      setRepostOfPostId('');
      setUploadedImageMeta(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl('');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      triggerAlert(t('success') || 'Erfolg', t('gsn_post_created') || 'Beitrag erfolgreich geteilt.');
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    }
  };

  return (
    <form className="gsn-composer" onSubmit={handleCreatePost} style={{ flexShrink: 0, margin: 0, padding: '12px 16px' }}>
      <textarea
        className="gsn-composer-textarea"
        placeholder={t('gsn_composer_placeholder') || 'Was gibt es Neues in der Föderation?'}
        value={postBody}
        onChange={(e) => setPostBody(e.target.value)}
        style={{ minHeight: '60px', marginBottom: '8px' }}
      />

      {repostOfPostId && (
        <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span>🔄 Reposting Beitrag: <code>{repostOfPostId.slice(0, 8)}...</code></span>
          <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => { setRepostOfPostId(''); setPostBody(''); }}>
            ✕
          </button>
        </div>
      )}

      {uploadedImageMeta && imagePreviewUrl && (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px', background: 'rgba(0,0,0,0.25)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <img
            src={imagePreviewUrl}
            alt="Selected preview"
            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
          />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 'bold' }}>🔒 Encrypted</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{uploadedImageMeta.fileName}</span>
          </div>
          <button
            type="button"
            className="btn-action"
            style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--danger)' }}
            onClick={() => {
              setUploadedImageMeta(null);
              URL.revokeObjectURL(imagePreviewUrl);
              setImagePreviewUrl('');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            ✕
          </button>
        </div>
      )}

      {uploadingImage && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <span>🔒 Verschlüsseln und Hochladen...</span>
            <span>{imageUploadProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${imageUploadProgress}%`, height: '100%', background: 'var(--accent-cyan)' }}></div>
          </div>
        </div>
      )}

      <div className="gsn-composer-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-action"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={uploadingImage}
            title={t('gsn_add_image') || 'Bild hinzufügen (Verschlüsselt)'}
            style={{ fontSize: '1.1rem', padding: '6px' }}
          >
            📷
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImageUpload}
          />

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-action"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title={t('gsn_add_emoji') || 'Emoji einfügen'}
              style={{ fontSize: '1.1rem', padding: '6px' }}
            >
              😀
            </button>
            {showEmojiPicker && (
              <div className="glass-panel" style={{ position: 'absolute', bottom: '40px', left: 0, zIndex: 100, padding: '8px', display: 'flex', gap: '6px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}>
                {emojis.map(e => (
                  <button
                    key={e}
                    type="button"
                    style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
                    onClick={() => {
                      setPostBody(prev => prev + e);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={(!postBody.trim() && !uploadedImageMeta) || uploadingImage}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          🚀 {t('gsn_post_btn') || 'Teilen'}
        </button>
      </div>
    </form>
  );
}
