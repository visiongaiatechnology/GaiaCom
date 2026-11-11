import React from 'react';
import Icon from '../ui/Icon';
import MobileDockSheet from './shell/MobileDockSheet';
import { tr, badgeText } from './shell/shellRailFormat';

const ACTIVE_MAIL_MENUS = new Set([
  'inbox', 'drafts', 'sent', 'starred', 'important', 'snoozed', 'archive', 'spam', 'trash',
  'smtp_inbox', 'smtp_drafts', 'smtp_sent', 'smtp_starred', 'smtp_important', 'smtp_snoozed',
  'smtp_archive', 'smtp_spam', 'smtp_trash'
]);

/** Menus that are reachable through the "Mehr" sheet / full rail. */
const MORE_MENUS = new Set([
  'security_center', 'profile', 'vault', 'contacts', 'gaiadrop',
  'public_channels', 'gsn', 'network_health', 'abuse_center'
]);

/**
 * MobileNavigationDock — Z3 floating glass bottom dock with four primary
 * destinations plus a "Mehr" sheet. Counts come from real props only, the
 * active destination is exposed with `aria-current="page"` and every target is
 * at least 44px tall with safe-area insets respected by the stylesheet.
 */
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
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sheetOpen]);

  const select = React.useCallback((menu, afterSelect) => {
    setCurrentMenu(menu);
    setIsComposing(false);
    setSelectedMail(null);
    afterSelect?.();
    setSheetOpen(false);
  }, [setCurrentMenu, setIsComposing, setSelectedMail]);

  const items = [
    { key: 'dashboard', label: tr(t, 'dashboard', 'Start'), icon: 'activity', active: currentMenu === 'dashboard' },
    { key: 'inbox', label: 'Mail', icon: 'inbox', active: ACTIVE_MAIL_MENUS.has(currentMenu), count: unreadEmailsCount },
    {
      key: 'chat',
      label: tr(t, 'quanten_chat', 'Chats'),
      icon: 'chat',
      active: currentMenu === 'chat',
      count: unreadChatsTotal,
      afterSelect: () => {
        if (contacts.length > 0) setActiveChatContact((current) => current || contacts[0]);
      }
    },
    {
      key: 'groups',
      label: tr(t, 'gruppen_chats', 'Räume'),
      icon: 'users',
      active: currentMenu === 'groups',
      count: unreadRoomsTotal,
      afterSelect: () => {
        if (rooms.length > 0) setActiveRoom((current) => current || rooms[0]);
      }
    }
  ];

  const moreItems = [
    { key: 'contacts', label: tr(t, 'adressbuch', 'Adressbuch'), icon: 'users' },
    { key: 'vault', label: tr(t, 'gaiadrive', 'GaiaDrive'), icon: 'drive' },
    { key: 'gaiadrop', label: tr(t, 'drop_title', 'GaiaDrop'), icon: 'download' },
    { key: 'gsn', label: 'GSN Social', icon: 'globe' },
    { key: 'security_center', label: 'Security Center', icon: 'shieldCheck' },
    { key: 'network_health', label: 'Network Health', icon: 'server' },
    { key: 'abuse_center', label: tr(t, 'abuse_center_title', 'Abuse Center'), icon: 'alertOctagon' }
  ];

  const openSheet = () => setSheetOpen(true);
  const openSidebar = () => {
    setSheetOpen(false);
    setMobileMenuOpen(true);
  };

  return (
    <React.Fragment>
      <nav className="vgt-dock vgt-glass vgt-glass--floating" aria-label={tr(t, 'menu', 'Hauptnavigation')}>
        {items.map((item) => {
          const badge = badgeText(formatBadgeCount, item.count);
          return (
            <button
              key={item.key}
              type="button"
              className="vgt-dock__item"
              onClick={() => select(item.key, item.afterSelect)}
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="vgt-dock__icon">
                <Icon name={item.icon} size={20} />
                {badge ? <span className="vgt-dock__badge" aria-hidden="true">{badge}</span> : null}
              </span>
              <span className="vgt-dock__label">{item.label}</span>
              {badge ? <span className="vgt-sr-only">{`${badge} ${tr(t, 'unread_emails', 'ungelesen')}`}</span> : null}
            </button>
          );
        })}

        <button
          type="button"
          className="vgt-dock__item"
          onClick={openSheet}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-current={MORE_MENUS.has(currentMenu) ? 'page' : undefined}
        >
          <span className="vgt-dock__icon"><Icon name="more" size={20} /></span>
          <span className="vgt-dock__label">{tr(t, 'menu', 'Mehr')}</span>
        </button>
      </nav>

      {sheetOpen ? (
        <MobileDockSheet
          items={moreItems}
          currentMenu={currentMenu}
          onSelect={(menu) => select(menu)}
          onOpenSidebar={openSidebar}
          onClose={() => setSheetOpen(false)}
          t={t}
        />
      ) : null}
    </React.Fragment>
  );
}
