import React from 'react';
import Icon from '../../ui/Icon';
import useDismissibleMenu from '../shared/useDismissibleMenu';
import SecurityStateChip from '../shared/SecurityStateChip';

/**
 * Channel header of the group surface: channel identity, derived security state
 * (M-15), typing evidence and the channel-scoped actions (members, clear,
 * report, encrypted export, GaiaProof).
 */
export default function GroupChannelHeader({
  roomName,
  channel,
  securityState = null,
  typingLabel,
  searchQuery,
  onSearchChange,
  membersOpen,
  onToggleMembers,
  onClearChannel,
  onReport,
  onExportEncrypted,
  onExportProof,
  onOpenSidebar,
  memberCount,
  t
}) {
  const menu = useDismissibleMenu();

  const closeThen = action => () => {
    menu.close();
    action?.();
  };

  return (
    <header className="vgt-group__head">
      <div className="vgt-group__head-identity">
        <button
          type="button"
          className="btn-icon vgt-group__channels-toggle"
          onClick={onOpenSidebar}
          aria-label="Kanäle öffnen"
        >
          <Icon name="menu" size={18} />
        </button>

        <span className="vgt-group__avatar" aria-hidden="true">
          <Icon name="chat" size={18} />
        </span>

        <div className="vgt-group__head-copy">
          <p className="vgt-eyebrow">{roomName || 'Gruppe'}</p>
          <h1 className="vgt-group__channel-name">#{channel.name}</h1>
          <p className="vgt-caption vgt-mono vgt-group__channel-id">
            {t('channel_id') || 'Kanal-ID'}: {channel.id}
          </p>
          <SecurityStateChip state={securityState} className="vgt-group__head-chip" />
          {typingLabel ? (
            <p className="vgt-group__typing" role="status">{typingLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="vgt-group__head-actions">
        <label className="vgt-sr-only" htmlFor="vgt-group-search">Kanal durchsuchen</label>
        <input
          id="vgt-group-search"
          type="search"
          className="input-field vgt-group__search"
          placeholder="Kanal durchsuchen…"
          value={searchQuery}
          onChange={event => onSearchChange(event.target.value)}
        />

        <div className="vgt-chat-anchor" ref={menu.containerRef}>
          <button
            type="button"
            className="btn-icon"
            onClick={menu.toggle}
            aria-label="Kanal-Aktionen"
            title="Kanal-Aktionen"
            aria-haspopup="menu"
            aria-expanded={menu.open}
          >
            <Icon name="more" size={18} />
          </button>

          {menu.open ? (
            <div className="vgt-chat-menu vgt-glass vgt-glass--floating" role="menu" aria-label="Kanal-Aktionen">
              <button
                type="button"
                role="menuitemcheckbox"
                className="vgt-chat-menu__item"
                aria-checked={membersOpen}
                onClick={closeThen(onToggleMembers)}
              >
                <Icon name="users" size={15} />
                <span>Mitglieder ({memberCount})</span>
              </button>

              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(onClearChannel)}>
                <Icon name="trash" size={15} />
                <span>{t('clear_chat') || 'Chat leeren'}</span>
              </button>

              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(onReport)}>
                <Icon name="alertTriangle" size={15} />
                <span>{t('report_group') || 'Gruppe melden'}</span>
              </button>

              <hr className="vgt-divider" />

              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(onExportEncrypted)}>
                <Icon name="export" size={15} />
                <span>{t('export_encrypted') || 'Export (verschlüsselt)'}</span>
              </button>

              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(onExportProof)}>
                <Icon name="seal" size={15} />
                <span>{t('export_gaiaproof') || 'Export (GaiaProof)'}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
