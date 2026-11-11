import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../ui/Icon';
import DialogShell from '../../modals/DialogShell';
import * as api from '../../../api';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 280;
const RESULT_LIMIT = 25;

const KIND_META = {
  mail: { label: 'Nachrichten', icon: 'mail' },
  contact: { label: 'Kontakte', icon: 'user' }
};

function formatResultTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

/**
 * Global search (command palette) over the server-side search endpoint.
 *
 * Source of truth: `GET /api/v1/search/global` (`api.globalSearch`), which is
 * an authorized protected route (`Backend/mailbox/handler.go:271` +
 * `Backend/mailbox/service.go` `requireIdentity` → the identity must belong to
 * the authenticated user). Results are rendered exactly as returned; nothing is
 * fabricated. Mail results navigate to the inbox folder, contact results open
 * the address book and copy the GAIAID for use.
 */
export default function GlobalSearchDialog({
  open,
  onClose,
  activeIdentity,
  t,
  onOpenInbox,
  onOpenContacts,
  copyToClipboard
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState('');
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setStatus('idle');
    setError('');
    setActiveIndex(0);
    setCopied('');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setStatus('idle');
      setResults([]);
      setError('');
      requestSeq.current += 1;
      return undefined;
    }
    setStatus('loading');
    setError('');
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const identityId = activeIdentity?.ID;
        if (!identityId) throw new Error('Keine aktive Identität.');
        const response = await api.globalSearch(identityId, trimmed, RESULT_LIMIT);
        if (seq !== requestSeq.current) return;
        setResults(Array.isArray(response) ? response : []);
        setStatus('done');
        setActiveIndex(0);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(err.message || 'Suche fehlgeschlagen.');
        setStatus('error');
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, query, activeIdentity?.ID]);

  const grouped = results.reduce((groups, result) => {
    const key = KIND_META[result?.kind] ? result.kind : 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(result);
    return groups;
  }, {});

  const orderedResults = Object.keys(grouped).reduce(
    (flat, key) => flat.concat(grouped[key]),
    []
  );

  const activate = (result) => {
    if (!result) return;
    if (result.kind === 'mail') {
      onClose?.();
      onOpenInbox?.();
      return;
    }
    if (result.kind === 'contact') {
      const gaiaId = String(result.snippet || '').split(/\s+/).find(token => token.includes('@')) || '';
      if (gaiaId) copyToClipboard?.(gaiaId);
      setCopied(gaiaId);
      onClose?.();
      onOpenContacts?.();
      return;
    }
    onClose?.();
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, Math.max(orderedResults.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activate(orderedResults[activeIndex]);
    }
  };

  let flatIndex = -1;

  return (
    <DialogShell
      id="global-search"
      eyebrow={t('global_search') || 'Suche'}
      title={t('global_search_title') || 'Netzwerk durchsuchen'}
      description="Durchsucht Nachrichten und Kontakte dieser Identität auf dem Server. Die Suche läuft ausschließlich auf den Daten, auf die deine Identität Zugriff hat."
      onClose={onClose}
      closeLabel={t('close') || 'Schließen'}
      size="md"
    >
      <div className="vgt-search">
        <div className="vgt-search__field">
          <Icon name="search" size={17} />
          <label className="vgt-sr-only" htmlFor="global-search-input">
            {t('global_search') || 'Suche'}
          </label>
          <input
            id="global-search-input"
            type="search"
            className="vgt-search__input"
            placeholder="Mindestens 2 Zeichen …"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck="false"
          />
          {status === 'loading' && <Icon name="spinner" size={16} />}
        </div>

        {status === 'idle' && (
          <p className="vgt-caption">
            Durchsucht Nachrichten und Kontakte. Strg+K öffnet die Suche jederzeit.
          </p>
        )}

        {status === 'error' && (
          <div className="vgt-notice vgt-notice--danger" role="alert">
            <Icon name="alertTriangle" size={16} />
            <div>
              <strong>Suche nicht verfügbar</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {status === 'done' && orderedResults.length === 0 && (
          <div className="vgt-empty">
            <Icon name="search" size={24} />
            <strong>Keine Treffer</strong>
            <span className="vgt-body vgt-body--sm">Andere Formulierung versuchen oder nach einer GaiaID suchen.</span>
          </div>
        )}

        {status === 'done' && orderedResults.length > 0 && (
          <div className="vgt-search__results" role="listbox" aria-label="Suchergebnisse">
            {Object.entries(grouped).map(([groupKey, groupResults]) => (
              <section key={groupKey} className="vgt-search__group">
                <h3 className="vgt-search__group-label">
                  {(KIND_META[groupKey] || { label: 'Weitere' }).label}
                  <span className="vgt-numeric">{groupResults.length}</span>
                </h3>
                <ul>
                  {groupResults.map(result => {
                    flatIndex += 1;
                    const index = flatIndex;
                    return (
                      <li key={`${result.kind}-${result.id}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === activeIndex}
                          className={`vgt-search__result${index === activeIndex ? ' is-active' : ''}`}
                          onClick={() => activate(result)}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <span className="vgt-search__result-icon" aria-hidden="true">
                            <Icon name={(KIND_META[result.kind] || { icon: 'search' }).icon} size={16} />
                          </span>
                          <span className="vgt-search__result-text">
                            <span className="vgt-search__result-title">{result.title || result.id}</span>
                            {result.snippet && <span className="vgt-search__result-snippet">{result.snippet}</span>}
                          </span>
                          <span className="vgt-search__result-meta">
                            {result.source && <span className="vgt-tag">{result.source}</span>}
                            {result.createdAt && <span className="vgt-caption">{formatResultTime(result.createdAt)}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {copied && (
          <p className="vgt-caption" role="status">
            GaiaID {copied} in die Zwischenablage kopiert – im Adressbuch hinzufügen.
          </p>
        )}
      </div>
    </DialogShell>
  );
}
