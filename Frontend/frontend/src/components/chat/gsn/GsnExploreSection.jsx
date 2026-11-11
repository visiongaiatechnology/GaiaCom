import React from 'react';
import Icon from '../../ui/Icon';
import GsnPeopleList from './GsnPeopleList';

function relativeTime(isoString) {
  const timestamp = Date.parse(isoString || '');
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
}

/**
 * Entdecken: real hashtag trends (backend aggregation over stored posts) and
 * real contact suggestions from the backend ranking.
 */
export default function GsnExploreSection({
  trends = [],
  loadingTrends,
  trendsError,
  suggestions = [],
  loadingSuggestions,
  suggestionsError,
  onRetry,
  onFollowSuggestion,
  followPending,
  onOpenProfile
}) {
  const maxCount = trends.reduce((max, item) => Math.max(max, Number(item.postCount) || 0), 0);

  return (
    <section className="vgt-gsn-section" aria-labelledby="gsn-explore-title">
      <header className="vgt-gsn-section__head">
        <div>
          <h2 className="vgt-gsn-section__title" id="gsn-explore-title">Entdecken</h2>
          <p className="vgt-gsn-section__sub">
            Trends und Menschen – berechnet aus echten Beiträgen und Interaktionen dieses Nodes.
          </p>
        </div>
        <button type="button" className="btn-icon" onClick={onRetry} aria-label="Daten neu laden" title="Neu laden">
          <Icon name="refresh" size={16} />
        </button>
      </header>

      <div className="vgt-gsn-section__panel">
        <h3 className="vgt-gsn-section__panel-title">
          <Icon name="activity" size={16} />
          Trends der letzten 7 Tage
        </h3>
        {loadingTrends ? (
          <p className="vgt-gsn-section__state" role="status">Trends werden berechnet…</p>
        ) : trendsError ? (
          <p className="vgt-gsn-section__state vgt-gsn-section__state--error">{trendsError}</p>
        ) : trends.length === 0 ? (
          <p className="vgt-gsn-section__state">
            Keine Trends im Zeitraum – sobald Beiträge Hashtags enthalten, erscheinen sie hier.
          </p>
        ) : (
          <ol className="vgt-gsn-trendbars">
            {trends.map(trend => (
              <li key={trend.tag} className="vgt-gsn-trendbars__row">
                <span className="vgt-gsn-trendbars__tag">#{String(trend.tag || '').replace(/^#/, '')}</span>
                <span
                  className="vgt-gsn-trendbars__bar"
                  style={{ '--gsn-trend-width': `${maxCount > 0 ? Math.max(6, Math.round((Number(trend.postCount) / maxCount) * 100)) : 0}%` }}
                  aria-hidden="true"
                />
                <span className="vgt-gsn-trendbars__count vgt-numeric">
                  {trend.postCount} {trend.postCount === 1 ? 'Beitrag' : 'Beiträge'}
                </span>
                <span className="vgt-gsn-trendbars__time">{relativeTime(trend.lastPostAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="vgt-gsn-section__panel">
        <h3 className="vgt-gsn-section__panel-title">
          <Icon name="users" size={16} />
          Menschen im Netzwerk
        </h3>
        {loadingSuggestions ? (
          <p className="vgt-gsn-section__state" role="status">Empfehlungen werden berechnet…</p>
        ) : suggestionsError ? (
          <p className="vgt-gsn-section__state vgt-gsn-section__state--error">{suggestionsError}</p>
        ) : (
          <GsnPeopleList
            items={suggestions}
            emptyLabel="Keine offenen Empfehlungen – du folgst bereits allen aktiven Identitäten dieses Nodes."
            onFollow={onFollowSuggestion}
            onOpenProfile={onOpenProfile}
            followPending={followPending}
          />
        )}
      </div>
    </section>
  );
}
