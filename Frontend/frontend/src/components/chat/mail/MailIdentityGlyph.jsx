import React from 'react';
import Icon from '../../ui/Icon';
import { getAddressInitials } from './mailUtils';

/**
 * Quiet identity glyph. It renders initials derived from the real address (or
 * the one identity icon) and never fabricates a profile image.
 */
export default function MailIdentityGlyph({ name, address, size = 'md' }) {
  const initials = getAddressInitials(name || address);
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  return (
    <span className={`vgt-mail-avatar vgt-mail-avatar--${size}`} aria-hidden="true">
      {initials || <Icon name="user" size={iconSize} />}
    </span>
  );
}
