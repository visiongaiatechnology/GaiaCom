import React, { useEffect, useState } from 'react';
import Icon from '../../ui/Icon';
import { useTranslation } from '../../../utils/i18n';
import {
  MAX_CHANNEL_IMAGE_BYTES,
  assertImageSignatureFromBytes,
  exceedsLimit,
  limitError
} from '../../../utils/mediaLimits';

/**
 * VGT GLASS 2100 — Public Channels: media, formatting and content vocabularies.
 *
 * Decryption boundaries are intentionally unchanged from the pre-redesign
 * implementation: images are AES-GCM encrypted in the browser, stored as an
 * `encrypted-image` envelope and decrypted only for display via an object URL
 * that is revoked on unmount.
 */

export const MAX_POST_CHARS = 3000;

export const CHANNEL_CATEGORIES = ['All', 'General', 'Tech', 'News', 'Sports', 'Entertainment'];

/**
 * Protocol constants, not decoration: the backend validates channel post
 * reactions against exactly this set (Backend/publicchannels/service.go
 * `allowedPostReactionEmojis`). Heart is first because it is the default
 * reaction; additional emojis open in the hover/long-press palette.
 */
export const CHANNEL_REACTIONS = [
  '\u{2764}\u{FE0F}',
  '\u{1F44D}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F525}',
  '\u{2728}',
  '\u{1F6E1}\u{FE0F}'
];

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

export function base64ToArrayBuffer(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export async function compressImage(file, maxSide = 1280, quality = 0.76) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      result => (result ? resolve(result) : reject(new Error('Image compression failed.'))),
      'image/webp',
      quality
    );
  });
  bitmap.close?.();
  return blob;
}

export async function encryptImageBlob(blob, name) {
  const keyBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, await blob.arrayBuffer());
  return {
    type: 'encrypted-image',
    algorithm: 'AES-256-GCM',
    name,
    mime: 'image/webp',
    size: blob.size,
    iv: arrayBufferToBase64(iv.buffer),
    key: arrayBufferToBase64(keyBytes.buffer),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
}

export function useDecryptedImage(attachment) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let revoked = '';
    let mounted = true;
    async function decrypt() {
      if (!attachment?.ciphertext || !attachment?.key || !attachment?.iv) {
        setUrl('');
        return;
      }
      try {
        const keyBytes = base64ToArrayBuffer(attachment.key);
        const iv = new Uint8Array(base64ToArrayBuffer(attachment.iv));
        const ciphertext = base64ToArrayBuffer(attachment.ciphertext);
        // SEC-FE FE-03: cap before decrypt; validate image magic bytes after.
        if (exceedsLimit(ciphertext.byteLength, MAX_CHANNEL_IMAGE_BYTES)) {
          throw limitError('Das Kanalbild', MAX_CHANNEL_IMAGE_BYTES);
        }
        const cryptoKey = await window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
        const plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
        assertImageSignatureFromBytes(new Uint8Array(plain), 'Das Kanalbild');
        const objectUrl = URL.createObjectURL(new Blob([plain], { type: attachment.mime || 'image/webp' }));
        revoked = objectUrl;
        if (mounted) {
          setUrl(objectUrl);
        }
      } catch (_) {
        if (mounted) {
          setUrl('');
        }
      }
    }
    decrypt();
    return () => {
      mounted = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [attachment]);

  return url;
}

export function ChannelAvatar({ avatar, name, size = 'md' }) {
  const avatarObject = avatar && typeof avatar === 'object' ? avatar : null;
  const url = useDecryptedImage(avatarObject?.type === 'encrypted-image' ? avatarObject : null);
  return (
    <span className={`vgt-ch-avatar vgt-ch-avatar--${size}`} aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" /> : <span>{String(name || 'C').slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

export function EncryptedImage({ attachment }) {
  const url = useDecryptedImage(attachment);
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  if (!url) {
    return (
      <figure className="vgt-ch-media vgt-ch-media--missing">
        <div className="vgt-ch-media-unavailable" role="status">
          <Icon name="image" size={22} />
          <span>{t('ui_ch_image_unavailable') || 'Verschlüsseltes Bild nicht verfügbar'}</span>
        </div>
      </figure>
    );
  }

  const imageAlt = attachment?.name || t('ui_ch_attachment') || 'Kanal-Anhang';

  return (
    <figure className="vgt-ch-media">
      <button
        type="button"
        className="vgt-ch-media__open"
        onClick={() => setExpanded(true)}
        aria-label={`${imageAlt} ${t('ui_ch_image_expand') || 'vergrößern'}`}
      >
        <img className="vgt-ch-post-media" src={url} alt={imageAlt} loading="lazy" />
        <span className="vgt-ch-media__expand" aria-hidden="true">
          <Icon name="maximize" size={14} />
        </span>
      </button>
      {attachment?.name && <figcaption className="vgt-ch-media__caption">{attachment.name}</figcaption>}
      {expanded && (
        <div
          className="vgt-ch-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={imageAlt}
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="vgt-ch-lightbox__close"
            aria-label={t('ui_ch_image_close') || 'Bild schließen'}
            onClick={event => {
              event.stopPropagation();
              setExpanded(false);
            }}
          >
            <Icon name="close" size={18} />
          </button>
          <img src={url} alt={imageAlt} onClick={event => event.stopPropagation()} />
        </div>
      )}
    </figure>
  );
}

const DATE_FORMAT = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };

export function formatChannelDate(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale || [], DATE_FORMAT);
}
