import React, { useState } from 'react';
import Icon from '../ui/Icon';
import AvatarPicker from '../common/AvatarPicker';
import DialogShell from '../modals/DialogShell';
import { GROUP_AVATARS } from '../../utils/avatar';
import { InvitesSection, LogsSection, MembersSection, RequestsSection } from '../modals/GroupSettingsSections';

const TABS = [
  { id: 'general', key: 'tab_general', label: 'Allgemein', icon: 'settings' },
  { id: 'members', key: 'tab_members', label: 'Mitglieder', icon: 'users' },
  { id: 'requests', key: 'tab_requests', label: 'Anfragen', icon: 'inbox' },
  { id: 'invites', key: 'tab_invites', label: 'Einladungen', icon: 'link' },
  { id: 'logs', key: 'tab_logs', label: 'Protokoll', icon: 'fileText' }
];

const SLOW_MODE_OPTIONS = [
  { value: 0, label: 'Aus (kein Cooldown)' },
  { value: 5, label: '5 Sekunden' },
  { value: 10, label: '10 Sekunden' },
  { value: 30, label: '30 Sekunden' },
  { value: 60, label: '1 Minute' },
  { value: 300, label: '5 Minuten' }
];

/**
 * Room settings dialog (general / members / join requests / invites / audit log).
 *
 * Every handler, guard and payload comes from the existing implementation:
 * owner/admin privileges, role changes, ownership transfer, kick, join-request
 * moderation, invite-link generation and moderation log loading are unchanged.
 * Tab bodies live in `GroupSettingsSections` to keep both modules under 500 lines.
 */
export default function GroupSettingsModal({
  name,
  description,
  avatar,
  isCrisis,
  onIsCrisisChange,
  onNameChange,
  onDescriptionChange,
  onAvatarChange,
  onSubmit,
  onClose,
  onDelete,
  isPrivate,
  onIsPrivateChange,
  readOnly,
  onReadOnlyChange,
  slowModeSeconds,
  onSlowModeSecondsChange,
  topSecret,
  onTopSecretChange,
  handleUpdateMemberRole,
  handleKickMember,
  handleTransferOwnership,
  handleGetJoinRequests,
  handleModerateJoinRequest,
  joinRequests = [],
  handleGetModerationLogs,
  moderationLogs = [],
  handleCreateRoomInviteLink,
  activeRoom,
  activeIdentity,
  displayGaiaID,
  t,
  triggerAlert,
  showConfirm
}) {
  const [activeTab, setActiveTab] = useState('general');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState(3600);
  const [inviteMaxUses, setInviteMaxUses] = useState(10);
  const [generatedInviteLink, setGeneratedInviteLink] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const members = activeRoom?.Members || [];
  const actor = members.find(member => member.IdentityID === activeIdentity?.ID);
  const isOwner = actor?.Role === 'owner';
  const isAdmin = actor?.Role === 'admin';
  const isPrivileged = isOwner || isAdmin;

  const fetchRequests = async () => {
    if (!activeRoom) return;
    setRequestsLoading(true);
    try {
      await handleGetJoinRequests(activeRoom.id);
    } catch (_) {}
    setRequestsLoading(false);
  };

  const fetchLogs = async () => {
    if (!activeRoom) return;
    setLogsLoading(true);
    try {
      await handleGetModerationLogs(activeRoom.id);
    } catch (_) {}
    setLogsLoading(false);
  };

  const handleGenerateLink = async () => {
    if (!activeRoom || !activeIdentity) return;
    try {
      const res = await handleCreateRoomInviteLink(activeRoom.id, activeIdentity.ID, inviteExpiry, inviteMaxUses);
      if (res && res.token) {
        setGeneratedInviteLink(`${window.location.origin}/invite/${res.token}`);
        setInviteCopied(false);
      }
    } catch (err) {
      triggerAlert?.('Fehler beim Erstellen des Links', err.message, 'danger');
    }
  };

  const handleCopyLink = () => {
    if (!generatedInviteLink) return;
    navigator.clipboard.writeText(generatedInviteLink);
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 2000);
  };

  const requestKick = member => {
    showConfirm?.(
      'Mitglied entfernen',
      `${member.Identity?.DisplayName || member.Username} wirklich entfernen?`,
      async () => {
        try {
          await handleKickMember(activeRoom.id, member.IdentityID);
        } catch (err) {
          triggerAlert?.('Fehler beim Entfernen', err.message, 'danger');
        }
      },
      null,
      'Entfernen',
      'Abbrechen',
      true
    );
  };

  const requestTransfer = member => {
    showConfirm?.(
      'Eigentum übergeben',
      `Eigentum an ${member.Identity?.DisplayName || member.Username} übergeben? Du wirst zum Admin.`,
      async () => {
        try {
          await handleTransferOwnership(activeRoom.id, member.IdentityID);
        } catch (err) {
          triggerAlert?.('Fehler bei Übergabe', err.message, 'danger');
        }
      },
      null,
      'Übergeben',
      'Abbrechen',
      true
    );
  };

  const filteredMembers = members.filter(member => {
    const query = memberSearchQuery.toLowerCase();
    const displayName = (member.Identity?.DisplayName || member.Username || '').toLowerCase();
    const gaiaId = (member.Identity?.GaiaID || '').toLowerCase();
    return displayName.includes(query) || gaiaId.includes(query);
  });

  return (
    <DialogShell
      id="group-settings"
      eyebrow="Gruppe"
      title={t('group_settings_title') || 'Gruppen-Einstellungen'}
      description={activeRoom?.Name || activeRoom?.name || name}
      onClose={onClose}
      closeLabel={t('close') || 'Schließen'}
      size="lg"
    >
      <div className="vgt-tabs" role="tablist" aria-label="Einstellungsbereiche">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`vgt-tabs__item${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'requests') fetchRequests();
              if (tab.id === 'logs') fetchLogs();
            }}
          >
            <Icon name={tab.icon} size={15} />
            {t(tab.key) || tab.label}
            {tab.id === 'requests' && joinRequests.length > 0 && <span className="vgt-numeric">{joinRequests.length}</span>}
          </button>
        ))}
      </div>

      <div className="vgt-settings-body">
        {activeTab === 'general' && (
          <form className="vgt-dialog__form" onSubmit={event => { event.preventDefault(); onSubmit(event); }}>
            <div className="vgt-field">
              <label className="vgt-label" htmlFor="group-settings-name">
                {t('group_settings_name') || 'Gruppenname'}
              </label>
              <input
                id="group-settings-name"
                type="text"
                className="input-field"
                value={name}
                onChange={event => onNameChange(event.target.value)}
                maxLength={80}
                disabled={!isPrivileged}
                required
              />
            </div>

            <div className="vgt-field">
              <label className="vgt-label" htmlFor="group-settings-description">
                {t('group_settings_desc') || 'Beschreibung'}
              </label>
              <textarea
                id="group-settings-description"
                className="input-field"
                value={description}
                onChange={event => onDescriptionChange(event.target.value)}
                maxLength={500}
                disabled={!isPrivileged}
              />
            </div>

            <div className="vgt-field">
              <span className="vgt-label">{t('group_settings_avatar') || 'Gruppen-Avatar'}</span>
              <AvatarPicker value={avatar} options={GROUP_AVATARS} onChange={onAvatarChange} disabled={!isPrivileged} />
            </div>

            {isPrivileged && (
              <fieldset className="vgt-fieldset">
                <legend className="vgt-label">Richtlinien</legend>

                <label className="vgt-switch" htmlFor="settings-is-crisis">
                  <input id="settings-is-crisis" type="checkbox" checked={isCrisis} onChange={event => onIsCrisisChange(event.target.checked)} />
                  <span className="vgt-switch__track" aria-hidden="true" />
                  <span className="vgt-field__label">
                    {t('group_settings_is_crisis') || 'Als Krisenraum markieren'}
                    <span className="vgt-caption">Aktiviert erweiterte Sicherheitshinweise im Raum.</span>
                  </span>
                </label>

                <label className="vgt-switch" htmlFor="settings-is-private">
                  <input id="settings-is-private" type="checkbox" checked={isPrivate} onChange={event => onIsPrivateChange(event.target.checked)} />
                  <span className="vgt-switch__track" aria-hidden="true" />
                  <span className="vgt-field__label">
                    {t('group_settings_is_private') || 'Privater Raum'}
                    <span className="vgt-caption">Nicht öffentlich durchsuchbar; Beitritt nur über Anfragen.</span>
                  </span>
                </label>

                <label className="vgt-switch" htmlFor="settings-read-only">
                  <input id="settings-read-only" type="checkbox" checked={readOnly} onChange={event => onReadOnlyChange(event.target.checked)} />
                  <span className="vgt-switch__track" aria-hidden="true" />
                  <span className="vgt-field__label">
                    {t('group_settings_read_only') || 'Nur-Lesen Modus'}
                    <span className="vgt-caption">Nur Owner und Admins können schreiben.</span>
                  </span>
                </label>

                <label className="vgt-switch" htmlFor="settings-top-secret">
                  <input
                    id="settings-top-secret"
                    type="checkbox"
                    checked={topSecret}
                    onChange={event => onTopSecretChange(event.target.checked)}
                    disabled={activeRoom?.TopSecret || activeRoom?.topSecret}
                  />
                  <span className="vgt-switch__track" aria-hidden="true" />
                  <span className="vgt-field__label">
                    Top Secret (Dual-PQC)
                    <span className="vgt-caption">
                      {activeRoom?.TopSecret || activeRoom?.topSecret
                        ? 'Bereits aktiv und nicht rücknehmbar.'
                        : 'Aktiviert Dual-PQC, Hybrid-Signatur und Cipher-Kaskade mit Downgrade-Schutz.'}
                    </span>
                  </span>
                </label>

                <div className="vgt-field">
                  <label className="vgt-label" htmlFor="settings-slow-mode">
                    {t('group_settings_slow_mode') || 'Slow Mode (Sende-Cooldown)'}
                  </label>
                  <select
                    id="settings-slow-mode"
                    className="input-field"
                    value={slowModeSeconds}
                    onChange={event => onSlowModeSecondsChange(Number(event.target.value))}
                  >
                    {SLOW_MODE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>
            )}

            <div className="vgt-dialog__actions vgt-dialog__actions--split">
              {isOwner && onDelete ? (
                <button type="button" className="btn-danger-outline" onClick={onDelete}>
                  <Icon name="trash" size={15} />
                  {t('group_delete_title') || 'Gruppe löschen'}
                </button>
              ) : (
                <span />
              )}
              <div className="vgt-dialog__actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  {t('abbrechen') || 'Abbrechen'}
                </button>
                {isPrivileged && (
                  <button type="submit" className="btn-primary">
                    <Icon name="check" size={15} />
                    {t('speichern') || 'Speichern'}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {activeTab === 'members' && (
          <MembersSection
            activeRoom={activeRoom}
            activeIdentity={activeIdentity}
            displayGaiaID={displayGaiaID}
            memberSearchQuery={memberSearchQuery}
            setMemberSearchQuery={setMemberSearchQuery}
            filteredMembers={filteredMembers}
            isOwner={isOwner}
            isAdmin={isAdmin}
            handleUpdateMemberRole={handleUpdateMemberRole}
            requestTransfer={requestTransfer}
            requestKick={requestKick}
            triggerAlert={triggerAlert}
            t={t}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsSection
            activeRoom={activeRoom}
            joinRequests={joinRequests}
            requestsLoading={requestsLoading}
            handleModerateJoinRequest={handleModerateJoinRequest}
            fetchRequests={fetchRequests}
            triggerAlert={triggerAlert}
            displayGaiaID={displayGaiaID}
            t={t}
          />
        )}

        {activeTab === 'invites' && (
          <InvitesSection
            inviteExpiry={inviteExpiry}
            setInviteExpiry={setInviteExpiry}
            inviteMaxUses={inviteMaxUses}
            setInviteMaxUses={setInviteMaxUses}
            generatedInviteLink={generatedInviteLink}
            inviteCopied={inviteCopied}
            handleGenerateLink={handleGenerateLink}
            handleCopyLink={handleCopyLink}
          />
        )}

        {activeTab === 'logs' && <LogsSection moderationLogs={moderationLogs} logsLoading={logsLoading} />}
      </div>
    </DialogShell>
  );
}
