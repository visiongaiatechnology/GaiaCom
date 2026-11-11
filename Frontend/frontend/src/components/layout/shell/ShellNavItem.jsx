import React from 'react';
import { BrandIcon } from '../../ui/BrandIcon';
import Icon from '../../ui/Icon';

/**
 * One primary navigation destination in the workspace rail.
 *
 * Renders high-DPI 3D glass icons matching Astraea SecureSpace.
 * The active state is carried by a cyan pigment hairline, an obsidian glass
 * surface gradient, white typography, and `aria-current="page"`.
 */
export default function ShellNavItem({
  icon,
  label,
  active = false,
  badge = null,
  badgeLabel = null,
  onSelect,
  sub = false
}) {
  const className = sub ? 'vgt-nav__sub-item' : 'vgt-nav__item';

  return (
    <button
      type="button"
      className={className}
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
    >
      <span className="vgt-nav__icon-box" aria-hidden="true">
        {icon ? (
          <BrandIcon name={icon} size={sub ? 16 : 20} className="vgt-nav__brand-icon" />
        ) : (
          <Icon name="grid" size={sub ? 15 : 18} />
        )}
      </span>
      <span className="vgt-nav__text">{label}</span>
      {badge ? (
        <span className="vgt-nav__badge" aria-hidden="true">{badge}</span>
      ) : null}
      {badge && badgeLabel ? <span className="vgt-sr-only">{badgeLabel}</span> : null}
    </button>
  );
}
