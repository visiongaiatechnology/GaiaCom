// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState } from 'react';
import AvatarPicker from '../common/AvatarPicker';
import { GROUP_AVATARS } from '../../utils/avatar';

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
  const [inviteExpiry, setInviteExpiry] = useState(3600); // 1 hour
  const [inviteMaxUses, setInviteMaxUses] = useState(10); // 10 uses
  const [generatedInviteLink, setGeneratedInviteLink] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const members = activeRoom?.Members || [];
  const actor = members.find(m => m.IdentityID === activeIdentity?.ID);
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
        // Construct public URL if applicable, or show code token
        const fullLink = `${window.location.origin}/invite/${res.token}`;
        setGeneratedInviteLink(fullLink);
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
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const filteredMembers = members.filter(m => {
    const q = memberSearchQuery.toLowerCase();
    const displayName = (m.Identity?.DisplayName || m.Username || '').toLowerCase();
    const gaiaID = (m.Identity?.GaiaID || '').toLowerCase();
    return displayName.includes(q) || gaiaID.includes(q);
  });

  return (
    <div className="popup-overlay" style={{ zIndex: 1100 }}>
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '640px', textAlign: 'left', display: 'flex', flexDirection: 'column', maxHeight: '85vh', padding: '24px' }}>
        
        {/* Header */}
        <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '1.25rem' }}>
          <span>{t('group_settings_title') || 'Gruppen-Einstellungen'}</span>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.85rem' }} 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} 
            onClick={() => setActiveTab('general')}
            style={{ padding: '8px 16px', background: activeTab === 'general' ? 'rgba(0, 242, 254, 0.12)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', color: activeTab === 'general' ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: activeTab === 'general' ? 'bold' : 'normal' }}
          >
            {t('tab_general') || 'Allgemein'}
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} 
            onClick={() => setActiveTab('members')}
            style={{ padding: '8px 16px', background: activeTab === 'members' ? 'rgba(0, 242, 254, 0.12)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', color: activeTab === 'members' ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: activeTab === 'members' ? 'bold' : 'normal' }}
          >
            {t('tab_members') || 'Mitglieder'}
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('requests'); fetchRequests(); }}
            style={{ padding: '8px 16px', background: activeTab === 'requests' ? 'rgba(0, 242, 254, 0.12)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', color: activeTab === 'requests' ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: activeTab === 'requests' ? 'bold' : 'normal' }}
          >
            {t('tab_requests') || 'Anfragen'} ({joinRequests?.length || 0})
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'invites' ? 'active' : ''}`} 
            onClick={() => setActiveTab('invites')}
            style={{ padding: '8px 16px', background: activeTab === 'invites' ? 'rgba(0, 242, 254, 0.12)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', color: activeTab === 'invites' ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: activeTab === 'invites' ? 'bold' : 'normal' }}
          >
            {t('tab_invites') || 'Einladungen'}
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('logs'); fetchLogs(); }}
            style={{ padding: '8px 16px', background: activeTab === 'logs' ? 'rgba(0, 242, 254, 0.12)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', color: activeTab === 'logs' ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: activeTab === 'logs' ? 'bold' : 'normal' }}
          >
            {t('tab_logs') || 'Protokoll'}
          </button>
        </div>

        {/* Scrollable Content Pane */}
        <div className="settings-content gaia-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '20px', minHeight: '300px' }}>
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }}>
              <div className="form-group">
                <label>{t('group_settings_name') || 'Gruppenname'}</label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={event => onNameChange(event.target.value)}
                  maxLength={80}
                  disabled={!isPrivileged}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('group_settings_desc') || 'Beschreibung'}</label>
                <textarea
                  className="input-field"
                  value={description}
                  onChange={event => onDescriptionChange(event.target.value)}
                  maxLength={500}
                  disabled={!isPrivileged}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <label>{t('group_settings_avatar') || 'Gruppen-Avatar'}</label>
                <AvatarPicker value={avatar} options={GROUP_AVATARS} onChange={onAvatarChange} disabled={!isPrivileged} />
              </div>

              {isPrivileged && (
                <>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="checkbox"
                      id="settingsIsCrisis"
                      checked={isCrisis}
                      onChange={event => onIsCrisisChange(event.target.checked)}
                      style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                    />
                    <label htmlFor="settingsIsCrisis" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      {t('group_settings_is_crisis') || 'Als Krisenraum markieren (aktiviert erweiterte Sicherheitswarnungen)'}
                    </label>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="checkbox"
                      id="settingsIsPrivate"
                      checked={isPrivate}
                      onChange={event => onIsPrivateChange(event.target.checked)}
                      style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                    />
                    <label htmlFor="settingsIsPrivate" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      {t('group_settings_is_private') || 'Privater Raum (nicht öffentlich durchsuchbar, Beitritt nur über Beitrittsanfragen)'}
                    </label>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="checkbox"
                      id="settingsReadOnly"
                      checked={readOnly}
                      onChange={event => onReadOnlyChange(event.target.checked)}
                      style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                    />
                    <label htmlFor="settingsReadOnly" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      {t('group_settings_read_only') || 'Nur-Lesen Modus (Nur Owner und Admins können Nachrichten senden)'}
                    </label>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="checkbox"
                      id="settingsTopSecret"
                      checked={topSecret}
                      onChange={event => onTopSecretChange(event.target.checked)}
                      disabled={activeRoom?.TopSecret || activeRoom?.topSecret}
                      style={{ width: 'auto', margin: 0, cursor: (activeRoom?.TopSecret || activeRoom?.topSecret) ? 'not-allowed' : 'pointer' }}
                    />
                    <label htmlFor="settingsTopSecret" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Top Secret Mode aktivieren (Ed25519 + ML-DSA-87, downgrade-geschuetzt)
                    </label>
                  </div>

                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>{t('group_settings_slow_mode') || 'Slow Mode (Sende-Cooldown)'}</label>
                    <select
                      className="input-field"
                      value={slowModeSeconds}
                      onChange={event => onSlowModeSecondsChange(Number(event.target.value))}
                      style={{ background: 'rgba(20, 20, 25, 0.8)' }}
                    >
                      <option value={0}>Aus (Kein Cooldown)</option>
                      <option value={5}>5 Sekunden</option>
                      <option value={10}>10 Sekunden</option>
                      <option value={30}>30 Sekunden</option>
                      <option value={60}>1 Minute</option>
                      <option value={300}>5 Minuten</option>
                    </select>
                  </div>
                </>
              )}

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '20px' }}>
                {isOwner && onDelete ? (
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ background: 'var(--danger-glow)', color: 'var(--danger)', borderColor: 'var(--danger)', width: 'auto', padding: '0 16px' }} 
                    onClick={onDelete}
                  >
                    {t('group_delete_title') || 'Gruppe löschen'}
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={onClose}>
                    {t('abbrechen') || 'Abbrechen'}
                  </button>
                  {isPrivileged && (
                    <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
                      {t('speichern') || 'Speichern'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                className="input-field"
                placeholder={t('search_members') || 'Mitglieder durchsuchen...'}
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {filteredMembers.map(m => {
                  const isSelf = m.IdentityID === activeIdentity?.ID;
                  const isMemberOwner = m.Role === 'owner';
                  const isMemberAdmin = m.Role === 'admin';
                  
                  return (
                    <div key={m.IdentityID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {m.Identity?.DisplayName || m.Username || 'Anonymer Nutzer'}
                          {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Du)</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {m.Identity?.GaiaID ? displayGaiaID(m.Identity.GaiaID) : 'Keine Gaia-Adresse'}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Role Badge */}
                        <span className={`member-role ${m.Role}`} style={{ 
                          fontSize: '0.7rem', 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontWeight: 'bold',
                          background: isMemberOwner 
                            ? 'rgba(253, 184, 19, 0.15)' 
                            : isMemberAdmin 
                              ? 'rgba(0, 242, 254, 0.15)' 
                              : 'rgba(255, 255, 255, 0.05)',
                          color: isMemberOwner 
                            ? '#fdb813' 
                            : isMemberAdmin 
                              ? 'var(--accent-cyan)' 
                              : 'var(--text-secondary)'
                        }}>
                          {m.Role === 'owner' ? 'Owner' : m.Role === 'admin' ? 'Admin' : 'Member'}
                        </span>

                        {/* Owner Actions */}
                        {isOwner && !isSelf && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select 
                              className="input-field" 
                              style={{ width: 'auto', padding: '2px 6px', height: '28px', fontSize: '0.75rem', background: 'rgba(20,20,25,0.8)' }}
                              value={m.Role} 
                              onChange={async (e) => {
                                try {
                                  await handleUpdateMemberRole(activeRoom.id, m.IdentityID, e.target.value);
                                } catch (err) {
                                  triggerAlert?.('Fehler beim Aendern der Rolle', err.message, 'danger');
                                }
                              }}
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>

                            <button 
                              type="button" 
                              className="btn-secondary" 
                              style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem', height: '28px' }}
                              onClick={async () => {
                                showConfirm?.(
                                  'Eigentum uebergeben',
                                  `Eigentum an ${m.Identity?.DisplayName || m.Username} uebergeben? Du wirst zum Admin.`,
                                  async () => {
                                    try {
                                      await handleTransferOwnership(activeRoom.id, m.IdentityID);
                                    } catch (err) {
                                      triggerAlert?.('Fehler bei Uebergabe', err.message, 'danger');
                                    }
                                  },
                                  null,
                                  'Uebergeben',
                                  'Abbrechen',
                                  true
                                );
                              }}
                            >
                              👑 Übergabe
                            </button>

                            <button 
                              type="button" 
                              className="btn-secondary" 
                              style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem', height: '28px', background: 'rgba(255, 59, 48, 0.1)', color: 'var(--danger)', borderColor: 'rgba(255, 59, 48, 0.2)' }}
                              onClick={async () => {
                                showConfirm?.(
                                  'Mitglied entfernen',
                                  `${m.Identity?.DisplayName || m.Username} wirklich entfernen?`,
                                  async () => {
                                    try {
                                      await handleKickMember(activeRoom.id, m.IdentityID);
                                    } catch (err) {
                                      triggerAlert?.('Fehler beim Entfernen', err.message, 'danger');
                                    }
                                  },
                                  null,
                                  'Entfernen',
                                  'Abbrechen',
                                  true
                                );
                              }}
                            >
                              Kicken
                            </button>
                          </div>
                        )}

                        {/* Admin Actions */}
                        {isAdmin && !isSelf && !isMemberOwner && !isMemberAdmin && (
                          <button 
                            type="button" 
                            className="btn-secondary" 
                            style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem', height: '28px', background: 'rgba(255, 59, 48, 0.1)', color: 'var(--danger)', borderColor: 'rgba(255, 59, 48, 0.2)' }}
                            onClick={async () => {
                              showConfirm?.(
                                  'Mitglied entfernen',
                                  `${m.Identity?.DisplayName || m.Username} wirklich entfernen?`,
                                  async () => {
                                    try {
                                      await handleKickMember(activeRoom.id, m.IdentityID);
                                    } catch (err) {
                                      triggerAlert?.('Fehler beim Entfernen', err.message, 'danger');
                                    }
                                  },
                                  null,
                                  'Entfernen',
                                  'Abbrechen',
                                  true
                                );
                            }}
                          >
                            Kicken
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: JOIN REQUESTS */}
          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {requestsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Lade Beitrittsanfragen...</div>
              ) : joinRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  Keine ausstehenden Beitrittsanfragen.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {joinRequests.map(req => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{req.Requester?.DisplayName || 'Unbekannter Anfrager'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {req.Requester?.GaiaID ? displayGaiaID(req.Requester.GaiaID) : req.RequesterID}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button" 
                          className="btn-primary" 
                          style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                          onClick={async () => {
                            try {
                              await handleModerateJoinRequest(activeRoom.id, req.id, 'approved');
                              fetchRequests();
                            } catch (err) {
                              triggerAlert?.('Fehler beim Bestaetigen', err.message, 'danger');
                            }
                          }}
                        >
                          Annehmen
                        </button>
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem', background: 'rgba(255, 59, 48, 0.1)', color: 'var(--danger)', borderColor: 'rgba(255, 59, 48, 0.2)' }}
                          onClick={async () => {
                            try {
                              await handleModerateJoinRequest(activeRoom.id, req.id, 'rejected');
                              fetchRequests();
                            } catch (err) {
                              triggerAlert?.('Fehler beim Ablehnen', err.message, 'danger');
                            }
                          }}
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INVITES */}
          {activeTab === 'invites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Gültigkeitsdauer</label>
                  <select 
                    className="input-field" 
                    value={inviteExpiry} 
                    onChange={e => setInviteExpiry(Number(e.target.value))}
                    style={{ background: 'rgba(20,20,25,0.8)' }}
                  >
                    <option value={3600}>1 Stunde</option>
                    <option value={86400}>1 Tag</option>
                    <option value={604800}>7 Tage</option>
                    <option value={0}>Unbegrenzt</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Maximale Verwendungen</label>
                  <select 
                    className="input-field" 
                    value={inviteMaxUses} 
                    onChange={e => setInviteMaxUses(Number(e.target.value))}
                    style={{ background: 'rgba(20,20,25,0.8)' }}
                  >
                    <option value={1}>1 Mal</option>
                    <option value={5}>5 Mal</option>
                    <option value={10}>10 Mal</option>
                    <option value={0}>Unbegrenzt</option>
                  </select>
                </div>
              </div>

              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleGenerateLink}
                style={{ width: '100%' }}
              >
                🔗 Einladungslink generieren
              </button>

              {generatedInviteLink && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={generatedInviteLink}
                    readOnly
                    style={{ flex: 1, border: 'none', background: 'transparent', margin: 0, padding: 0 }}
                  />
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={handleCopyLink}
                    style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    {inviteCopied ? 'Kopiert! ✓' : 'Kopieren'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT LOG */}
          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Lade Protokoll...</div>
              ) : moderationLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  Keine Moderationsereignisse protokolliert.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto' }}>
                  {moderationLogs.map(log => {
                    const date = new Date(log.createdAt).toLocaleString();
                    return (
                      <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>{log.ActorUsername || log.ActorIdentityID}</span>
                          <span>{date}</span>
                        </div>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                          Action: <span style={{ color: 'var(--accent-cyan)' }}>{log.Action}</span>
                        </div>
                        {log.Reason && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                            Grund: {log.Reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
