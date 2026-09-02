import React from 'react';
import Icons from '../common/Icons';

const mailMenus = new Set([
  'inbox', 'drafts', 'sent', 'starred', 'important', 'snoozed', 'archive', 'spam', 'trash',
  'smtp_inbox', 'smtp_drafts', 'smtp_sent', 'smtp_starred', 'smtp_important', 'smtp_snoozed', 'smtp_archive', 'smtp_spam', 'smtp_trash'
]);

export default function MobileNavigationDock({
  currentMenu,
  setCurrentMenu,
  setIsComposing,
  setSelectedMail,
  setActiveChatContact,
  setActiveRoom,
  setMobileMenuOpen,
  contacts,
  rooms,
  unreadEmailsCount,
  unreadChatsTotal,
  unreadRoomsTotal,
  formatBadgeCount,
  t
}) {
  const select = React.useCallback((menu, afterSelect) => {
    setCurrentMenu(menu);
    setIsComposing(false);
    setSelectedMail(null);
    afterSelect?.();
  }, [setCurrentMenu, setIsComposing, setSelectedMail]);

  const items = [
    { key: 'dashboard', label: t('dashboard') || 'Start', icon: Icons.Activity, active: currentMenu === 'dashboard' },
    { key: 'inbox', label: 'Mail', icon: Icons.Inbox, active: mailMenus.has(currentMenu), count: unreadEmailsCount },
    {
      key: 'chat',
      label: t('quanten_chat') || 'Chats',
      icon: Icons.Chat,
      active: currentMenu === 'chat',
      count: unreadChatsTotal,
      afterSelect: () => {
        if (contacts.length > 0) setActiveChatContact(current => current || contacts[0]);
      }
    },
    {
      key: 'groups',
      label: t('gruppen_chats') || 'Räume',
      icon: Icons.Groups,
      active: currentMenu === 'groups',
      count: unreadRoomsTotal,
      afterSelect: () => {
        if (rooms.length > 0) setActiveRoom(current => current || rooms[0]);
      }
    }
  ];

  return (
    <nav className="mobile-navigation-dock" aria-label={t('menu') || 'Hauptnavigation'}>
      {items.map(({ key, label, icon: Icon, active, count, afterSelect }) => (
        <button
          key={key}
          type="button"
          className={`mobile-navigation-item ${active ? 'active' : ''}`}
          onClick={() => select(key, afterSelect)}
          aria-current={active ? 'page' : undefined}
        >
          <span className="mobile-navigation-icon">
            <Icon />
            {count > 0 && <span className="mobile-navigation-badge">{formatBadgeCount(count)}</span>}
          </span>
          <span>{label}</span>
        </button>
      ))}
      <button
        type="button"
        className={`mobile-navigation-item ${['security_center', 'profile', 'vault', 'contacts', 'gaiadrop', 'public_channels', 'gsn'].includes(currentMenu) ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(true)}
        aria-label={t('menu') || 'Mehr'}
      >
        <span className="mobile-navigation-icon"><Icons.Shield /></span>
        <span>{t('menu') || 'Mehr'}</span>
      </button>
    </nav>
  );
}
