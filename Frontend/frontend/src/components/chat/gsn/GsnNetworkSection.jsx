import React, { useMemo, useState } from 'react';
import Icon from '../../ui/Icon';
import GsnPeopleList from './GsnPeopleList';

/**
 * Mein Netzwerk: real follower/following profiles from the backend. Follow state
 * is derived from the real "following" list, so buttons always match server data.
 */
export default function GsnNetworkSection({
  network = { followers: [], following: [] },
  loadingNetwork,
  networkError,
  onRetry,
  onFollow,
  onUnfollow,
  followPending,
  onOpenProfile
}) {
  const [tab, setTab] = useState('followers');
  const followingSet = useMemo(
    () => new Set((network.following || []).map(profile => profile.gaiaId)),
    [network.following]
  );
  const followers = network.followers || [];
  const following = network.following || [];
  const list = tab === 'followers' ? followers : following;

  return (
    <section className="vgt-gsn-section" aria-labelledby="gsn-network-title">
      <header className="vgt-gsn-section__head">
        <div>
          <h2 className="vgt-gsn-section__title" id="gsn-network-title">Mein Netzwerk</h2>
          <p className="vgt-gsn-section__sub">Echte Follower und echte Follows deiner GaiaCom-Identität.</p>
        </div>
        <button type="button" className="btn-icon" onClick={onRetry} aria-label="Netzwerk neu laden" title="Neu laden">
          <Icon name="refresh" size={16} />
        </button>
      </header>

      <div className="vgt-gsn-segments" role="group" aria-label="Netzwerkansicht">
        <button
          type="button"
          className={`vgt-gsn-segment${tab === 'followers' ? ' is-active' : ''}`}
          aria-pressed={tab === 'followers'}
          onClick={() => setTab('followers')}
        >
          Follower
          <span className="vgt-numeric">{followers.length}</span>
        </button>
        <button
          type="button"
          className={`vgt-gsn-segment${tab === 'following' ? ' is-active' : ''}`}
          aria-pressed={tab === 'following'}
          onClick={() => setTab('following')}
        >
          Folge ich
          <span className="vgt-numeric">{following.length}</span>
        </button>
      </div>

      <div className="vgt-gsn-section__panel">
        {loadingNetwork ? (
          <p className="vgt-gsn-section__state" role="status">Netzwerk wird geladen…</p>
        ) : networkError ? (
          <p className="vgt-gsn-section__state vgt-gsn-section__state--error">{networkError}</p>
        ) : (
          <GsnPeopleList
            items={list.map(profile => ({
              gaiaId: profile.gaiaId,
              displayName: profile.displayName,
              avatar: profile.avatar,
              followersCount: profile.followersCount
            }))}
            emptyLabel={
              tab === 'followers'
                ? 'Noch keine Follower – echte Follower erscheinen hier automatisch.'
                : 'Du folgst noch niemandem – nutze Entdecken, um Kontakte zu finden.'
            }
            followingSet={followingSet}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            followPending={followPending}
            onOpenProfile={onOpenProfile}
          />
        )}
      </div>
    </section>
  );
}
