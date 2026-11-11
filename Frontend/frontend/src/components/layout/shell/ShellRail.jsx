import React, { useEffect, useState } from 'react';
import LogoMark from '../LogoMark';
import Icon from '../../ui/Icon';
import ShellNavItem from './ShellNavItem';
import GlobalSearchDialog from './GlobalSearchDialog';

const GAIA_MAIL_MENUS = [
  'inbox', 'drafts', 'sent', 'starred', 'important', 'snoozed', 'archive', 'spam', 'trash',
  'smtp_inbox', 'smtp_drafts', 'smtp_sent', 'smtp_starred', 'smtp_important',
  'smtp_snoozed', 'smtp_archive', 'smtp_spam', 'smtp_trash'
];

/**
 * ShellRail — Sovereign navigation rail matching the GaiaCOM reference interface.
 * Displays the glowing logo, clean primary destinations (Dashboard, GaiaMail, Quanten-Chat,
 * Gruppen-Chats, Channels, GSN Social, Dateien, GaiaDrive, Security Center, Network Health,
 * Abuse Center, Einstellungen), and the glowing network globe footer with live status.
 */
export default function ShellRail({
  currentMenu,
  t,
  formatBadgeCount,
  activeIdentity,
  identities,
  displayGaiaID,
  unreadDropsCount,
  unreadEmailsCount,
  unreadSmtpEmailsCount,
  unreadChatsTotal,
  unreadRoomsTotal,
  onSelectFolder,
  onDashboard,
  onChat,
  onGroups,
  onChannels,
  onGsn,
  onNetworkHealth,
  onSecurityCenter,
  onAbuseCenter,
  onContacts,
  onProfile,
  onVault,
  onGaiaDrop,
  onClose,
  onOpenSecurityDetails,
  serverVersion
}) {
  const mailTotal = (unreadEmailsCount || 0) + (unreadSmtpEmailsCount || 0);
  const mailBadge = mailTotal > 0 ? (formatBadgeCount ? formatBadgeCount(mailTotal) : String(mailTotal)) : null;
  const chatBadge = unreadChatsTotal > 0 ? (formatBadgeCount ? formatBadgeCount(unreadChatsTotal) : String(unreadChatsTotal)) : null;
  const roomBadge = unreadRoomsTotal > 0 ? (formatBadgeCount ? formatBadgeCount(unreadRoomsTotal) : String(unreadRoomsTotal)) : null;
  const dropBadge = unreadDropsCount > 0 ? (formatBadgeCount ? formatBadgeCount(unreadDropsCount) : String(unreadDropsCount)) : null;
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || String(event.key).toLowerCase() !== 'k') return;
      const target = event.target;
      const tagName = String(target?.tagName || '').toLowerCase();
      if (target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') return;
      event.preventDefault();
      setSearchOpen(open => !open);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const copyToClipboard = (value) => {
    try {
      navigator.clipboard?.writeText(value);
    } catch (_) {}
  };

  const isMailActive = GAIA_MAIL_MENUS.includes(currentMenu);

  return (
    <div className="vgt-rail">
      <div className="vgt-rail__brand">
        <LogoMark />
        {onClose && (
          <button
            type="button"
            className="btn-icon mobile-menu-close vgt-rail__close"
            onClick={onClose}
            aria-label={t('lp_nav_menu_close') || 'Menü schließen'}
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      <div className="vgt-rail__scroll gaia-scrollbar">
        <nav className="vgt-rail__nav" aria-label={t('lp_nav_main_aria') || 'Hauptnavigation'}>
          <ShellNavItem
            icon="grid"
            label={t('dashboard') || 'Dashboard'}
            active={currentMenu === 'dashboard'}
            onSelect={onDashboard}
          />
          <ShellNavItem
            icon="mail"
            label="GaiaMail"
            active={isMailActive}
            badge={mailBadge}
            badgeLabel={mailBadge ? `${mailBadge} ungelesene Mails` : null}
            onSelect={() => onSelectFolder('inbox')}
          />
          <ShellNavItem
            icon="chat"
            label={t('quanten_chat') || 'Quanten-Chat'}
            active={currentMenu === 'chat'}
            badge={chatBadge}
            badgeLabel={chatBadge ? `${chatBadge} ungelesene Chats` : null}
            onSelect={onChat}
          />
          <ShellNavItem
            icon="users"
            label={t('gruppen_chats') || 'Gruppen-Chats'}
            active={currentMenu === 'groups'}
            badge={roomBadge}
            badgeLabel={roomBadge ? `${roomBadge} neue Nachrichten` : null}
            onSelect={onGroups}
          />
          <ShellNavItem
            icon="radio"
            label={t('kanaele') || 'Channels'}
            active={currentMenu === 'public_channels'}
            onSelect={onChannels}
          />
          <ShellNavItem
            icon="globe"
            label="GSN Social"
            active={currentMenu === 'gsn'}
            onSelect={onGsn}
          />

          <div className="vgt-rail__divider" aria-hidden="true" />

          <ShellNavItem
            icon="folderTree"
            label="GaiaDrop"
            active={currentMenu === 'gaiadrop'}
            badge={dropBadge}
            badgeLabel={dropBadge ? `${dropBadge} neue Dateien` : null}
            onSelect={onGaiaDrop}
          />
          <ShellNavItem
            icon="drive"
            label="GaiaDrive"
            active={currentMenu === 'vault'}
            onSelect={onVault}
          />
          <ShellNavItem
            icon="users"
            label={t('adressbuch') || 'Adressbuch'}
            active={currentMenu === 'contacts'}
            onSelect={onContacts}
          />
          <ShellNavItem
            icon="shieldCheck"
            label={t('sc_title') || 'Security Center'}
            active={currentMenu === 'security_center'}
            onSelect={onSecurityCenter}
          />
          <ShellNavItem
            icon="server"
            label="Network Health"
            active={currentMenu === 'network_health'}
            onSelect={onNetworkHealth}
          />
          <ShellNavItem
            icon="warning"
            label={t('abuse_center_title') || 'Abuse Center'}
            active={currentMenu === 'abuse_center'}
            onSelect={onAbuseCenter}
          />
          <ShellNavItem
            icon="settings"
            label={t('ui_settings') || 'Einstellungen'}
            active={currentMenu === 'profile'}
            onSelect={onProfile}
          />
        </nav>
      </div>

      <div className="vgt-rail__footer-art" onClick={onOpenSecurityDetails} role="button" tabIndex={0}>
        <img
          className="vgt-rail__globe-img"
          src="/brand/graphics/illustration_network_globe_256.png"
          alt=""
          loading="lazy"
          aria-hidden="true"
        />
        <div className="vgt-rail__status-row">
          <span className="vgt-rail__status-dot" aria-hidden="true" />
          <div className="vgt-rail__status-copy">
            <span className="vgt-rail__status-brand">VGT GaiaCOM</span>
            <span className="vgt-rail__status-version">v{serverVersion || '3.0.2'}-beta</span>
          </div>
        </div>
      </div>

      {searchOpen && (
        <GlobalSearchDialog
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          activeIdentity={activeIdentity}
          t={t}
          onOpenInbox={() => onSelectFolder('inbox')}
          onOpenContacts={onContacts}
          copyToClipboard={copyToClipboard}
        />
      )}
    </div>
  );
}
