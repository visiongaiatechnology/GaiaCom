import React from 'react';
import Icon from '../ui/Icon';
import AvatarMark from '../chat/profile/ui/AvatarMark';
import LanguageMenu from '../common/LanguageMenu';
import WindowControls from './WindowControls';
import { displayGaiaID } from '../../utils/gaiaAddress';
import { useTranslation } from '../../utils/i18n';

const DESTINATIONS = [
  { menu: 'dashboard', key: 'dashboard', fallback: 'Dashboard', icon: 'grid' },
  { menu: 'inbox', label: 'GaiaMail', icon: 'mail' },
  { menu: 'chat', key: 'quanten_chat', fallback: 'Quanten-Chat', icon: 'chat' },
  { menu: 'groups', key: 'gruppen_chats', fallback: 'Gruppen-Chats', icon: 'users' },
  { menu: 'public_channels', key: 'kanaele', fallback: 'Channels', icon: 'radio' },
  { menu: 'gsn', label: 'GSN Social', icon: 'globe' },
  { menu: 'vault', key: 'ui_files', fallback: 'Dateien', icon: 'drive' },
  { menu: 'security_center', key: 'sc_title', fallback: 'Security Center', icon: 'shieldCheck' },
  { menu: 'profile', key: 'ui_settings', fallback: 'Einstellungen', icon: 'settings' }
];

function destinationLabel(item, t) {
  return item.key ? (t(item.key) || item.fallback) : item.label;
}

const MENU_TITLES = {
  dashboard: { icon: 'grid', title: t => t('dashboard') || 'Dashboard' },
  inbox: { icon: 'mail', title: t => `GaiaMail – ${t('posteingang') || 'Posteingang'}` },
  drafts: { icon: 'mail', title: t => `GaiaMail – ${t('entwuerfe') || 'Entwürfe'}` },
  sent: { icon: 'mail', title: t => `GaiaMail – ${t('gesendet') || 'Gesendet'}` },
  starred: { icon: 'mail', title: t => `GaiaMail – ${t('markiert') || 'Markiert'}` },
  trash: { icon: 'mail', title: t => `GaiaMail – ${t('papierkorb') || 'Papierkorb'}` },
  archive: { icon: 'mail', title: t => `GaiaMail – ${t('archiv') || 'Archiv'}` },
  spam: { icon: 'mail', title: t => `GaiaMail – ${t('spam') || 'Spam'}` },
  chat: { icon: 'chat', title: t => t('quanten_chat') || 'Quanten-Chat' },
  groups: { icon: 'users', title: t => t('gruppen_chats') || 'Gruppen-Chats' },
  public_channels: { icon: 'radio', title: t => t('kanaele') || 'Channels' },
  gsn: { icon: 'globe', title: () => 'GSN Social' },
  contacts: { icon: 'users', title: t => t('adressbuch') || 'Adressbuch' },
  vault: { icon: 'drive', title: t => t('gaiadrive') || 'GaiaDrive' },
  gaiadrop: { icon: 'download', title: () => 'GaiaDrop' },
  security_center: { icon: 'shieldCheck', title: t => t('sc_title') || 'Security Center' },
  network_health: { icon: 'server', title: () => 'Network Health' },
  abuse_center: { icon: 'alertOctagon', title: () => 'Abuse Center' },
  profile: { icon: 'settings', title: t => t('ui_settings') || 'Einstellungen' }
};

/**
 * AuroraTopBar — modern application topbar matching the GaiaCOM reference.
 * Left: Active area icon and heading.
 * Right: Global search (Ctrl+K), notification bell with unread dot, user avatar with online dot & profile menu,
 * and custom Desktop Window Controls (minimize / maximize / close) with seamless Tauri drag region.
 */
export default function AuroraTopBar({
  currentMenu,
  setCurrentMenu,
  activeIdentity,
  displayGaiaID: displayFn = displayGaiaID,
  serverVersion,
  serverConsensus,
  isComposing = false,
  profileAvatar,
  unreadCount = 0,
  onLockVault,
  onLogout
}) {
  const [query, setQuery] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const inputRef = React.useRef(null);
  const searchWrapRef = React.useRef(null);
  const profileWrapRef = React.useRef(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    const onClick = (event) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (profileWrapRef.current && !profileWrapRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onClick);
    };
  }, []);

  const normalized = query.trim().toLowerCase();
  const destinations = DESTINATIONS.map(item => ({ ...item, label: destinationLabel(item, t) }));
  const results = destinations.filter((item) => !normalized || item.label.toLowerCase().includes(normalized));

  const go = (menu) => {
    setSearchOpen(false);
    setProfileOpen(false);
    setQuery('');
    if (typeof setCurrentMenu === 'function') setCurrentMenu(menu);
  };

  const handleToggleMaximize = async () => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().toggleMaximize();
      } catch { /* ignore */ }
    }
  };

  const activeMeta = isComposing && (currentMenu === 'inbox' || currentMenu === 'drafts' || currentMenu === 'sent')
    ? { title: `GaiaMail – ${t('verfassen') || 'Verfassen'}`, icon: 'edit' }
    : (MENU_TITLES[currentMenu]
      ? { title: MENU_TITLES[currentMenu].title(t), icon: MENU_TITLES[currentMenu].icon }
      : { title: 'GaiaCOM', icon: 'shieldCheck' });

  const name = activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.Username || 'GaiaCom User';
  const gaiaId = displayFn ? displayFn(activeIdentity?.GaiaID || activeIdentity?.gaiaID || '') : '';

  return (
    <header className="ax4-topbar" data-tauri-drag-region="true" onDoubleClick={handleToggleMaximize}>
      <div className="ax4-topbar__left" data-tauri-drag-region="true">
        <span className="ax4-topbar__brandmark" aria-hidden="true" data-tauri-drag-region="true">
          <img src="/brand/gaiacom-mark.webp" width="22" height="22" alt="" draggable="false" />
        </span>
        <span className="ax4-topbar__icon" aria-hidden="true">
          <Icon name={activeMeta.icon} size={20} />
        </span>
        <h1 className="ax4-topbar__heading" data-tauri-drag-region="true">
          {activeMeta.title}
        </h1>
      </div>

      <div className="ax4-topbar__right" data-tauri-drag-region="true">
        <div className="ax4-search" ref={searchWrapRef}>
          <label className="ax4-sr" htmlFor="ax4-global-search">{t('ui_search_global') || 'Global suchen'}</label>
          <Icon name="search" size={16} />
          <input
            id="ax4-global-search"
            ref={inputRef}
            type="search"
            value={query}
            placeholder={`${t('ui_search_global') || 'Global suchen'}…`}
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) go(results[0].menu);
            }}
            aria-expanded={searchOpen}
            aria-controls="ax4-search-results"
          />
          <kbd>Ctrl + K</kbd>
          {searchOpen && (
            <ul className="ax4-search__results" id="ax4-search-results" role="listbox">
              {results.length === 0 ? (
                <li className="ax4-search__empty">{t('no_results') || 'Kein Ziel gefunden'}</li>
              ) : results.map((item) => (
                <li key={item.menu}>
                  <button type="button" role="option" aria-selected={currentMenu === item.menu} onClick={() => go(item.menu)}>
                    <Icon name={item.icon} size={15} />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ax4-topbar__actions">
          <LanguageMenu />
          <button
            type="button"
            className="ax4-topbar__bell"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label={t('ui_notifications') || 'Benachrichtigungen'}
            title={t('ui_notifications') || 'Benachrichtigungen'}
          >
            <Icon name="bell" size={18} />
            {unreadCount > 0 && (
              <span className="ax4-topbar__bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          <div className="ax4-topbar__profile" ref={profileWrapRef}>
            <button
              type="button"
              className="ax4-topbar__avatar-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-label={t('ui_profile_status') || 'Benutzerprofil und Status'}
              aria-expanded={profileOpen}
            >
              <div className="ax4-topbar__avatar-wrap">
                <AvatarMark
                  avatar={profileAvatar || ''}
                  displayName={name}
                  variant="default"
                  className="ax4-topbar__avatar-img"
                />
                <span className="ax4-topbar__status-dot" aria-label="Online" title="Online" />
              </div>
              <Icon name="chevronDown" size={14} className="ax4-topbar__avatar-chevron" />
            </button>

            {profileOpen && (
              <div className="ax4-profile-menu">
                <div className="ax4-profile-menu__user">
                  <div className="ax4-profile-menu__name">{name}</div>
                  <div className="ax4-profile-menu__id">{gaiaId || 'PQC ID'}</div>
                  <div className="ax4-profile-menu__pqc">
                    <Icon name="shieldCheck" size={13} />
                    <span>{t('ui_pqc_encrypted') || 'Post-Quantum verschlüsselt'}</span>
                  </div>
                </div>
                <div className="ax4-profile-menu__divider" />
                <button type="button" className="ax4-profile-menu__item" onClick={() => go('profile')}>
                  <Icon name="settings" size={16} />
                  <span>{t('ui_my_profile_settings') || 'Mein Profil & Einstellungen'}</span>
                </button>
                <button type="button" className="ax4-profile-menu__item" onClick={() => go('security_center')}>
                  <Icon name="shieldCheck" size={16} />
                  <span>{t('sc_title') || 'Security Center'}</span>
                </button>
                {onLockVault && (
                  <button type="button" className="ax4-profile-menu__item" onClick={() => { setProfileOpen(false); onLockVault(); }}>
                    <Icon name="lock" size={16} />
                    <span>{t('ui_lock_session') || 'Sitzung sperren'}</span>
                  </button>
                )}
                {onLogout && (
                  <button type="button" className="ax4-profile-menu__item is-danger" onClick={() => { setProfileOpen(false); onLogout(); }}>
                    <Icon name="logout" size={16} />
                    <span>{t('logout') || 'Abmelden'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <WindowControls />
      </div>
    </header>
  );
}
