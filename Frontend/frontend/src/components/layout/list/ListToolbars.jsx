import React from 'react';
import Icon from '../../ui/Icon';

/** Compact toolbars that sit between the sticky head and the scrolled list. */

export function ChatStartToolbar({ t, onSubmit }) {
  const placeholder = (typeof t === 'function' && (t('suchen') || 'Neue Gaia-Adresse suchen...')) || 'Neue Gaia-Adresse suchen...';
  return (
    <div className="vgt-inbox__toolbar vgt-inbox__toolbar--compact">
      <form className="vgt-inbox__search vgt-inbox__search--inline" role="search" onSubmit={onSubmit}>
        <label className="vgt-sr-only" htmlFor="vgt-inbox-new-chat">Neue Gaia-Adresse suchen</label>
        <Icon name="search" size={16} className="vgt-inbox__search-icon" />
        <input
          id="vgt-inbox-new-chat"
          name="newChatGaiaId"
          type="search"
          className="input-field vgt-inbox__search-input"
          placeholder={placeholder}
        />
        <button type="submit" className="btn-action vgt-inbox__search-submit">
          <Icon name="at" size={14} />
          <span>Suchen</span>
        </button>
      </form>
    </div>
  );
}

export function GroupActions({ t, onCreate, onJoin }) {
  const createLabel = ((typeof t === 'function' && t('gruppe_erstellen')) || '+ Neue Gruppe').replace(/^\+\s*/, '');
  const joinLabel = (typeof t === 'function' && t('gruppe_beitreten')) || 'Gruppe beitreten';
  return (
    <div className="vgt-inbox__toolbar vgt-inbox__actions">
      <button type="button" className="btn-primary" onClick={onCreate}>
        <Icon name="plus" size={15} />
        <span>{createLabel}</span>
      </button>
      <button type="button" className="btn-secondary" onClick={onJoin}>
        <span>{joinLabel}</span>
      </button>
    </div>
  );
}

export function ChannelsToolbar({ t, onCreate, onRefresh, refreshing, channelSearch, onSearchChange }) {
  const createLabel = (typeof t === 'function' && t('create_channel')) || 'Kanal erstellen';
  const refreshLabel = (typeof t === 'function' && t('refresh')) || (t('refresh') || 'Aktualisieren');
  const placeholder = (typeof t === 'function' && (t('ui_ch_search_placeholder') || t('search_channels') || 'Kanäle suchen…')) || 'Kanäle suchen…';
  return (
    <div className="vgt-inbox__toolbar">
      <div className="vgt-inbox__actions">
        <button type="button" className="btn-primary" onClick={onCreate}>
          <Icon name="megaphone" size={15} />
          <span>{createLabel}</span>
        </button>
        <button type="button" className="btn-secondary" onClick={onRefresh} disabled={refreshing}>
          <Icon name="refresh" size={15} />
          <span>{refreshLabel}</span>
        </button>
      </div>
      <div className="vgt-inbox__search">
        <label className="vgt-sr-only" htmlFor="vgt-inbox-channel-search">{t('ui_ch_search_placeholder') || 'Kanäle durchsuchen'}</label>
        <Icon name="search" size={16} className="vgt-inbox__search-icon" />
        <input
          id="vgt-inbox-channel-search"
          type="search"
          className="input-field vgt-inbox__search-input"
          placeholder={placeholder}
          value={channelSearch}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export function DropToolbar({ t, activeIdentity, displayGaiaID, onLoad, loading, onCopy }) {
  const addressLabel = (typeof t === 'function' && t('drop_own_address')) || 'Deine GaiaDrop-Adresse';
  const address = activeIdentity && typeof displayGaiaID === 'function'
    ? displayGaiaID(activeIdentity.GaiaID)
    : 'deine_adresse';
  const loadLabel = loading
    ? ((typeof t === 'function' && t('drop_btn_decrypting')) || 'Laden...')
    : ((typeof t === 'function' && t('drop_btn_load')) || 'Inbox laden');
  const copyLabel = (typeof t === 'function' && t('copy')) || (t('copy') || 'Kopieren');

  return (
    <div className="vgt-inbox__toolbar vgt-inbox-drop">
      <div className="vgt-inbox-drop__address">
        <span className="vgt-label">{addressLabel}</span>
        <code className="vgt-inbox-drop__code vgt-mono">{address}</code>
      </div>
      <div className="vgt-inbox__actions">
        <button type="button" className="btn-action" onClick={onLoad} disabled={loading}>
          {loadLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onCopy} disabled={!activeIdentity}>
          <Icon name="copy" size={15} />
          <span>{copyLabel}</span>
        </button>
      </div>
    </div>
  );
}
