import React from 'react';
import Icon from '../../ui/Icon';
import { avatarText, badgeCount, initialsMark, truncateText } from './format';

/**
 * VGT GLASS 2100 — conversation row (direct chat or group room).
 *
 * Same row anatomy as the mail list: quiet avatar mark, two-line hierarchy,
 * honest unread badge from App's real counter and a right-aligned state slot.
 * The whole row is one real <button>; the context menu stays on the <li>.
 */
export default function ConversationRow({
  kind,
  item,
  isActive,
  unreadCount,
  isPinned,
  onSelect,
  onContextMenu,
  t,
  displayGaiaID,
  formatBadgeCount
}) {
  const isGroup = kind === 'group';
  const name = isGroup ? (item.Name || '') : (item.displayName || '');
  const glyph = isGroup ? avatarText(item.Avatar, name) : initialsMark(name);
  const meta = isGroup
    ? (item.Description || ((typeof t === 'function' && t('no_description')) || 'Keine Beschreibung'))
    : (typeof displayGaiaID === 'function' ? displayGaiaID(item.gaiaID) : (item.gaiaID || ''));
  const preview = isGroup
    ? `${item.Members && item.Members.length ? item.Members.length : 0} ${(typeof t === 'function' && t('mitglieder')) || 'Mitglieder'}`
    : ((typeof t === 'function' && t('e2e_chat_room_open')) || 'E2E Chat-Raum öffnen');
  const badge = badgeCount(unreadCount, formatBadgeCount);
  const unreadLabel = badge ? `${unreadCount} ungelesene Nachrichten` : '';

  const rowClass = [
    'vgt-inbox-row',
    'vgt-inbox-row--conversation',
    isGroup ? 'is-group' : 'is-chat',
    isActive ? 'is-active' : '',
    badge ? 'is-unread' : '',
    isPinned ? 'is-pinned' : ''
  ].filter(Boolean).join(' ');

  return (
    <li
      className={rowClass}
      onContextMenu={onContextMenu ? (event) => onContextMenu(event, item, isGroup ? 'groups' : 'chat') : undefined}
    >
      <button
        type="button"
        className="vgt-inbox-row__main"
        onClick={onSelect}
        aria-current={isActive ? 'true' : undefined}
      >
        <span className="vgt-inbox-row__avatar" aria-hidden="true">{glyph}</span>
        <span className="vgt-inbox-row__body">
          <span className="vgt-inbox-row__line vgt-inbox-row__line--top">
            <span className="vgt-inbox-row__name">{name}</span>
            {isPinned ? (
              <span className="vgt-inbox-row__pin" title={(typeof t === 'function' && t('pinned')) || 'Angepinnt'}>
                <Icon name="pin" size={13} />
              </span>
            ) : null}
            {badge ? (
              <span className="vgt-inbox-row__badge vgt-numeric" title={unreadLabel}>{badge}</span>
            ) : null}
          </span>
          <span className="vgt-inbox-row__id">{truncateText(meta, 64)}</span>
          <span className="vgt-inbox-row__preview">{preview}</span>
        </span>
        {badge ? <span className="vgt-sr-only">{unreadLabel}</span> : null}
      </button>
    </li>
  );
}
