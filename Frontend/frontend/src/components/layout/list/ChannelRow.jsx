import React from 'react';
import Icon from '../../ui/Icon';
import { truncateText } from './format';

/**
 * VGT GLASS 2100 — public channel row.
 *
 * Hierarchy: channel name (+ admin marker), subscription state, description or
 * the real subscriber count. No invented counters.
 */
export default function ChannelRow({ channel, isActive, onSelect, t }) {
  const subscriberCount = Number(channel.subscriberCount || 0);
  const state = channel.isSubscribed
    ? (t('ui_ch_subscribed') || 'Abonniert')
    : (t('ui_ch_public') || 'Öffentlich');
  const description = truncateText(channel.description, 72)
    || `${subscriberCount} ${t('ui_ch_subscribers') || 'Abonnenten'}`;

  return (
    <li className={`vgt-inbox-row vgt-inbox-row--channel${isActive ? ' is-active' : ''}`}>
      <button
        type="button"
        className="vgt-inbox-row__main"
        onClick={onSelect}
        aria-current={isActive ? 'true' : undefined}
      >
        <span className="vgt-inbox-row__avatar" aria-hidden="true">
          <Icon name="megaphone" size={16} />
        </span>
        <span className="vgt-inbox-row__body">
          <span className="vgt-inbox-row__line vgt-inbox-row__line--top">
            <span className="vgt-inbox-row__name">{channel.name}</span>
            {channel.isAdmin ? (
              <span className="vgt-inbox-chip vgt-inbox-chip--secure">{t('admin') || 'Admin'}</span>
            ) : null}
          </span>
          <span className="vgt-inbox-row__subject vgt-inbox-row__subject--meta">{state}</span>
          <span className="vgt-inbox-row__preview">{description}</span>
        </span>
      </button>
    </li>
  );
}
