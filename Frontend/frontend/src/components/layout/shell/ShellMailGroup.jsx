import React from 'react';
import Icon from '../../ui/Icon';
import ShellNavItem from './ShellNavItem';

const FOLDER_ICONS = Object.freeze({
  inbox: 'inbox',
  drafts: 'fileText',
  sent: 'send',
  starred: 'star',
  important: 'bookmark',
  snoozed: 'clock',
  archive: 'archive',
  spam: 'alertTriangle',
  trash: 'trash'
});

/**
 * A mail account group: one disclosure row (account + honest unread count) and
 * its folder list. The folders stay real buttons with `aria-current="page"` so
 * the active mailbox is perceivable for keyboard and screen-reader users.
 */
export default function ShellMailGroup({
  controlId,
  label,
  icon,
  active = false,
  open = false,
  badge = null,
  badgeLabel = null,
  onToggle,
  folders,
  currentMenu,
  onSelectFolder
}) {
  return (
    <div className="vgt-nav__group">
      <button
        type="button"
        className="vgt-nav__item vgt-nav__item--group"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={controlId}
        data-active={active ? 'true' : undefined}
      >
        <Icon name={icon} size={18} />
        <span className="vgt-nav__text">{label}</span>
        {badge ? <span className="vgt-nav__badge" aria-hidden="true">{badge}</span> : null}
        {badge && badgeLabel ? <span className="vgt-sr-only">{badgeLabel}</span> : null}
        <Icon name="chevronDown" size={14} className="vgt-nav__chevron" />
      </button>

      {open ? (
        <div className="vgt-nav__sub" id={controlId}>
          {folders.map((folder) => (
            <ShellNavItem
              key={folder.key}
              sub
              icon={FOLDER_ICONS[folder.slot] || 'inbox'}
              label={folder.label}
              active={currentMenu === folder.key}
              onSelect={() => onSelectFolder(folder.key)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
