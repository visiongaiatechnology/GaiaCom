import React, { useEffect, useState } from 'react';
import * as api from '../../../api';
import * as crypto from '../../../crypto';
import { safeJsonParse } from '../../../utils/safeJson';
import {
  MAX_GSN_IMAGE_BYTES,
  assertImageBlob,
  exceedsLimit,
  limitError
} from '../../../utils/mediaLimits';
import Icon from '../../ui/Icon';
import { isMediaKnownMissing, markMediaMissing, isMissingMediaError } from '../../../utils/mediaFailureCache';
import useDialogA11y from '../../common/useDialogA11y';

/**
 * Decrypts and renders a GSN post image. The upload/decrypt contract is
 * unchanged; the expired/error/loading states are explicit instead of glyphs,
 * and the zoom overlay is a real dialog-like layer with Escape handling.
 * SEC-FE FE-03: byte cap before decrypt + magic-byte validation after decrypt.
 */
export default function DecryptedGsnImage({ attachmentJson }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  // The zoom layer is a modal dialog: trap focus, Escape closes, focus returns
  // to the thumbnail button. Decryption/loading states are untouched.
  const zoomRef = useDialogA11y(isZoomed, { onClose: () => setIsZoomed(false) });

  useEffect(() => {
    let active = true;
    let createdUrl = '';
    const load = async () => {
      try {
        const att = safeJsonParse(attachmentJson, null);
        if (!att) throw new Error('Invalid attachment envelope.');
        if (isMediaKnownMissing(att.fileId)) {
          // Already resolved as expired/deleted in this session: no second request.
          if (active) { setIsExpired(true); setLoading(false); }
          return;
        }
        const blob = await api.downloadFileAttachment(att.fileId, { maxBytes: MAX_GSN_IMAGE_BYTES });
        if (exceedsLimit(blob?.size, MAX_GSN_IMAGE_BYTES)) {
          throw limitError('Das Bild', MAX_GSN_IMAGE_BYTES);
        }
        const decrypted = await crypto.decryptFileSymmetric(blob, att.keyHex, att.ivHex);
        if (exceedsLimit(decrypted?.size, MAX_GSN_IMAGE_BYTES)) {
          throw limitError('Das Bild', MAX_GSN_IMAGE_BYTES);
        }
        await assertImageBlob(decrypted, 'Das Bild');
        if (active) {
          createdUrl = URL.createObjectURL(decrypted);
          setImgUrl(createdUrl);
          setLoading(false);
        }
      } catch (err) {
        const message = String(err?.message || err || '');
        const expectedMissingFile = isMissingMediaError(err);
        if (expectedMissingFile) markMediaMissing(safeJsonParse(attachmentJson, null)?.fileId);
        if (!expectedMissingFile) {
          console.error('Failed to decrypt GSN image:', err);
        }
        if (active) {
          if (expectedMissingFile) {
            setIsExpired(true);
          } else {
            setError(true);
          }
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attachmentJson]);

  if (loading) {
    return (
      <div className="vgt-gsn-media-state" role="status">
        <Icon name="spinner" size={18} />
        <span>Bild wird entschlüsselt…</span>
      </div>
    );
  }
  if (isExpired) {
    return (
      <div className="vgt-gsn-media-state vgt-gsn-media-state--muted">
        <Icon name="clock" size={18} />
        <span>Bild nach automatischer Aufbewahrungsfrist abgelaufen.</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="vgt-gsn-media-state vgt-gsn-media-state--danger">
        <Icon name="alertTriangle" size={18} />
        <span>Bild konnte nicht entschlüsselt oder geprüft werden.</span>
      </div>
    );
  }

  return (
    <>
      <button type="button" className="vgt-gsn-media" onClick={() => setIsZoomed(true)} aria-label="Bild vergrößern">
        <img src={imgUrl} alt="Beitragsbild" loading="lazy" />
        <span className="vgt-gsn-media__hint">
          <Icon name="maximize" size={14} />
        </span>
      </button>
      {isZoomed && (
        <div ref={zoomRef} className="vgt-media-zoom" role="dialog" aria-modal="true" aria-label="Bildansicht" onMouseDown={event => {
          if (event.target === event.currentTarget) setIsZoomed(false);
        }}>
          <button
            type="button"
            className="btn-icon vgt-media-zoom__close"
            onClick={() => setIsZoomed(false)}
            aria-label="Bildansicht schließen"
            title="Schließen"
          >
            <Icon name="close" size={18} />
          </button>
          <img src={imgUrl} alt="Beitragsbild vergrößert" onClick={event => event.stopPropagation()} />
        </div>
      )}
    </>
  );
}
