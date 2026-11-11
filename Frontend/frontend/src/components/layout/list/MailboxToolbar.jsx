import React from 'react';
import Icon from '../../ui/Icon';
import { FOLDER_TABS } from './menuConfig';

function BulkActionsBar({ t, selectedCount, onAction, onClear }) {
  const label = (key, fallback) => (typeof t === 'function' ? (t(key) || fallback) : fallback);
  return (
    <div className="vgt-inbox__bulk" role="region" aria-label={label('bulk_actions', 'Massenaktionen')}>
      <span className="vgt-inbox__bulk-count vgt-numeric">
        {selectedCount} ausgewählt
      </span>
      <div className="vgt-inbox__bulk-actions">
        <button type="button" className="btn-action" onClick={() => onAction('read')}>
          {label('gelesen', 'Gelesen')}
        </button>
        <button type="button" className="btn-action" onClick={() => onAction('unread')}>
          {label('ungelesen', 'Ungelesen')}
        </button>
        <button type="button" className="btn-action" onClick={() => onAction('archive')}>
          {label('archivieren', 'Archiv')}
        </button>
        <button type="button" className="btn-action" onClick={() => onAction('star')}>
          <Icon name="star" size={14} />
          <span>{label('markieren', 'Markieren')}</span>
        </button>
        <button type="button" className="btn-action" onClick={() => onAction('unstar')}>
          <Icon name="star" size={14} />
          <span>{label('markierung_entfernen', 'Entfernen')}</span>
        </button>
        <button type="button" className="btn-danger-outline" onClick={() => onAction('delete')}>
          {label('loeschen', 'Löschen')}
        </button>
        <button type="button" className="btn-ghost" onClick={onClear}>
          {label('abbrechen', 'Abbrechen')}
        </button>
      </div>
    </div>
  );
}

/**
 * Mail folder rail: search, folder segments, custom labels and the bulk-action
 * bar. Every control keeps its original handler and state (search string,
 * folder menu, label toggle, selection array).
 */
export default function MailboxToolbar({
  t,
  currentMenu,
  mailboxSearch,
  setMailboxSearch,
  onFolderChange,
  labelsList,
  mailboxLabel,
  onLabelToggle,
  selectedMailIds,
  onBulkAction,
  onClearSelection
}) {
  const searchPlaceholder = (typeof t === 'function' && (
    t('search_placeholder') || 'Mails nach Betreff, Sender, Text suchen...'
  )) || 'Mails nach Betreff, Sender, Text suchen...';
  const labels = Array.isArray(labelsList) ? labelsList : [];
  const tr = (key, fallback) => (typeof t === 'function' && key ? (t(key) || fallback) : fallback);

  return (
    <div className="vgt-inbox__toolbar">
      <form className="vgt-inbox__search" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="vgt-sr-only" htmlFor="vgt-inbox-search">Mails durchsuchen</label>
        <Icon name="search" size={16} className="vgt-inbox__search-icon" />
        <input
          id="vgt-inbox-search"
          type="search"
          className="input-field vgt-inbox__search-input"
          placeholder={searchPlaceholder}
          value={mailboxSearch}
          onChange={(event) => setMailboxSearch(event.target.value)}
        />
        {mailboxSearch ? (
          <button
            type="button"
            className="btn-icon vgt-inbox__search-clear"
            onClick={() => setMailboxSearch('')}
            aria-label="Suche zurücksetzen"
            title="Suche zurücksetzen"
          >
            <Icon name="x" size={16} />
          </button>
        ) : null}
      </form>

      <nav className="vgt-inbox__segments" aria-label={typeof t === 'function' ? (t('ordner') || (t('ordner') || 'Ordner')) : (t('ordner') || 'Ordner')}>
        {FOLDER_TABS.map((folder) => {
          const isActive = currentMenu === folder.key;
          return (
            <button
              key={folder.key}
              type="button"
              className={`vgt-inbox__segment${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onFolderChange(folder.key)}
            >
              <Icon name={folder.icon} size={14} />
              <span>{tr(folder.labelKey, folder.label)}</span>
            </button>
          );
        })}
      </nav>

      {labels.length > 0 ? (
        <div className="vgt-inbox__labels" role="group" aria-label="Eigene Labels">
          {labels.map((label) => {
            const isActive = mailboxLabel === label.name;
            return (
              <button
                key={label.id || label.name}
                type="button"
                className={`vgt-inbox__label${isActive ? ' is-active' : ''}`}
                style={{ '--vgt-inbox-label-color': label.color || 'var(--vgt-text-secondary)' }}
                aria-pressed={isActive}
                onClick={() => onLabelToggle(label.name, isActive)}
              >
                <span className="vgt-inbox__label-dot" aria-hidden="true" />
                <span>{label.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedMailIds.length > 0 ? (
        <BulkActionsBar
          t={t}
          selectedCount={selectedMailIds.length}
          onAction={onBulkAction}
          onClear={onClearSelection}
        />
      ) : null}
    </div>
  );
}
