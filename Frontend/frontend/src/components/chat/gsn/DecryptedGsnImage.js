// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useEffect, useState } from 'react';
import * as api from '../../../api';
import * as crypto from '../../../crypto';
import { safeJsonParse } from '../../../utils/safeJson';

export default function DecryptedGsnImage({ attachmentJson }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = "";
    const load = async () => {
      try {
        const att = safeJsonParse(attachmentJson, null);
        if (!att) throw new Error('Invalid attachment envelope.');
        const blob = await api.downloadFileAttachment(att.fileId);
        const decrypted = await crypto.decryptFileSymmetric(blob, att.keyHex, att.ivHex);
        if (active) {
          createdUrl = URL.createObjectURL(decrypted);
          setImgUrl(createdUrl);
          setLoading(false);
        }
      } catch (err) {
        const message = String(err?.message || err || '');
        const expectedMissingFile = message.includes('File expired or deleted');
        if (!expectedMissingFile) {
          console.error("Failed to decrypt GSN image:", err);
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
      <div className="gsn-img-placeholder">
        ⏳ Bild wird entschlüsselt...
      </div>
    );
  }
  if (isExpired) {
    return (
      <div className="gsn-img-expired">
        ⏱️ Bild nach automatischer Aufbewahrungsfrist abgelaufen.
      </div>
    );
  }
  if (error) {
    return <div className="gsn-img-error">⚠️ Bild konnte nicht entschlüsselt werden.</div>;
  }

  return (
    <>
      <img
        src={imgUrl}
        alt="GSN Beitrag"
        className="gsn-post-img gsn-post-img-zoomable"
        onClick={() => setIsZoomed(true)}
      />
      {isZoomed && (
        <div className="gsn-image-zoom-overlay" onClick={() => setIsZoomed(false)}>
          <img
            src={imgUrl}
            alt="GSN Beitrag vergrößert"
            className="gsn-image-zoom-content"
          />
        </div>
      )}
    </>
  );
}
