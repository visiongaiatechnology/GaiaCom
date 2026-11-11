import React from 'react';
import Icon from '../../ui/Icon';
import { useTranslation } from '../../../utils/i18n';
import { ChannelAvatar, CHANNEL_CATEGORIES } from './channelMedia';

/**
 * Channel discovery + creation entry point. All data comes from the existing
 * discovery API through the parent pane; this component only renders it.
 */
export default function ChannelsDiscovery({
  ct,
  categoryLabel,
  activeTab,
  setActiveTab,
  setMode,
  discoverQuery,
  setDiscoverQuery,
  discoverCategory,
  handleDiscoverCategory,
  handleDiscoverChannels,
  discoverLoading,
  discoverResults,
  toggleSubscription,
  handleBlockChannel,
  onOpenChannel
}) {
  const { t } = useTranslation();
  const submitSearch = event => {
    event.preventDefault();
    handleDiscoverChannels(discoverQuery, discoverCategory === 'All' ? '' : discoverCategory);
  };

  return (
    <section className="vgt-ch-discovery" aria-label={ct('discover')}>
      <header className="vgt-ch-discovery__hero">
        <div className="vgt-ch-discovery__hero-copy">
          <p className="vgt-eyebrow">{ct('public_channel')}</p>
          <h1 className="vgt-ch-discovery__title">{ct('discover')}</h1>
          <p className="vgt-ch-discovery__intro">
            {t('ui_ch_intro') || 'Öffentliche Kanäle der Föderation entdecken. Beiträge werden clientseitig entschlüsselt.'}
          </p>
        </div>
        <div className="vgt-ch-segmented" role="tablist" aria-label={ct('discover')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'discover'}
            className={`vgt-ch-segmented__item${activeTab === 'discover' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            <Icon name="globe" size={15} />
            {ct('discover')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create'}
            className={`vgt-ch-segmented__item${activeTab === 'create' ? ' is-active' : ''}`}
            onClick={() => {
              setActiveTab('create');
              setMode('create');
            }}
          >
            <Icon name="plus" size={15} />
            {ct('create_tab')}
          </button>
        </div>
      </header>

      {activeTab === 'discover' ? (
        <>
          <form className="vgt-ch-discovery__bar" onSubmit={submitSearch} role="search">
            <div className="vgt-ch-discovery__field">
              <Icon name="search" size={17} />
              <label className="vgt-sr-only" htmlFor="channel-discover-query">
                {ct('search_placeholder')}
              </label>
              <input
                id="channel-discover-query"
                type="search"
                className="vgt-ch-search-input"
                placeholder={ct('search_placeholder')}
                value={discoverQuery}
                onChange={event => setDiscoverQuery(event.target.value)}
              />
            </div>
            <button type="submit" className="vgt-ch-discovery__submit">
              {ct('search_btn')}
            </button>
          </form>

          <div className="vgt-ch-filters" role="group" aria-label={ct('category')}>
            {CHANNEL_CATEGORIES.map(category => (
              <button
                key={category}
                type="button"
                className={`vgt-ch-filter${discoverCategory === category ? ' is-active' : ''}`}
                aria-pressed={discoverCategory === category}
                onClick={() => handleDiscoverCategory(category)}
              >
                {categoryLabel(category)}
              </button>
            ))}
          </div>

          {discoverLoading ? (
            <div className="vgt-state" role="status">
              <Icon name="spinner" size={18} />
              <span>{ct('searching')}</span>
            </div>
          ) : discoverResults.length === 0 ? (
            <div className="vgt-ch-empty">
              <span className="vgt-ch-empty__icon" aria-hidden="true">
                <Icon name="globe" size={26} />
              </span>
              <strong>{ct('no_channels') || t('ui_ch_empty_title') || 'Noch keine öffentlichen Kanäle'}</strong>
              <span>{t('ui_ch_empty_desc') || 'Suchbegriff ändern oder eine eigene Frequenz eröffnen.'}</span>
            </div>
          ) : (
            <ul className="vgt-ch-cards">
              {discoverResults.map(channel => (
                <li key={channel.id}>
                  <article className="vgt-ch-card">
                    <button
                      type="button"
                      className="vgt-ch-card__open"
                      onClick={() => onOpenChannel?.(channel)}
                      aria-label={`${channel.name} ${ct('open') || 'öffnen'}`}
                    >
                      <span className="vgt-ch-card__cover" aria-hidden="true" />
                      <span className="vgt-ch-card__top">
                        <ChannelAvatar avatar={channel.avatar} name={channel.name} size="md" />
                        <span className="vgt-ch-card__identity">
                          <strong>{channel.name}</strong>
                          <span className="vgt-ch-card__tag">{categoryLabel(channel.category || 'General')}</span>
                        </span>
                      </span>
                      <span className="vgt-ch-card__desc">{channel.description || ct('no_description')}</span>
                      <span className="vgt-ch-card__meta">
                        <Icon name="users" size={13} />
                        <span className="vgt-numeric">{channel.subscriberCount || 0}</span>
                        {ct('subscribers')}
                      </span>
                    </button>
                    <div className="vgt-ch-card__actions">
                      <button
                        type="button"
                        className="vgt-ch-card__subscribe"
                        onClick={async () => {
                          await toggleSubscription(channel);
                          handleDiscoverChannels(discoverQuery, discoverCategory === 'All' ? '' : discoverCategory);
                        }}
                      >
                        <Icon name="plus" size={13} />
                        {ct('subscribe')}
                      </button>
                      <button
                        type="button"
                        className="vgt-ch-card__block"
                        onClick={() => handleBlockChannel(channel.id)}
                        title={ct('block')}
                        aria-label={ct('block')}
                      >
                        <Icon name="shieldOff" size={14} />
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="vgt-ch-empty vgt-ch-create-cta">
          <span className="vgt-ch-empty__icon" aria-hidden="true">
            <Icon name="megaphone" size={26} />
          </span>
          <strong>{ct('create_header')}</strong>
          <span className="vgt-body vgt-body--sm">{ct('create_channel_empty_desc')}</span>
          <button type="button" className="vgt-ch-discovery__submit" onClick={() => setMode('create')}>
            <Icon name="plus" size={16} />
            {t('ui_ch_create_cta') || 'Eigene Frequenz eröffnen'}
          </button>
        </div>
      )}
    </section>
  );
}
