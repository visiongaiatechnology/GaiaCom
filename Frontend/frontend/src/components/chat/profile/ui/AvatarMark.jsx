import React from 'react';
import DecryptedAvatar from '../../gsn/DecryptedAvatar';

/**
 * One avatar representation for the whole identity area.
 *
 * The stored profile avatar is user data and can be one of three shapes:
 * an encrypted file reference (`{"fileId":...}`), an inline data URL, or a
 * short identity glyph chosen from the preset list. Only when all three are
 * absent do we fall back to the display-name initials, so no fake identity
 * symbol is invented.
 */
export function initialsFor(displayName) {
  const source = String(displayName || '').trim();
  if (!source) return '';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

export default function AvatarMark({
  avatar = '',
  displayName = '',
  variant = 'profile',
  className = '',
  alt = 'Avatar'
}) {
  const value = String(avatar || '');
  const initials = initialsFor(displayName);
  const classes = ['vgt-avatar-mark', `vgt-avatar-mark--${variant}`, className].filter(Boolean).join(' ');

  if (value.startsWith('{"fileId"')) {
    return (
      <span className={classes}>
        <DecryptedAvatar avatarJson={value} displayName={displayName} variant={variant} />
      </span>
    );
  }

  if (value.startsWith('data:image/')) {
    return (
      <span className={classes}>
        <img src={value} alt={alt} />
      </span>
    );
  }

  if (value.trim()) {
    return (
      <span className={classes} role="img" aria-label={`Avatar ${displayName || ''}`.trim()}>
        <span className="vgt-avatar-mark__glyph" aria-hidden="true">{value}</span>
      </span>
    );
  }

  return (
    <span className={classes} aria-hidden={initials ? 'true' : undefined}>
      <span className="vgt-avatar-mark__initials">{initials || '?'}</span>
    </span>
  );
}
