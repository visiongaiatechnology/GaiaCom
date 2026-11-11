import React, { useState, useRef } from 'react';
import * as api from '../../../api';
import * as crypto from '../../../crypto';
import Icon from '../../ui/Icon';
import AvatarMark from '../profile/ui/AvatarMark';

/**
 * GSN post composer. The image path keeps the encrypted upload flow unchanged;
 * the author avatar is the real profile avatar, never a bundled placeholder.
 */
export default function GsnPostComposer({
  activeIdentity,
  myProfile,
  createPost,
  repostOfPostId,
  setRepostOfPostId,
  triggerAlert,
  t
}) {
  const [postBody, setPostBody] = useState('');
  const [uploadedImageMeta, setUploadedImageMeta] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleImageUpload = async event => {
    const file = event.target.files[0];
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

      const chunkSize = 1024 * 1024;
      const totalChunks = Math.ceil(encryptedSize / chunkSize);
      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, encryptedSize);
        const chunkBlob = encryptedBlob.slice(start, end);
        const chunkBuf = await chunkBlob.arrayBuffer();
        const chunkHashBuf = await window.crypto.subtle.digest('SHA-256', chunkBuf);
        const chunkHash = Array.prototype.map.call(new Uint8Array(chunkHashBuf), x => ('00' + x.toString(16)).slice(-2)).join('');
        await api.uploadChunk(fileId, index, chunkHash, chunkBlob);
        setImageUploadProgress(Math.round(20 + ((index + 1) / totalChunks) * 80));
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

  const clearImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl('');
    setUploadedImageMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async event => {
    event.preventDefault();
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
      clearImage();
      triggerAlert(t('success') || 'Erfolg', t('gsn_post_created') || 'Beitrag erfolgreich geteilt.');
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    }
  };

  const displayName = myProfile?.displayName || activeIdentity?.DisplayName || '';

  return (
    <form className="vgt-gsn-composer-v2" onSubmit={handleCreatePost}>
      {repostOfPostId && (
        <div className="vgt-gsn-composer__context">
          <span>
            <Icon name="share" size={14} /> Repost von <code className="vgt-id">{String(repostOfPostId).slice(0, 8)}…</code>
          </span>
          <button
            type="button"
            className="btn-icon"
            aria-label="Repost verwerfen"
            onClick={() => {
              setRepostOfPostId('');
              setPostBody('');
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <div className="vgt-gsn-composer-v2__main-row">
        <div className="vgt-gsn-composer-v2__avatar-wrap">
          <AvatarMark
            avatar={myProfile?.avatar || ''}
            displayName={displayName}
            variant="default"
            className="vgt-gsn-composer-v2__avatar"
          />
        </div>

        <textarea
          id="gsn-composer-input"
          className="vgt-gsn-composer-v2__textarea"
          placeholder={t('gsn_composer_placeholder') || 'Was möchtest du mit dem Netzwerk teilen?'}
          value={postBody}
          onChange={event => setPostBody(event.target.value)}
          rows={2}
        />
      </div>

      {uploadedImageMeta && imagePreviewUrl && (
        <div className="vgt-gsn-composer__attachment">
          <img src={imagePreviewUrl} alt="Vorschau des verschlüsselten Bildes" />
          <div className="vgt-gsn-composer__attachment-meta">
            <strong>
              <Icon name="lock" size={12} /> Verschlüsselt
            </strong>
            <span className="vgt-caption">{uploadedImageMeta.fileName}</span>
          </div>
          <button type="button" className="btn-icon vgt-danger-text" onClick={clearImage} aria-label="Bild entfernen">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {uploadingImage && (
        <div className="vgt-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={imageUploadProgress}>
          <div className="vgt-progress__label">
            <span>Verschlüsseln und hochladen…</span>
            <span className="vgt-numeric">{imageUploadProgress}%</span>
          </div>
          <div className="vgt-progress__track">
            <div className="vgt-progress__fill" style={{ width: `${imageUploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="vgt-gsn-composer-v2__footer">
        <div className="vgt-gsn-composer-v2__tabs">
          <button type="button" className="vgt-gsn-tab-btn is-active">
            <Icon name="edit" size={15} />
            <span>Beitrag</span>
          </button>
          <button
            type="button"
            className="vgt-gsn-tab-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
          >
            <Icon name="image" size={15} />
            <span>Bild</span>
          </button>
          <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
        </div>

        <button
          type="submit"
          className="vgt-btn-posten"
          disabled={(!postBody.trim() && !uploadedImageMeta) || uploadingImage}
        >
          <Icon name="send" size={14} />
          <span>Posten</span>
        </button>
      </div>
    </form>
  );
}
