import React from 'react';
import Icon from '../../ui/Icon';
import AvatarMark from '../profile/ui/AvatarMark';

const TYPE_TEXT = {
  follow: 'folgt dir jetzt',
  comment: 'hat deinen Beitrag kommentiert',
  reaction: 'hat auf deinen Beitrag reagiert'
};

function relativeTime(isoString) {
  const timestamp = Date.parse(isoString || '');
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
}

/**
 * Real notification inbox. Entries are created by the backend from stored
 * follow / comment / reaction events only.
 */
export default function GsnNotificationsSection({
  notifications = [],
  unreadCount = 0,
  loadingNotifications,
  notificationsError,
  markingRead,
  onMarkAllRead,
  onOpenProfile,
  onRetry
}) {
  return (
    <section className="vgt-gsn-section" aria-labelledby="gsn-notifications-title">
      <header className="vgt-gsn-section__head">
        <div>
          <h2 className="vgt-gsn-section__title" id="gsn-notifications-title">Benachrichtigungen</h2>
          <p className="vgt-gsn-section__sub">
            {unreadCount > 0
              ? `${unreadCount} ungelesene ${unreadCount === 1 ? 'Benachrichtigung' : 'Benachrichtigungen'}`
              : 'Alle Benachrichtigungen gelesen'}
          </p>
        </div>
        <div className="vgt-gsn-section__actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={unreadCount === 0 || markingRead}
            onClick={onMarkAllRead}
          >
            <Icon name="check" size={15} />
            {markingRead ? 'Wird markiert…' : 'Alle als gelesen markieren'}
          </button>
          <button type="button" className="btn-icon" onClick={onRetry} aria-label="Benachrichtigungen neu laden" title="Neu laden">
            <Icon name="refresh" size={16} />
          </button>
        </div>
      </header>

      {loadingNotifications ? (
        <p className="vgt-gsn-section__state" role="status">Benachrichtigungen werden geladen…</p>
      ) : notificationsError ? (
        <p className="vgt-gsn-section__state vgt-gsn-section__state--error">{notificationsError}</p>
      ) : notifications.length === 0 ? (
        <div className="vgt-gsn-feed-empty">
          <Icon name="bellOff" size={26} />
          <strong>Noch keine Benachrichtigungen</strong>
          <span>
            Sobald dir jemand folgt, deinen Beitrag kommentiert oder darauf reagiert, erscheint es hier.
          </span>
        </div>
      ) : (
        <ul className="vgt-gsn-notifications">
          {notifications.map(notification => (
            <li
              key={notification.id}
              className={`vgt-gsn-notifications__row${notification.read ? '' : ' is-unread'}`}
            >
              <button
                type="button"
                className="vgt-gsn-notifications__identity"
                onClick={() => onOpenProfile?.(notification.actorGaiaId)}
              >
                <AvatarMark
                  avatar={notification.actorAvatar || ''}
                  displayName={notification.actorDisplayName}
                  variant="default"
                  className="vgt-gsn-notifications__avatar"
                />
                <span className="vgt-gsn-notifications__copy">
                  <span className="vgt-gsn-notifications__line">
                    <strong>{notification.actorDisplayName || notification.actorGaiaId}</strong>{' '}
                    {TYPE_TEXT[notification.type] || 'hat interagiert'}
                  </span>
                  {notification.preview && (
                    <span className="vgt-gsn-notifications__preview">„{notification.preview}“</span>
                  )}
                  <span className="vgt-gsn-notifications__time">{relativeTime(notification.createdAt)}</span>
                </span>
              </button>
              {!notification.read && <span className="vgt-gsn-notifications__dot" aria-label="Ungelesen" />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
