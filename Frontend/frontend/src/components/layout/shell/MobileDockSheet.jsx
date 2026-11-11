import React from 'react';
import Icon from '../../ui/Icon';
import { tr } from './shellRailFormat';

/**
 * "Mehr" sheet of the mobile navigation dock.
 *
 * It only exposes destinations that need no additional selection side effect
 * (a plain menu switch, exactly like the dock items). Destinations that carry
 * extra state resets (Channels, Profil) stay reachable through the full rail,
 * which is opened from the last row instead of being guessed here.
 */
export default function MobileDockSheet({
  items,
  currentMenu,
  onSelect,
  onOpenSidebar,
  onClose,
  t
}) {
  const title = tr(t, 'more_areas', 'Weitere Bereiche');

  return (
    <div className="vgt-dock__sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="vgt-dock__scrim"
        aria-label={tr(t, 'menu_close', 'Schließen')}
        onClick={onClose}
      />
      <div className="vgt-dock__panel vgt-glass vgt-glass--modal">
        <div className="vgt-dock__panel-head">
          <span className="vgt-label">{title}</span>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label={tr(t, 'menu_close', 'Schließen')}
            autoFocus
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="vgt-dock__panel-list">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className="vgt-dock__panel-item"
              aria-current={currentMenu === item.key ? 'page' : undefined}
              onClick={() => onSelect(item.key)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="vgt-dock__panel-more" onClick={onOpenSidebar}>
          <Icon name="menu" size={16} />
          {tr(t, 'all_areas', 'Alle Bereiche')}
          <Icon name="chevronRight" size={14} className="vgt-dock__panel-chevron" />
        </button>
      </div>
    </div>
  );
}
