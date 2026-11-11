import React, { useEffect, useState } from 'react';
import * as api from '../../../api';
import * as crypto from '../../../crypto';
import { safeJsonParse } from '../../../utils/safeJson';
import {
  MAX_AVATAR_BYTES,
  assertImageBlob,
  exceedsLimit,
  limitError
} from '../../../utils/mediaLimits';
import Icon from '../../ui/Icon';
import { isMediaKnownMissing, markMediaMissing, isMissingMediaError } from '../../../utils/mediaFailureCache';

/**
 * Bounded object-URL cache (SEC-FE FE-10): at most 64 decrypted avatars stay
 * alive; the oldest entry is revoked when the cache overflows and a cache hit
 * refreshes its recency. Without this the module-level map was unbounded across
 * long sessions and many contacts.
 */
const AVATAR_URL_CACHE_LIMIT = 64;
const avatarUrlCache = new Map();

function takeCachedAvatarUrl(fileId) {
  if (!avatarUrlCache.has(fileId)) return '';
  const url = avatarUrlCache.get(fileId);
  avatarUrlCache.delete(fileId);
  avatarUrlCache.set(fileId, url);
  return url;
}

function rememberAvatarUrl(fileId, url) {
  if (avatarUrlCache.size >= AVATAR_URL_CACHE_LIMIT) {
    const oldestKey = avatarUrlCache.keys().next().value;
    const oldestUrl = avatarUrlCache.get(oldestKey);
    avatarUrlCache.delete(oldestKey);
    if (oldestUrl) URL.revokeObjectURL(oldestUrl);
  }
  avatarUrlCache.set(fileId, url);
}

/**
 * Decrypts a GSN avatar envelope from object storage. The decryption boundary is
 * unchanged (download -> AES-GCM decrypt -> object URL) but now byte-capped
 * before decrypt and magic-byte checked after decrypt (SEC-FE FE-03).
 */
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
    const load = async () => {
      try {
        const att = safeJsonParse(avatarJson, null);
        if (!att) throw new Error('Invalid avatar envelope.');

        const cached = takeCachedAvatarUrl(att.fileId);
        if (cached) {
          setImgUrl(cached);
          setLoading(false);
          return;
        }

        if (isMediaKnownMissing(att.fileId)) {
          if (active) { setError(true); setLoading(false); }
          return;
        }
        const blob = await api.downloadFileAttachment(att.fileId, { maxBytes: MAX_AVATAR_BYTES });
        if (exceedsLimit(blob?.size, MAX_AVATAR_BYTES)) {
          throw limitError('Der Avatar', MAX_AVATAR_BYTES);
        }
        const decrypted = await crypto.decryptFileSymmetric(blob, att.keyHex, att.ivHex);
        if (exceedsLimit(decrypted?.size, MAX_AVATAR_BYTES)) {
          throw limitError('Der Avatar', MAX_AVATAR_BYTES);
        }
        await assertImageBlob(decrypted, 'Der Avatar');
        if (active) {
          const createdUrl = URL.createObjectURL(decrypted);
          rememberAvatarUrl(att.fileId, createdUrl);
          setImgUrl(createdUrl);
          setLoading(false);
        }
      } catch (err) {
        const expectedMissingFile = isMissingMediaError(err);
        if (expectedMissingFile) markMediaMissing(safeJsonParse(avatarJson, null)?.fileId);
        if (!expectedMissingFile) {
          console.error('Failed to decrypt GSN avatar:', err);
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

  const colorBucket = Math.abs(hash) % 6;
  const variantClass = variant === 'profile' || variant === 'editor' ? ` vgt-gsn-avatar--${variant}` : '';

  if (loading) {
    return (
      <span className={`vgt-gsn-avatar vgt-gsn-avatar--loading${variantClass}`} role="status" aria-label="Avatar wird entschlüsselt">
        <Icon name="spinner" size={14} />
      </span>
    );
  }

  if (error || !imgUrl) {
    const isGlyph = avatarJson && avatarJson.length <= 4;
    return (
      <span className={`vgt-gsn-avatar vgt-gsn-avatar--${colorBucket}${variantClass}`} aria-hidden="true">
        {isGlyph ? avatarJson : initial}
      </span>
    );
  }

  return <img src={imgUrl} alt={displayName || 'Avatar'} className={`vgt-gsn-avatar vgt-gsn-avatar--image${variantClass}`} loading="lazy" />;
}
