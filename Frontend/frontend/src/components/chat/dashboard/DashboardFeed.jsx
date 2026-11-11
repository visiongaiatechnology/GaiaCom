import React from 'react';
import Icon from '../../ui/Icon';

function formatRelative(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'jetzt';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

/**
 * Generic honest feed: renders only what the session actually loaded.
 * kind "mail" | "chat"
 */
export default function DashboardFeed({
  kind,
  title,
  icon,
  items,
  emptyTitle,
  emptyBody,
  emptyActionLabel,
  onEmptyAction,
  onOpenItem,
  footerLabel,
  onFooter
}) {
  return (
    <section className="vgt-dash-feed" aria-label={title}>
      <header className="vgt-dash-feed__head">
        <h2 className="vgt-h4">
          <Icon name={icon} size={17} />
          {title}
        </h2>
        <span className="vgt-caption vgt-numeric">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <div className="vgt-dash-feed__empty">
          <p className="vgt-body vgt-body--sm">{emptyTitle}</p>
          <p className="vgt-caption">{emptyBody}</p>
          {emptyActionLabel && (
            <button type="button" className="btn-action" onClick={onEmptyAction}>
              {emptyActionLabel}
              <Icon name="arrowRight" size={14} />
            </button>
          )}
        </div>
      ) : (
        <ul className="vgt-dash-feed__list">
          {items.map((item) => (
            <li key={item.key}>
              <button type="button" className="vgt-dash-feed__row" onClick={() => onOpenItem(item)}>
                <span className="vgt-dash-feed__avatar" aria-hidden="true">
                  <Icon name={kind === 'mail' ? 'mail' : 'user'} size={15} />
                </span>
                <span className="vgt-dash-feed__body">
                  <span className="vgt-dash-feed__top">
                    <strong>{item.primary}</strong>
                    <span className="vgt-caption vgt-numeric">{formatRelative(item.timestamp)}</span>
                  </span>
                  <span className="vgt-dash-feed__preview">{item.preview || 'Kein Vorschautext'}</span>
                </span>
                <Icon name="chevronRight" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {footerLabel && (
        <footer className="vgt-dash-feed__foot">
          <button type="button" className="btn-ghost" onClick={onFooter}>
            {footerLabel}
            <Icon name="arrowRight" size={14} />
          </button>
        </footer>
      )}
    </section>
  );
}
