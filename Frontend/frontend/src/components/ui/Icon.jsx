import React from 'react';
import { navigationIcons } from './icons/navigation';
import { securityIcons } from './icons/security';
import { communicationIcons } from './icons/communication';
import { actionIcons } from './icons/actions';
import { fileIcons } from './icons/files';
import { statusIcons } from './icons/status';

/**
 * VGT GLASS 2100 icon system.
 *
 * One consistent hand-authored 24x24 stroke icon set, bundled locally as React
 * components (no icon CDN, no emoji pseudo-icons). Icons are decorative by
 * default and inherit `currentColor`; pass `title` only when the icon carries
 * meaning that is not already present in adjacent text.
 */
const ICONS = Object.freeze({
  ...navigationIcons,
  ...securityIcons,
  ...communicationIcons,
  ...actionIcons,
  ...fileIcons,
  ...statusIcons
});

export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.6,
  title,
  className,
  ...rest
}) {
  const glyph = ICONS[name];
  if (!glyph) {
    if (typeof console !== 'undefined') {
      console.warn(`[vgt-ui] Unknown icon "${name}"`);
    }
    return null;
  }

  const accessible = Boolean(title);

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `vgt-icon ${className}` : 'vgt-icon'}
      role={accessible ? 'img' : undefined}
      aria-hidden={accessible ? undefined : 'true'}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {glyph}
    </svg>
  );
}
