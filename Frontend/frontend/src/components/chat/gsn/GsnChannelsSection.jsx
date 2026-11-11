import React from 'react';
import Icon from '../../ui/Icon';
import { ChannelAvatar } from '../channels/channelMedia';

/**
 * Channels im GSN: echte öffentliche Kanäle der GaiaCom-Instanz. Ein Klick
 * öffnet den realen Kanal; Abonnentenzahlen und Abo-Status kommen vom Server.
 */
export default function GsnChannelsSection({ channels = [], loading, onOpenChannel, onOpenChannelsMenu }) {
  return (
    <section className="vgt-gsn-section" aria-labelledby="gsn-channels-title">
      <header className="vgt-gsn-section__head">
        <div>
          <h2 className="vgt-gsn-section__title" id="gsn-channels-title">Channels</h2>
          <p className="vgt-gsn-section__sub">
            Öffentliche Kanäle deines Nodes – echte Beiträge, echte Abonnenten.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onOpenChannelsMenu}>
          <Icon name="radio" size={15} />
          Alle Channels
        </button>
      </header>

      {loading ? (
        <p className="vgt-gsn-section__state" role="status">Channels werden geladen…</p>
      ) : channels.length === 0 ? (
        <div className="vgt-gsn-feed-empty">
          <Icon name="radio" size={26} />
          <strong>Noch keine Channels</strong>
          <span>Öffentliche Kanäle, die du abonnierst, erscheinen hier automatisch.</span>
        </div>
      ) : (
        <ul className="vgt-gsn-channels">
          {channels.map(channel => (
            <li key={channel.id || channel.name} className="vgt-gsn-channels__row">
              <button type="button" className="vgt-gsn-channels__open" onClick={() => onOpenChannel?.(channel)}>
                <ChannelAvatar avatar={channel.avatar} name={channel.name} size="md" />
                <span className="vgt-gsn-channels__copy">
                  <strong>{channel.name || 'Channel'}</strong>
                  <span>{channel.description || channel.category || 'Öffentlicher Kanal'}</span>
                </span>
                <span className="vgt-gsn-channels__meta">
                  <Icon name="users" size={13} />
                  {Number.isFinite(Number(channel.subscriberCount)) ? Number(channel.subscriberCount) : '–'}
                  {channel.isSubscribed ? ' · abonniert' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
