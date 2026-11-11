import React from 'react';
import Icon from '../ui/Icon';

const INVITE_EXPIRY_OPTIONS = [
  { value: 3600, label: '1 Stunde' },
  { value: 86400, label: '1 Tag' },
  { value: 604800, label: '7 Tage' },
  { value: 0, label: 'Unbegrenzt' }
];

const INVITE_USE_OPTIONS = [
  { value: 1, label: '1 Mal' },
  { value: 5, label: '5 Mal' },
  { value: 10, label: '10 Mal' },
  { value: 0, label: 'Unbegrenzt' }
];

/** Member roster with role changes, ownership transfer and removal. */
export function MembersSection({
  activeRoom,
  activeIdentity,
  displayGaiaID,
  memberSearchQuery,
  setMemberSearchQuery,
  filteredMembers,
  isOwner,
  isAdmin,
  handleUpdateMemberRole,
  requestTransfer,
  requestKick,
  triggerAlert,
  t
}) {
  return (
    <div className="vgt-settings-section">
      <div className="vgt-field">
        <label className="vgt-label" htmlFor="group-member-search">
          {t('search_members') || 'Mitglieder durchsuchen'}
        </label>
        <input
          id="group-member-search"
          type="search"
          className="input-field"
          placeholder={t('search_members') || 'Mitglieder durchsuchen…'}
          value={memberSearchQuery}
          onChange={event => setMemberSearchQuery(event.target.value)}
        />
      </div>

      <ul className="vgt-member-list vgt-scroll-page">
        {filteredMembers.map(member => {
          const isSelf = member.IdentityID === activeIdentity?.ID;
          const isMemberOwner = member.Role === 'owner';
          const isMemberAdmin = member.Role === 'admin';
          return (
            <li key={member.IdentityID} className="vgt-member">
              <div className="vgt-member__identity">
                <strong>
                  {member.Identity?.DisplayName || member.Username || 'Anonymer Nutzer'}
                  {isSelf && <span className="vgt-caption"> (Du)</span>}
                </strong>
                <span className="vgt-id">
                  {member.Identity?.GaiaID ? displayGaiaID(member.Identity.GaiaID) : 'Keine Gaia-Adresse'}
                </span>
              </div>

              <div className="vgt-member__actions">
                <span className={`vgt-status ${isMemberOwner ? 'vgt-status--signed' : isMemberAdmin ? 'vgt-status--info' : 'vgt-status--idle'}`}>
                  {isMemberOwner ? 'Owner' : isMemberAdmin ? 'Admin' : 'Member'}
                </span>

                {isOwner && !isSelf && (
                  <>
                    <label className="vgt-sr-only" htmlFor={`member-role-${member.IdentityID}`}>
                      Rolle
                    </label>
                    <select
                      id={`member-role-${member.IdentityID}`}
                      className="input-field vgt-input--compact"
                      value={member.Role}
                      onChange={async event => {
                        try {
                          await handleUpdateMemberRole(activeRoom.id, member.IdentityID, event.target.value);
                        } catch (err) {
                          triggerAlert?.('Fehler beim Ändern der Rolle', err.message, 'danger');
                        }
                      }}
                    >
                      <option value="member">{t('mitglied') || 'Member'}</option>
                      <option value="admin">{t('admin') || 'Admin'}</option>
                    </select>
                    <button type="button" className="btn-action" onClick={() => requestTransfer(member)}>
                      <Icon name="arrowRight" size={14} />
                      Übergabe
                    </button>
                    <button type="button" className="btn-danger-outline" onClick={() => requestKick(member)}>
                      <Icon name="logout" size={14} />
                      Entfernen
                    </button>
                  </>
                )}

                {isAdmin && !isSelf && !isMemberOwner && !isMemberAdmin && (
                  <button type="button" className="btn-danger-outline" onClick={() => requestKick(member)}>
                    <Icon name="logout" size={14} />
                    Entfernen
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {filteredMembers.length === 0 && <li className="vgt-caption">Keine Mitglieder gefunden.</li>}
      </ul>
    </div>
  );
}

/** Pending join requests with approve/reject. */
export function RequestsSection({ activeRoom, joinRequests, requestsLoading, handleModerateJoinRequest, fetchRequests, triggerAlert, displayGaiaID, t }) {
  return (
    <div className="vgt-settings-section">
      {requestsLoading ? (
        <div className="vgt-state" role="status">
          <Icon name="spinner" size={18} />
          <span>Lade Beitrittsanfragen…</span>
        </div>
      ) : joinRequests.length === 0 ? (
        <div className="vgt-empty">
          <Icon name="inbox" size={24} />
          <strong>Keine ausstehenden Anfragen</strong>
          <span className="vgt-body vgt-body--sm">Neue Beitrittsanfragen erscheinen hier zur Moderation.</span>
        </div>
      ) : (
        <ul className="vgt-member-list">
          {joinRequests.map(request => (
            <li key={request.id} className="vgt-member">
              <div className="vgt-member__identity">
                <strong>{request.Requester?.DisplayName || 'Unbekannter Anfrager'}</strong>
                <span className="vgt-id">
                  {request.Requester?.GaiaID ? `@${String(request.Requester.GaiaID).replace(/^@/, '')}` : request.RequesterID}
                </span>
              </div>
              <div className="vgt-member__actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    try {
                      await handleModerateJoinRequest(activeRoom.id, request.id, 'approved');
                      fetchRequests();
                    } catch (err) {
                      triggerAlert?.('Fehler beim Bestätigen', err.message, 'danger');
                    }
                  }}
                >
                  {t('sc_btn_accept') || 'Annehmen'}</button>
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={async () => {
                    try {
                      await handleModerateJoinRequest(activeRoom.id, request.id, 'rejected');
                      fetchRequests();
                    } catch (err) {
                      triggerAlert?.('Fehler beim Ablehnen', err.message, 'danger');
                    }
                  }}
                >
                  Ablehnen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Invite-link generation with expiry / use-count and copy feedback. */
export function InvitesSection({
  inviteExpiry,
  setInviteExpiry,
  inviteMaxUses,
  setInviteMaxUses,
  generatedInviteLink,
  inviteCopied,
  handleGenerateLink,
  handleCopyLink
}) {
  return (
    <div className="vgt-settings-section">
      <div className="vgt-settings-grid">
        <div className="vgt-field">
          <label className="vgt-label" htmlFor="invite-expiry">
            Gültigkeitsdauer
          </label>
          <select id="invite-expiry" className="input-field" value={inviteExpiry} onChange={event => setInviteExpiry(Number(event.target.value))}>
            {INVITE_EXPIRY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="invite-max-uses">
            Maximale Verwendungen
          </label>
          <select id="invite-max-uses" className="input-field" value={inviteMaxUses} onChange={event => setInviteMaxUses(Number(event.target.value))}>
            {INVITE_USE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="button" className="btn-primary" onClick={handleGenerateLink}>
        <Icon name="link" size={15} />
        Einladungslink generieren
      </button>

      {generatedInviteLink && (
        <div className="vgt-invite-result">
          <label className="vgt-label" htmlFor="invite-link">
            Einladungslink
          </label>
          <div className="vgt-invite-result__row">
            <input
              id="invite-link"
              type="text"
              className="input-field"
              value={generatedInviteLink}
              readOnly
              onFocus={event => event.target.select()}
            />
            <button type="button" className="btn-secondary" onClick={handleCopyLink}>
              <Icon name={inviteCopied ? 'check' : 'copy'} size={15} />
              {inviteCopied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Moderation audit log. */
export function LogsSection({ moderationLogs, logsLoading }) {
  return (
    <div className="vgt-settings-section">
      {logsLoading ? (
        <div className="vgt-state" role="status">
          <Icon name="spinner" size={18} />
          <span>Lade Protokoll…</span>
        </div>
      ) : moderationLogs.length === 0 ? (
        <div className="vgt-empty">
          <Icon name="fileText" size={24} />
          <strong>Keine Moderationsereignisse</strong>
          <span className="vgt-body vgt-body--sm">Rollenänderungen, Entfernungen und Übergaben erscheinen hier.</span>
        </div>
      ) : (
        <ul className="vgt-log-list vgt-scroll-page">
          {moderationLogs.map(log => (
            <li key={log.id} className="vgt-log">
              <div className="vgt-log__head">
                <span className="vgt-mono">{log.ActorUsername || log.ActorIdentityID}</span>
                <time>{new Date(log.createdAt).toLocaleString()}</time>
              </div>
              <div className="vgt-log__action">{log.Action}</div>
              {log.Reason && <p className="vgt-caption">Grund: {log.Reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
