import React from 'react';
import AvatarMark from '../profile/ui/AvatarMark';

/**
 * Shared real-identity list used by Entdecken and Mein Netzwerk. Entries always
 * come from the backend; the follow state is derived from the real following
 * set, never from local invention.
 */
export default function GsnPeopleList({
  items = [],
  emptyLabel = 'Keine Einträge',
  onFollow,
  onUnfollow,
  onOpenProfile,
  followingSet,
  followPending = {}
}) {
  if (items.length === 0) {
    return <p className="vgt-gsn-section__state">{emptyLabel}</p>;
  }

  return (
    <ul className="vgt-gsn-people">
      {items.map(person => {
        const id = person.gaiaId || person.GaiaID;
        const isFollowing = Boolean(followingSet?.has?.(id));
        const pending = Boolean(followPending[id]);
        return (
          <li key={id} className="vgt-gsn-people__row">
            <button
              type="button"
              className="vgt-gsn-people__identity"
              onClick={() => onOpenProfile?.(id)}
            >
              <AvatarMark
                avatar={person.avatar || ''}
                displayName={person.displayName}
                variant="default"
                className="vgt-gsn-people__avatar"
              />
              <span className="vgt-gsn-people__copy">
                <strong>{person.displayName || id}</strong>
                <span>
                  {person.reason || `${person.followersCount || 0} Follower`}
                </span>
              </span>
            </button>
            {isFollowing && onUnfollow ? (
              <button
                type="button"
                className="vgt-btn-follow is-following"
                disabled={pending}
                onClick={() => onUnfollow(id)}
              >
                {pending ? 'Entferne…' : 'Entfolgen'}
              </button>
            ) : onFollow ? (
              <button
                type="button"
                className="vgt-btn-follow"
                disabled={pending}
                onClick={() => onFollow(id)}
              >
                {pending ? 'Folgt…' : 'Folgen'}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
