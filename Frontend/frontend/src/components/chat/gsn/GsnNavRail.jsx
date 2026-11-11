import React from 'react';
import Icon from '../../ui/Icon';
import AvatarMark from '../profile/ui/AvatarMark';

const NAV_ITEMS = [
  { id: 'home', label: 'Startseite', icon: 'grid' },
  { id: 'explore', label: 'Entdecken', icon: 'search' },
  { id: 'network', label: 'Mein Netzwerk', icon: 'users' },
  { id: 'messages', label: 'Nachrichten', icon: 'chat', action: 'messages' },
  { id: 'notifications', label: 'Benachrichtigungen', icon: 'bell' },
  { id: 'groups', label: 'Gruppen', icon: 'chatDouble' },
  { id: 'channels', label: 'Channels', icon: 'radio' }
];

/**
 * GSN navigation rail. Every destination maps to a real GaiaCom data source;
 * unread badges are only rendered when the backend reported real unread events.
 */
export default function GsnNavRail({
  activeSection = 'home',
  onSelectSection,
  onOpenMessages,
  messagesOpen = false,
  notificationCount = 0,
  expanded = false,
  onToggleExpanded,
  onOpenCloud,
  myProfile,
  activeIdentity,
  onOpenOwnProfile
}) {
  const displayName =
    myProfile?.displayName || activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.Username || '';
  const rawGaiaID = String(activeIdentity?.GaiaID || activeIdentity?.gaiaID || '').replace(/^@+/, '');
  const localGaiaPart = rawGaiaID.split(/[:@]/)[0];
  const handle = localGaiaPart ? `@${localGaiaPart}` : '';

  return (
    <nav className="vgt-gsn-nav-rail" aria-label="GSN Navigation">
      <div className="vgt-gsn-nav-brand">
        <div className="vgt-gsn-nav-brand__logo-wrap">
          <img src="/ui/network_globe.png" alt="" className="vgt-gsn-nav-brand__globe" />
        </div>
        <div className="vgt-gsn-nav-brand__titles">
          <span className="vgt-gsn-nav-brand__main">GSN Social</span>
          <span className="vgt-gsn-nav-brand__sub">Gaia Social Network</span>
        </div>
      </div>

      <ul className="vgt-gsn-nav-list">
        {NAV_ITEMS.map(item => {
          const isMessages = item.action === 'messages';
          const isActive = isMessages ? messagesOpen : activeSection === item.id;
          return (
            <li key={item.id} className="vgt-gsn-nav-item">
              <button
                type="button"
                className={`vgt-gsn-nav-btn${isActive ? ' is-active' : ''}`}
                aria-current={!isMessages && isActive ? 'page' : undefined}
                aria-pressed={isMessages ? messagesOpen : undefined}
                onClick={() => {
                  if (isMessages) {
                    onOpenMessages?.();
                    return;
                  }
                  onSelectSection?.(item.id);
                }}
              >
                <span className="vgt-gsn-nav-btn__icon">
                  <Icon name={item.icon} size={18} />
                </span>
                <span className="vgt-gsn-nav-btn__label">{item.label}</span>
                {item.id === 'notifications' && notificationCount > 0 && (
                  <span className="vgt-gsn-nav-btn__badge" aria-label={`${notificationCount} ungelesene Benachrichtigungen`}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="vgt-gsn-nav-footer">
        <button type="button" className="vgt-gsn-nav-btn" onClick={onOpenCloud}>
          <span className="vgt-gsn-nav-btn__icon">
            <Icon name="drive" size={18} />
          </span>
          <span className="vgt-gsn-nav-btn__label">GSN Cloud</span>
        </button>

        <button
          type="button"
          className="vgt-gsn-nav-btn"
          aria-pressed={expanded}
          onClick={onToggleExpanded}
          title={expanded ? 'Zur normalen Ansicht wechseln' : 'GSN als Großansicht öffnen'}
        >
          <span className="vgt-gsn-nav-btn__icon">
            <Icon name={expanded ? 'windowRestore' : 'maximize'} size={18} />
          </span>
          <span className="vgt-gsn-nav-btn__label">{expanded ? 'Standardansicht' : 'Großansicht'}</span>
        </button>

        {(displayName || handle) && (
          <button type="button" className="vgt-gsn-nav-identity" onClick={onOpenOwnProfile}>
            <AvatarMark
              avatar={myProfile?.avatar || ''}
              displayName={displayName}
              variant="default"
              className="vgt-gsn-nav-identity__avatar"
            />
            <span className="vgt-gsn-nav-identity__copy">
              <strong>{displayName || 'Mein Profil'}</strong>
              <span>{handle}</span>
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
