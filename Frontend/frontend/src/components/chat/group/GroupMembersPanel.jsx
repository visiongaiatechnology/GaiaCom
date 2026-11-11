import React from 'react';
import Icon from '../../ui/Icon';
import { displayGaiaID } from '../../../utils/gaiaAddress';

/**
 * Member panel of a room: real member records, governance roles and the
 * moderation actions that the actor is actually allowed to perform.
 */
export default function GroupMembersPanel({
  totalCount,
  members,
  memberSearchQuery,
  onSearchChange,
  activeIdentity,
  actorIsAdmin,
  onClose,
  onOpenProfile,
  onUpdateMemberRole,
  onKick,
  t
}) {
  return (
    <aside className="vgt-group__members" aria-label={t('mitglieder') || 'Mitglieder'}>
      <header className="vgt-group__members-head">
        <p className="vgt-label vgt-group__members-title">
          <Icon name="users" size={14} />
          Mitglieder
          <span className="vgt-numeric">({totalCount})</span>
        </p>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Mitgliederliste schließen">
          <Icon name="close" size={17} />
        </button>
      </header>

      <div className="vgt-group__members-search">
        <label className="vgt-sr-only" htmlFor="vgt-group-member-search">Mitglieder durchsuchen</label>
        <input
          id="vgt-group-member-search"
          type="search"
          className="input-field"
          placeholder="Mitglieder durchsuchen…"
          value={memberSearchQuery}
          onChange={event => onSearchChange(event.target.value)}
        />
      </div>

      <ul className="vgt-group__member-list gaia-scrollbar">
        {members.map(member => {
          const isSelf = member.IdentityID === activeIdentity?.ID;
          const role = member.Role || 'member';
          const roleLabel = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : (t('mitglied') || 'Mitglied');
          const gaiaID = member.Identity?.GaiaID || '';
          return (
            <li key={member.IdentityID} className="vgt-group__member">
              <div className="vgt-group__member-copy">
                <button
                  type="button"
                  className="vgt-group__member-name"
                  onClick={() => gaiaID && onOpenProfile(gaiaID)}
                  disabled={!gaiaID}
                >
                  {member.Identity?.DisplayName || member.Username || displayGaiaID(gaiaID)}
                  {isSelf ? <span className="vgt-group__member-self"> (Du)</span> : null}
                </button>
                <span className="vgt-id vgt-group__member-id">{gaiaID ? displayGaiaID(gaiaID) : '—'}</span>
              </div>

              <span className={`vgt-role vgt-role--${role === 'owner' ? 'operator' : role === 'admin' ? 'senior' : 'default'}`}>
                {roleLabel}
              </span>

              {actorIsAdmin && !isSelf && role !== 'owner' ? (
                <div className="vgt-group__member-actions">
                  <label className="vgt-sr-only" htmlFor={`role-${member.IdentityID}`}>
                    Rolle von {member.Identity?.DisplayName || member.Username || (t('mitglied') || 'Mitglied')}
                  </label>
                  <select
                    id={`role-${member.IdentityID}`}
                    className="input-field vgt-group__role-select"
                    value={role}
                    onChange={event => onUpdateMemberRole(member.IdentityID, event.target.value)}
                  >
                    <option value="member">Mitglied</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="button" className="btn-danger-outline vgt-group__kick" onClick={() => onKick(member.IdentityID)}>
                    <Icon name="logout" size={13} />
                    <span>Entfernen</span>
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}

        {members.length === 0 ? (
          <li className="vgt-group__members-empty">Keine Mitglieder gefunden.</li>
        ) : null}
      </ul>
    </aside>
  );
}
