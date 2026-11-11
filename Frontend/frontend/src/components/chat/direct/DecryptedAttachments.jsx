import React, { useEffect, useState } from 'react';
import Icon from '../../ui/Icon';
import * as api from '../../../api';
import * as crypto from '../../../crypto';
import {
  MAX_DIRECT_ATTACHMENT_BYTES,
  assertImageBlob,
  exceedsLimit,
  limitError
} from '../../../utils/mediaLimits';

/**
 * Decrypted image attachment. The blob URL is created locally from the
 * end-to-end encrypted attachment and revoked on unmount. Expired or failed
 * downloads are reported factually — no silent placeholder image.
 */
export function DecryptedImage({ fileId, keyHex, ivHex, alt }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expired, setExpired] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = '';
    const load = async () => {
      try {
        const blob = await api.downloadFileAttachment(fileId, { maxBytes: MAX_DIRECT_ATTACHMENT_BYTES });
        if (exceedsLimit(blob?.size, MAX_DIRECT_ATTACHMENT_BYTES)) {
          throw limitError('Der Anhang', MAX_DIRECT_ATTACHMENT_BYTES);
        }
        const decrypted = await crypto.decryptFileSymmetric(blob, keyHex, ivHex);
        if (exceedsLimit(decrypted?.size, MAX_DIRECT_ATTACHMENT_BYTES)) {
          throw limitError('Der Anhang', MAX_DIRECT_ATTACHMENT_BYTES);
        }
        await assertImageBlob(decrypted, 'Der Anhang');
        if (active) {
          createdUrl = URL.createObjectURL(decrypted);
          setImgUrl(createdUrl);
          setLoading(false);
        }
      } catch (err) {
        const message = String(err?.message || err || '');
        const expectedMissingFile = message.includes('File expired or deleted');
        if (!expectedMissingFile) {
          console.error('Failed to decrypt image:', err);
        }
        if (active) {
          setExpired(expectedMissingFile);
          setError(!expectedMissingFile);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileId, keyHex, ivHex]);

  useEffect(() => {
    if (!isZoomed) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setIsZoomed(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isZoomed]);

  if (loading) {
    return (
      <div className="vgt-attach-placeholder" aria-live="polite">
        <Icon name="spinner" size={16} />
        <span>Entschlüssele…</span>
      </div>
    );
  }
  if (expired) return <div className="vgt-attach-placeholder">Bild ist abgelaufen oder wurde gelöscht.</div>;
  if (error) return <div className="vgt-attach-placeholder vgt-attach-placeholder--danger">Bild konnte nicht geladen werden.</div>;

  return (
    <>
      <button
        type="button"
        className="vgt-attach-image"
        onClick={() => setIsZoomed(true)}
        aria-label={alt ? `Bild vergrößern: ${alt}` : 'Bild vergrößern'}
      >
        <img src={imgUrl} alt={alt || 'Anhang'} loading="lazy" />
      </button>
      {isZoomed ? (
        <div
          className="vgt-chat-imgzoom"
          role="dialog"
          aria-modal="true"
          aria-label={alt ? `Bild: ${alt}` : 'Bildvorschau'}
          onClick={() => setIsZoomed(false)}
        >
          <img src={imgUrl} alt={alt || 'Anhang'} onClick={event => event.stopPropagation()} />
          <button
            type="button"
            className="vgt-chat-imgzoom__close"
            onClick={() => setIsZoomed(false)}
            aria-label="Vorschau schließen"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      ) : null}
    </>
  );
}

/** Encrypted file attachment: explicit download action with honest busy state. */
export function DecryptedFileDownload({ fileId, keyHex, ivHex, fileName, triggerAlert }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await api.downloadFileAttachment(fileId, { maxBytes: MAX_DIRECT_ATTACHMENT_BYTES });
      if (exceedsLimit(blob?.size, MAX_DIRECT_ATTACHMENT_BYTES)) {
        throw limitError('Der Anhang', MAX_DIRECT_ATTACHMENT_BYTES);
      }
      const decrypted = await crypto.decryptFileSymmetric(blob, keyHex, ivHex);
      if (exceedsLimit(decrypted?.size, MAX_DIRECT_ATTACHMENT_BYTES)) {
        throw limitError('Der Anhang', MAX_DIRECT_ATTACHMENT_BYTES);
      }
      const url = URL.createObjectURL(decrypted);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      triggerAlert?.('Download fehlgeschlagen', err.message || 'Datei konnte nicht entschlüsselt werden.', 'danger');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button type="button" className="vgt-attach-file" onClick={handleDownload} disabled={downloading}>
      <Icon name="download" size={16} />
      <span className="vgt-attach-file__name">{fileName || 'Datei'}</span>
      <span className="vgt-attach-file__state">{downloading ? 'Lädt…' : 'Herunterladen'}</span>
    </button>
  );
}
