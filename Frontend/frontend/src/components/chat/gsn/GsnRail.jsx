import React from 'react';
import Icon from '../../ui/Icon';
import AvatarMark from '../profile/ui/AvatarMark';

function formatRelative(isoString) {
  const timestamp = Date.parse(isoString || '');
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
}

function realCount(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : '–';
}

/**
 * GSN context rail. Profile numbers, trends and contact suggestions are all
 * real values returned by the backend; when nothing exists an honest empty
 * state is shown instead of placeholder content.
 */
export default function GsnRail({
  myProfile,
  activeIdentity,
  onOpenOwnProfile,
  onEditProfile,
  trends = [],
  loadingTrends = false,
  trendsError = '',
  suggestions = [],
  loadingSuggestions = false,
  suggestionsError = '',
  onFollowSuggestion,
  onOpenProfile,
  followPending = {}
}) {
  const displayName =
    myProfile?.displayName || activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.Username || '';
  const rawGaiaID = String(activeIdentity?.GaiaID || activeIdentity?.gaiaID || '').replace(/^@+/, '');
  const localGaiaPart = rawGaiaID.split(/[:@]/)[0];
  const handle = localGaiaPart ? `@${localGaiaPart}` : '';
  const verified = Boolean(
    myProfile?.isVerifiedOperator || myProfile?.isVerifiedGovernance || myProfile?.isVerifiedPassport
  );

  return (
    <aside className="vgt-gsn-rail-v2" aria-label="GSN Kontext">
      <section className="vgt-gsn-card vgt-gsn-profile-card">
        <div className="vgt-gsn-profile-card__banner" aria-hidden="true">
          <img src="/ui/aurora_mountains_cinematic.png" alt="" className="vgt-gsn-profile-card__banner-img" />
        </div>
        <div className="vgt-gsn-profile-card__body">
          <button
            type="button"
            className="vgt-gsn-profile-card__avatar-wrap"
            onClick={onOpenOwnProfile}
            aria-label="Eigenes Profil öffnen"
          >
            <AvatarMark
              avatar={myProfile?.avatar || ''}
              displayName={displayName}
              variant="profile"
              className="vgt-gsn-profile-card__avatar"
            />
          </button>

          <div className="vgt-gsn-profile-card__meta">
            <div className="vgt-gsn-profile-card__name-row">
              <strong className="vgt-gsn-profile-card__name">{displayName || 'Profil wird geladen'}</strong>
              {verified && <Icon name="verified" size={14} className="vgt-icon-verified" title="Verifiziertes Profil" />}
            </div>
            <span className="vgt-gsn-profile-card__handle">{handle || '—'}</span>
          </div>

          <dl className="vgt-gsn-profile-card__stats">
            <div className="vgt-gsn-stat">
              <dt className="vgt-gsn-stat__lbl">Beiträge</dt>
              <dd className="vgt-gsn-stat__num">{realCount(myProfile?.postsCount)}</dd>
            </div>
            <div className="vgt-gsn-stat">
              <dt className="vgt-gsn-stat__lbl">Follower</dt>
              <dd className="vgt-gsn-stat__num">{realCount(myProfile?.followersCount)}</dd>
            </div>
            <div className="vgt-gsn-stat">
              <dt className="vgt-gsn-stat__lbl">Folge ich</dt>
              <dd className="vgt-gsn-stat__num">{realCount(myProfile?.followingCount)}</dd>
            </div>
          </dl>

          <button type="button" className="btn-secondary vgt-gsn-profile-card__edit" onClick={onEditProfile}>
            <Icon name="edit" size={14} />
            Profil bearbeiten
          </button>
        </div>
      </section>

      <section className="vgt-gsn-card vgt-gsn-trends-card">
        <header className="vgt-gsn-card__head">
          <div className="vgt-gsn-card__head-title">
            <Icon name="activity" size={16} />
            <span>Trends im GSN</span>
          </div>
          <span className="vgt-gsn-card__meta">7 Tage</span>
        </header>

        {loadingTrends ? (
          <p className="vgt-gsn-card__state" role="status">Trends werden berechnet…</p>
        ) : trendsError ? (
          <p className="vgt-gsn-card__state vgt-gsn-card__state--error">{trendsError}</p>
        ) : trends.length === 0 ? (
          <p className="vgt-gsn-card__state">
            Noch keine Trends. Beiträge mit #Hashtags erscheinen hier automatisch.
          </p>
        ) : (
          <ul className="vgt-gsn-trends-list">
            {trends.map(trend => (
              <li key={trend.tag} className="vgt-gsn-trend-row">
                <div className="vgt-gsn-trend-info">
                  <strong className="vgt-gsn-trend-tag">#{String(trend.tag || '').replace(/^#/, '')}</strong>
                  <span className="vgt-gsn-trend-count">
                    {trend.postCount} {trend.postCount === 1 ? 'Beitrag' : 'Beiträge'}
                    {trend.lastPostAt ? ` · ${formatRelative(trend.lastPostAt)}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="vgt-gsn-card vgt-gsn-contacts-card">
        <header className="vgt-gsn-card__head">
          <div className="vgt-gsn-card__head-title">
            <Icon name="users" size={16} />
            <span>Empfohlene Kontakte</span>
          </div>
        </header>

        {loadingSuggestions ? (
          <p className="vgt-gsn-card__state" role="status">Empfehlungen werden berechnet…</p>
        ) : suggestionsError ? (
          <p className="vgt-gsn-card__state vgt-gsn-card__state--error">{suggestionsError}</p>
        ) : suggestions.length === 0 ? (
          <p className="vgt-gsn-card__state">
            Keine Empfehlungen – du folgst bereits allen aktiven Identitäten dieses Nodes.
          </p>
        ) : (
          <ul className="vgt-gsn-suggest-list">
            {suggestions.map(candidate => (
              <li key={candidate.gaiaId} className="vgt-gsn-suggest-row">
                <button
                  type="button"
                  className="vgt-gsn-suggest-identity"
                  onClick={() => onOpenProfile?.(candidate.gaiaId)}
                >
                  <AvatarMark
                    avatar={candidate.avatar || ''}
                    displayName={candidate.displayName}
                    variant="default"
                    className="vgt-gsn-suggest-avatar"
                  />
                  <span className="vgt-gsn-suggest-info">
                    <strong>{candidate.displayName || candidate.gaiaId}</strong>
                    <span className="vgt-gsn-suggest-role">{candidate.reason}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="vgt-btn-follow"
                  disabled={Boolean(followPending[candidate.gaiaId])}
                  onClick={() => onFollowSuggestion?.(candidate.gaiaId)}
                >
                  {followPending[candidate.gaiaId] ? 'Folgt…' : 'Folgen'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
