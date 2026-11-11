import React from 'react';
import Icon from '../../ui/Icon';
import { useTranslation } from '../../../utils/i18n';
import { ChannelAvatar } from './channelMedia';
import ChannelVerificationBadge from './ChannelVerificationBadge';

/**
 * Channel hero: cover strip, identity, honest metadata and the existing
 * subscriber / search / actions controls. Only real channel payload values are
 * rendered; verification attribution comes from the live credential registry.
 */
export default function ChannelHeader({
  channel,
  ct,
  categoryLabel,
  busy,
  ownerDisplayName,
  verification,
  displayGaiaID,
  onToggleSubscription,
  onOpenActions,
  onToggleSearch,
  isSearchOpen
}) {
  const { t } = useTranslation();
  const rawCategory = channel.category || 'General';
  const categoryKeys = ['All', 'General', 'Tech', 'News', 'Sports', 'Entertainment'];
  const category = categoryKeys.includes(rawCategory) && typeof categoryLabel === 'function'
    ? categoryLabel(rawCategory)
    : rawCategory;

  return (
    <header className="vgt-ch-hero">
      <div className="vgt-ch-hero__cover" aria-hidden="true">
        <img src="/ui/aurora_mountains_cinematic.png" alt="" />
        <span className="vgt-ch-hero__scrim" />
      </div>

      <div className="vgt-ch-hero__body">
        <div className="vgt-ch-hero__avatar">
          <ChannelAvatar avatar={channel.avatar} name={channel.name} size="lg" />
        </div>

        <div className="vgt-ch-hero__copy">
          <div className="vgt-ch-hero__title-row">
            <h1 className="vgt-ch-hero__title">{channel.name}</h1>
            <ChannelVerificationBadge
              channel={channel}
              verification={verification}
              ct={ct}
              displayGaiaID={displayGaiaID}
            />
          </div>

          <div className="vgt-ch-hero__meta">
            <span className="vgt-ch-hero__meta-item">
              <Icon name="users" size={13} />
              <b className="vgt-numeric">{channel.subscriberCount || 0}</b>
              {t('ui_ch_subscribers') || 'Abonnenten'}
            </span>
            {ownerDisplayName && (
              <span className="vgt-ch-hero__meta-item">
                <Icon name="user" size={13} />
                {ownerDisplayName}
              </span>
            )}
            <span className="vgt-ch-hero__tag">{category}</span>
            <span className={`vgt-ch-hero__tag${channel.isAdmin ? ' is-admin' : ''}`}>
              <Icon name={channel.isAdmin ? 'settings' : 'eye'} size={11} />
              {channel.isAdmin ? (t('ui_ch_admin') || 'Admin-Konsole') : (t('ui_ch_viewer') || 'Zuschauer-Modus')}
            </span>
            {channel.isSubscribed && (
              <span className="vgt-ch-hero__tag is-subscribed">
                <Icon name="check" size={11} />
                {t('ui_ch_subscribed') || 'Abonniert'}
              </span>
            )}
          </div>

          {channel.description && <p className="vgt-ch-hero__desc">{channel.description}</p>}
        </div>

        <div className="vgt-ch-hero__actions">
          {onToggleSearch && (
            <button
              type="button"
              className={`vgt-ch-hero__icon${isSearchOpen ? ' is-active' : ''}`}
              onClick={onToggleSearch}
              title={ct('search_posts')}
              aria-label={ct('search_posts')}
            >
              <Icon name="search" size={16} />
            </button>
          )}
          <button
            type="button"
            className={`vgt-ch-hero__subscribe${channel.isSubscribed ? ' is-subscribed' : ''}`}
            onClick={() => onToggleSubscription(channel)}
            disabled={busy}
          >
            <Icon name={channel.isSubscribed ? 'check' : 'plus'} size={14} />
            <span>{channel.isSubscribed ? (t('ui_ch_subscribed') || 'Abonniert') : (t('ui_ch_subscribe') || 'Abonnieren')}</span>
          </button>
          <button
            type="button"
            className="vgt-ch-hero__icon"
            onClick={onOpenActions}
            aria-label={ct('channel_menu')}
            title={ct('channel_menu')}
          >
            <Icon name="more" size={17} />
          </button>
        </div>
      </div>

      {channel.isSuspended && (
        <div className="vgt-notice vgt-notice--danger" role="alert">
          <Icon name="alertOctagon" size={16} />
          <span>{ct('suspended_channel')}</span>
        </div>
      )}
    </header>
  );
}
