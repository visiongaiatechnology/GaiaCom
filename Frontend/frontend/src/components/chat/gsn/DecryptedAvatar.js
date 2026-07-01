// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useEffect, useState } from 'react';
import * as api from '../../../api';
import * as crypto from '../../../crypto';
import { safeJsonParse } from '../../../utils/safeJson';

const avatarUrlCache = new Map();

export default function DecryptedAvatar({ avatarJson, displayName, variant = 'default' }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!avatarJson || !avatarJson.startsWith('{"fileId"')) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    let createdUrl = "";
    const load = async () => {
      try {
        const att = safeJsonParse(avatarJson, null);
        if (!att) throw new Error('Invalid avatar envelope.');

        if (avatarUrlCache.has(att.fileId)) {
          setImgUrl(avatarUrlCache.get(att.fileId));
          setLoading(false);
          return;
        }

        const blob = await api.downloadFileAttachment(att.fileId);
        const decrypted = await crypto.decryptFileSymmetric(blob, att.keyHex, att.ivHex);
        if (active) {
          createdUrl = URL.createObjectURL(decrypted);
          avatarUrlCache.set(att.fileId, createdUrl);
          setImgUrl(createdUrl);
          setLoading(false);
        }
      } catch (err) {
        const message = String(err?.message || err || '');
        if (!message.includes('File expired or deleted')) {
          console.error("Failed to decrypt GSN avatar:", err);
        }
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [avatarJson]);

  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
  let hash = 0;
  for (let i = 0; i < (displayName || '').length; i++) {
    hash = (displayName || '').charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorBucket = Math.abs(hash) % 12;
  const variantClass = variant === 'profile' || variant === 'editor' ? ` gsn-avatar-${variant}` : '';

  if (loading) {
    return (
      <div className={`gsn-avatar gsn-avatar-loading${variantClass}`}>
        ⏳
      </div>
    );
  }

  if (error || !imgUrl) {
    const isEmoji = avatarJson && avatarJson.length <= 4;
    return (
      <div className={`gsn-avatar gsn-avatar-color-${colorBucket}${variantClass}`}>
        {isEmoji ? avatarJson : initial}
      </div>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={displayName}
      className={`gsn-avatar gsn-avatar-image${variantClass}`}
    />
  );
}
