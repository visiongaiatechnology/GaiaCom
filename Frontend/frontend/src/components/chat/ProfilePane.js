// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../api';
import DecryptedAvatar from './gsn/DecryptedAvatar';

export const ProfilePane = ({
  activeIdentity,
  displayGaiaID,
  profileAvatar,
  setProfileAvatar,
  profileDisplayName,
  setProfileDisplayName,
  profileRealName,
  setProfileRealName,
  profileWebsite,
  setProfileWebsite,
  profileBio,
  setProfileBio,
  saveProfile,
  handleAvatarFileChange,
  currentPasswordInput,
  setCurrentPasswordInput,
  newPasswordInput,
  setNewPasswordInput,
  confirmPasswordInput,
  setConfirmPasswordInput,
  passwordChangeError,
  handleChangePassword,
  areKeysUnlocked,
  profilePasswordInput,
  setProfilePasswordInput,
  handleUnlockProfileKeys,
  profileUnlockError,
  derivedKeys,
  mnemonic,
  setAreKeysUnlocked,
  setCurrentMenu,
  t,
  activeSection,
  setActiveProfileSection,
  cryptoSessionMinutes,
  setCryptoSessionMinutes,
  inactivityLockMinutes,
  setInactivityLockMinutes,
  pinUnlockEnabled,
  handleSetUnlockPin,
  handleRemoveUnlockPin,
  webAuthnUnlockEnabled,
  handleSetWebAuthnUnlock,
  handleRemoveWebAuthnUnlock,
  handleDeleteAccount,
  handleExportRecoveryBackup,
  user,
  handleUpdatePrivacySettings,
  mailSettings,
  saveSettings,
  filterRules,
  saveFilterRule,
  labelsList
}) => {
  const [deviceSessions, setDeviceSessions] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyError, setPrivacyError] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockPinConfirm, setUnlockPinConfirm] = useState('');
  const [unlockPinBusy, setUnlockPinBusy] = useState(false);
  const [unlockPinError, setUnlockPinError] = useState('');
  const [webAuthnBusy, setWebAuthnBusy] = useState(false);
  const [webAuthnError, setWebAuthnError] = useState('');

  // Mailbox Settings States
  const [sigInput, setSigInput] = useState('');
  const [localeInput, setLocaleInput] = useState('de');
  const [keyboardModeInput, setKeyboardModeInput] = useState('default');

  // Filter creation States
  const [filterSender, setFilterSender] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterAction, setFilterAction] = useState('important');
  const [filterLabelVal, setFilterLabelVal] = useState('');

  useEffect(() => {
    if (mailSettings) {
      setSigInput(mailSettings.signature || '');
      setLocaleInput(mailSettings.locale || 'de');
      setKeyboardModeInput(mailSettings.keyboardMode || 'default');
    }
  }, [mailSettings]);

  const loadDeviceSessions = useCallback(async () => {
    setDevicesLoading(true);
    setDevicesError('');
    try {
      const result = await api.getDeviceSessions();
      setDeviceSessions(Array.isArray(result?.devices) ? result.devices : []);
    } catch (error) {
      setDevicesError(error.message || 'Geräte konnten nicht geladen werden.');
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeviceSessions();
  }, [loadDeviceSessions]);

  const revokeDevice = async session => {
    if (!session?.id || session.isCurrent) return;
    setDevicesError('');
    try {
      await api.revokeDeviceSession(session.id);
      await loadDeviceSessions();
    } catch (error) {
      setDevicesError(error.message || 'Gerät konnte nicht abgemeldet werden.');
    }
  };

  const formatDeviceTime = value => {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const submitDeleteAccount = async event => {
    event.preventDefault();
    setDeleteError('');
    setDeleteBusy(true);
    try {
      await handleDeleteAccount({
        currentPassword: deletePassword,
        confirmation: deleteConfirmation
      });
    } catch (error) {
      setDeleteError(error.message || 'Account konnte nicht geloescht werden.');
      setDeleteBusy(false);
    }
  };

  const submitAnonymousStatsPreference = async allowAnonymousStats => {
    if (!handleUpdatePrivacySettings || privacyBusy) return;
    setPrivacyError('');
    setPrivacyBusy(true);
    try {
      await handleUpdatePrivacySettings(allowAnonymousStats);
    } catch (error) {
      setPrivacyError(error.message || 'Privacy settings could not be updated.');
    } finally {
      setPrivacyBusy(false);
    }
  };

  const handleSaveMailboxSettings = async (e) => {
    e.preventDefault();
    if (!saveSettings) return;
    try {
      await saveSettings({
        ...mailSettings,
        signature: sigInput,
        locale: localeInput,
        keyboardMode: keyboardModeInput
      });
    } catch (_) {}
  };

  const handleAddFilter = async (e) => {
    e.preventDefault();
    if (!saveFilterRule) return;
    const rule = {
      triggerSender: filterSender.trim(),
      triggerSubject: filterSubject.trim(),
      action: filterAction,
      actionLabel: filterAction === 'label' ? filterLabelVal : ''
    };
    try {
      await saveFilterRule(rule);
      setFilterSender('');
      setFilterSubject('');
      setFilterAction('important');
      setFilterLabelVal('');
    } catch (_) {}
  };

  const handleRecoveryExport = async () => {
    setRecoveryError('');
    if (!handleExportRecoveryBackup) return;
    if (!areKeysUnlocked || !mnemonic) {
      setRecoveryError('Schluessel erst entsperren, dann Recovery-Datei exportieren.');
      return;
    }
    if (recoveryPassword.length < 12) {
      setRecoveryError('Das Recovery-Passwort muss mindestens 12 Zeichen haben.');
      return;
    }
    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryError('Die Recovery-Passwoerter stimmen nicht ueberein.');
      return;
    }
    setRecoveryBusy(true);
    try {
      await handleExportRecoveryBackup(recoveryPassword);
      setRecoveryPassword('');
      setRecoveryConfirmPassword('');
    } catch (err) {
      setRecoveryError(err.message || 'Recovery-Datei konnte nicht erstellt werden.');
    } finally {
      setRecoveryBusy(false);
    }
  };

  const submitUnlockPin = async event => {
    event.preventDefault();
    setUnlockPinError('');
    if (!handleSetUnlockPin || unlockPinBusy) return;
    setUnlockPinBusy(true);
    try {
      await handleSetUnlockPin(unlockPin, unlockPinConfirm);
      setUnlockPin('');
      setUnlockPinConfirm('');
    } catch (error) {
      setUnlockPinError(error.message || 'PIN konnte nicht gespeichert werden.');
    } finally {
      setUnlockPinBusy(false);
    }
  };

  const submitWebAuthnUnlock = async () => {
    setWebAuthnError('');
    if (!handleSetWebAuthnUnlock || webAuthnBusy) return;
    setWebAuthnBusy(true);
    try {
      await handleSetWebAuthnUnlock();
    } catch (error) {
      setWebAuthnError(error.message || 'Geraete-Schluessel konnte nicht eingerichtet werden.');
    } finally {
      setWebAuthnBusy(false);
    }
  };

  if (!activeSection) {
    return (
      <div className="profile-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {t('profile_settings_hint') || 'Profil-Einstellungen werden im rechten Panel angezeigt.'}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container" style={{ height: '100%', overflowY: 'auto', padding: '20px' }}>
      <button 
        type="button" 
        className="mobile-back-btn" 
        onClick={() => {
          if (setActiveProfileSection) {
            setActiveProfileSection(null);
          } else {
            setCurrentMenu('inbox');
          }
        }}
      >
        ← {t('wizard_back') || 'Zurück'}
      </button>
      
      {activeSection === 'edit' && (
        <>
          <h2>{t('edit_profile') || 'Profil bearbeiten'}</h2>
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="profile-card">
              <div className="profile-avatar-big">
                {profileAvatar.startsWith('{"fileId"') ? (
                  <DecryptedAvatar avatarJson={profileAvatar} displayName={profileDisplayName} variant="profile" />
                ) : profileAvatar.startsWith('data:image/') ? (
                  <img src={profileAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profileAvatar
                )}
              </div>
              <div>
                <h3>{profileDisplayName || (t('no_specification') || 'Kein Anzeigename')}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : ''}</p>
                {profileRealName && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>Name: {profileRealName}</p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>{t('biography') || 'Biografie'}: {profileBio || (t('no_specification') || 'Keine Angabe')}</p>
                {profileWebsite && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>Webseite: {profileWebsite}</p>
                )}
              </div>
            </div>

            <div className="profile-section-card">
              <div className="profile-section-title">{t('edit_profile') || 'Profil bearbeiten'}</div>
              <form onSubmit={saveProfile}>
                <div className="form-group">
                  <label>{t('display_name') || 'Anzeigename'}</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={profileDisplayName} 
                    onChange={e => setProfileDisplayName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Echter Name (freiwillig)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileRealName}
                    onChange={e => setProfileRealName(e.target.value)}
                    placeholder="Nur sichtbar, wenn du ihn speicherst"
                  />
                </div>

                <div className="form-group">
                  <label>Webseite (freiwillig)</label>
                  <input
                    type="url"
                    className="input-field"
                    value={profileWebsite}
                    onChange={e => setProfileWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="form-group">
                  <label>{t('bio_status') || 'Biografie / Status'}</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={profileBio} 
                    onChange={e => setProfileBio(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label>{t('choose_avatar') || 'Avatar wählen'}</label>
                  
                  <div className="custom-avatar-upload-row">
                    <div className="avatar-upload-preview">
                      {profileAvatar.startsWith('data:image/') ? (
                        <img src={profileAvatar} alt="Avatar" />
                      ) : profileAvatar.startsWith('{"fileId"') ? (
                        <DecryptedAvatar avatarJson={profileAvatar} displayName={profileDisplayName} variant="editor" />
                      ) : (
                        <span>{profileAvatar}</span>
                      )}
                    </div>
                    <label className="avatar-upload-btn">
                      {t('upload_avatar_btn') || 'Bild hochladen (Sanitized)'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarFileChange} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>

                  <div className="avatar-grid">
                    {['🤖', '👽', '🚀', '🛡️', '🌐', '🌌', '🧬', '💻', '🧠', '⚡', '✨', '🔥'].map(av => (
                      <div 
                        key={av} 
                        className={`avatar-item ${profileAvatar === av ? 'active' : ''}`}
                        onClick={() => setProfileAvatar(av)}
                      >
                        {av}
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 30px' }}>
                  {t('save_profile') || 'Profil speichern'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* NEW: MAILBOX SETTINGS TAB */}
      {activeSection === 'mailbox_settings' && (
        <>
          <h2>📬 {t('mailbox_settings_title') || 'Mailbox-Einstellungen'}</h2>
          <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Signature & Preferences */}
            <div className="profile-section-card">
              <div className="profile-section-title">Signatur & Präferenzen</div>
              <form onSubmit={handleSaveMailboxSettings}>
                <div className="form-group">
                  <label>E-Mail-Signatur (Wird automatisch an neue Nachrichten angehängt)</label>
                  <textarea
                    className="input-field"
                    value={sigInput}
                    onChange={e => setSigInput(e.target.value)}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Mit freundlichen Grüßen,..."
                  />
                </div>

                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Sprache (Locale)</label>
                  <select
                    className="input-field"
                    value={localeInput}
                    onChange={e => setLocaleInput(e.target.value)}
                  >
                    <option value="de">Deutsch (DE)</option>
                    <option value="en">English (EN)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Tastatur-Kurzbefehle (Gmail-Style)</label>
                  <select
                    className="input-field"
                    value={keyboardModeInput}
                    onChange={e => setKeyboardModeInput(e.target.value)}
                  >
                    <option value="default">Deaktiviert</option>
                    <option value="gmail">Aktiviert (gi, gs, gc, c, r, e, #)</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 30px', marginTop: '15px' }}>
                  {t('speichern') || 'Speichern'}
                </button>
              </form>
            </div>

            {/* Custom Mail Filters */}
            <div className="profile-section-card">
              <div className="profile-section-title">Eingehende Filterregeln</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Erstellen Sie Regeln, um eingehende Mails basierend auf Kriterien automatisch zu verarbeiten.
              </p>

              {/* Existing Filters List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {filterRules && filterRules.length > 0 ? (
                  filterRules.map((rule, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <strong>Regel {idx+1}:</strong> Wenn{' '}
                      {rule.triggerSender && `Sender enthält "${rule.triggerSender}"`}
                      {rule.triggerSender && rule.triggerSubject && ' und '}
                      {rule.triggerSubject && `Betreff enthält "${rule.triggerSubject}"`}
                      {' '}&rarr; Aktion: <strong>
                        {rule.action === 'important' && 'Als wichtig markieren'}
                        {rule.action === 'star' && 'Stern hinzufügen'}
                        {rule.action === 'read' && 'Als gelesen markieren'}
                        {rule.action === 'label' && `Label "${rule.actionLabel}" zuweisen`}
                      </strong>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Keine Filterregeln definiert.</div>
                )}
              </div>

              {/* Create new Filter Form */}
              <form onSubmit={handleAddFilter} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '10px', color: 'var(--accent-cyan)' }}>Neue Filterregel hinzufügen</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Wenn Sender enthält:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="z. B. alice@gaiacom.de"
                      value={filterSender}
                      onChange={e => setFilterSender(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Wenn Betreff enthält:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="z. B. Dringend"
                      value={filterSubject}
                      onChange={e => setFilterSubject(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Aktion ausführen:</label>
                    <select
                      className="input-field"
                      value={filterAction}
                      onChange={e => setFilterAction(e.target.value)}
                    >
                      <option value="important">Als wichtig markieren</option>
                      <option value="star">Stern hinzufügen</option>
                      <option value="read">Als gelesen markieren</option>
                      <option value="label">Label zuweisen</option>
                    </select>
                  </div>

                  {filterAction === 'label' && (
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem' }}>Zuzuweisendes Label:</label>
                      <select
                        className="input-field"
                        value={filterLabelVal}
                        onChange={e => setFilterLabelVal(e.target.value)}
                        required
                      >
                        <option value="">-- Label wählen --</option>
                        {labelsList && labelsList.map(l => (
                          <option key={l.id || l.name} value={l.name}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 20px', fontSize: '0.8rem' }} disabled={!filterSender && !filterSubject}>
                  Regel erstellen
                </button>
              </form>
            </div>

            {/* Zero-Knowledge Backup warning panel */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(241, 196, 15, 0.3)', background: 'rgba(241, 196, 15, 0.03)' }}>
              <h4 style={{ color: 'var(--warning)', fontSize: '0.9rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Kritischer Hinweis: Schlüssel-Backup & Recovery
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                GaiaCOM ist ein echtes <strong>Zero-Knowledge-System</strong>. Ihre privaten kryptographischen Schlüssel verlassen niemals Ihr Gerät. 
                Es gibt keinen Administrator-Zugang und keine "Passwort vergessen"-Funktion auf dem Server, die Ihre Nachrichten entschlüsseln könnte.
                <br /><br />
                Bitte notieren Sie Ihre <strong>Mnemonic Seed Phrase (12 Wörter)</strong> auf einem analogen Medium (Papier) und verwahren Sie es an einem sicheren Ort (Tresor). 
                Sollten Sie sich auf einem neuen Gerät anmelden, können Sie Ihre Schlüssel nur mit dieser Seed Phrase wiederherstellen.
                <br /><br />
                Sie können Ihre Seed Phrase und privaten Schlüssel jederzeit im Tab{' '}
                <button 
                  type="button" 
                  className="link-button" 
                  onClick={() => setActiveProfileSection('keys')}
                  style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}
                >
                  Schlüssel anzeigen
                </button>{' '}
                einsehen, sofern Sie Ihr Passwort kennen.
              </p>
            </div>

          </div>
        </>
      )}

      {activeSection === 'password' && (
        <>
          <h2>{t('change_password_title') || 'Passwort ändern'}</h2>
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div className="profile-section-card">
              <div className="profile-section-title">
                {t('change_password_title') || 'Passwort ändern'}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                {t('change_password_desc') || 'Ändert dein serverseitiges Login-Passwort. Deine lokale Recovery Phrase bleibt separat durch dein Vault-/Unlock-Passwort geschützt.'}
              </p>
              
              <form onSubmit={handleChangePassword}>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label>{t('current_password') || 'Aktuelles Passwort'}</label>
                  <input
                    type="password"
                    className="input-field"
                    value={currentPasswordInput}
                    onChange={e => setCurrentPasswordInput(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label>{t('new_password') || 'Neues Passwort'}</label>
                  <input
                    type="password"
                    className="input-field"
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>{t('confirm_new_password') || 'Neues Passwort confirmar'}</label>
                  <input
                    type="password"
                    className="input-field"
                    value={confirmPasswordInput}
                    onChange={e => setConfirmPasswordInput(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                
                {passwordChangeError && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '15px' }}>
                    {passwordChangeError}
                  </p>
                )}
                
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 30px' }}>
                  {t('update_password') || 'Passwort aktualisieren'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {activeSection === 'devices' && (
        <>
          <h2>{t('device_sessions_title') || 'Angemeldete Geräte'}</h2>
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div className="profile-section-card">
              <div className="profile-section-title">{t('device_sessions_title') || 'Angemeldete Geräte'}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
                {t('device_sessions_desc') || 'Prüfe aktive Sitzungen und melde fremde Geräte ab.'}
              </p>
              {devicesError && <p className="form-error">{devicesError}</p>}
              <div className="device-session-list">
                {devicesLoading ? (
                  <div className="device-session-card muted">{t('loading') || 'Laden...'}</div>
                ) : deviceSessions.length === 0 ? (
                  <div className="device-session-card muted">{t('device_sessions_empty') || 'Keine Geräte gefunden.'}</div>
                ) : deviceSessions.map(session => (
                  <div key={session.id} className={`device-session-card ${session.isCurrent ? 'current' : ''}`}>
                     <div className="device-session-main">
                       <strong>{session.deviceLabel || session.deviceType || 'Device'}</strong>
                       <span>{[session.os, session.browser, session.deviceType].filter(Boolean).join(' · ')}</span>
                       <small>IP: {session.ipAddress || '-'}</small>
                       <small>{t('device_since') || 'Seit'}: {formatDeviceTime(session.createdAt)} · {t('device_last_seen') || 'Zuletzt'}: {formatDeviceTime(session.lastSeenAt)}</small>
                     </div>
                     {session.isCurrent ? (
                       <span className="device-current-pill">{t('device_current') || 'Dieses Gerät'}</span>
                     ) : (
                       <button type="button" className="btn-secondary device-revoke-btn" onClick={() => revokeDevice(session)}>
                         {t('device_logout') || 'Abmelden'}
                       </button>
                     )}
                  </div>
                ))}
              </div>
              <button type="button" className="btn-action" style={{ marginTop: '12px' }} onClick={loadDeviceSessions}>
                {t('refresh') || 'Aktualisieren'}
              </button>
            </div>
          </div>
        </>
      )}

      {activeSection === 'security' && (
        <>
          <h2>{t('crypto_lock_title') || 'Kryptografische Sperre'}</h2>
          <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
            <div className="profile-section-card">
              <div className="profile-section-title">{t('crypto_lock_title') || 'Kryptografische Sperre'}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                {t('crypto_lock_desc') || 'Steuert, wann GaiaCOM die lokalen Kryptoschlüssel wieder aus dem Arbeitsspeicher entfernt.'}
              </p>

              <div className="profile-settings-grid">
                <label className="profile-setting-row">
                  <span>
                    <strong>{t('crypto_session_duration') || 'Entsperrt nach Reload'}</strong>
                    <small>{t('crypto_session_duration_desc') || 'Hält die Kryptositzung nur für die gewählte Dauer in diesem Browser-Tab offen.'}</small>
                  </span>
                  <select
                    className="input-field"
                    value={cryptoSessionMinutes}
                    onChange={event => setCryptoSessionMinutes(event.target.value)}
                  >
                    <option value="0">{t('lock_on_reload') || 'Immer nach Reload sperren'}</option>
                    <option value="15">15 min</option>
                    <option value="60">1 h</option>
                    <option value="480">8 h</option>
                    <option value="1440">24 h</option>
                  </select>
                </label>

                <label className="profile-setting-row">
                  <span>
                    <strong>{t('inactivity_lock_duration') || 'Sperren bei Inaktivität'}</strong>
                    <small>{t('inactivity_lock_duration_desc') || 'Nach dieser Zeit ohne Eingabe wird GaiaCOM automatisch kryptografisch gesperrt.'}</small>
                  </span>
                  <select
                    className="input-field"
                    value={inactivityLockMinutes}
                    onChange={event => setInactivityLockMinutes(event.target.value)}
                  >
                    <option value="0">{t('never_auto_lock') || 'Nie automatisch'}</option>
                    <option value="5">5 min</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">1 h</option>
                  </select>
                </label>
              </div>

              <form className="pin-settings-card" onSubmit={submitUnlockPin}>
                <div>
                  <div className="profile-section-title">Geraete-Code-Entsperrung</div>
                  <p>
                    Der Geraete-Code gilt nur auf diesem Geraet und speichert eine zweite lokal verschluesselte Kopie deiner
                    Schluessel. Neue Codes brauchen 12 bis 32 Zeichen; reine Zahlen muessen mindestens 14 Stellen haben.
                  </p>
                  <span className={`pin-status-pill ${pinUnlockEnabled ? 'enabled' : 'disabled'}`}>
                    {pinUnlockEnabled ? 'Geraete-Code aktiv' : 'Geraete-Code nicht eingerichtet'}
                  </span>
                </div>
                <div className="pin-settings-grid">
                  <input
                    type="password"
                    inputMode="text"
                    className="input-field"
                    placeholder="Geraete-Code 16-64 Zeichen"
                    value={unlockPin}
                    onChange={event => setUnlockPin(event.target.value.slice(0, 32))}
                    autoComplete="new-password"
                  />
                  <input
                    type="password"
                    inputMode="text"
                    className="input-field"
                    placeholder="Geraete-Code wiederholen"
                    value={unlockPinConfirm}
                    onChange={event => setUnlockPinConfirm(event.target.value.slice(0, 32))}
                    autoComplete="new-password"
                  />
                </div>
                {unlockPinError && <p className="form-error">{unlockPinError}</p>}
                <div className="pin-settings-actions">
                  <button type="submit" className="btn-primary" disabled={unlockPinBusy}>
                    {unlockPinBusy ? 'Speichere...' : (pinUnlockEnabled ? 'Geraete-Code aktualisieren' : 'Geraete-Code aktivieren')}
                  </button>
                  {pinUnlockEnabled && (
                    <button type="button" className="btn-secondary" onClick={handleRemoveUnlockPin}>
                      Geraete-Code entfernen
                    </button>
                  )}
                </div>
              </form>

              <div className="pin-settings-card">
                <div>
                  <div className="profile-section-title">Geraete-Schluessel</div>
                  <p>
                    Nutzt WebAuthn PRF, wenn dein Browser und Authenticator es unterstuetzen. Die lokale
                    Schluesselkopie ist dann ohne dieses Geraet nicht offline entschluesselbar.
                  </p>
                  <span className={`pin-status-pill ${webAuthnUnlockEnabled ? 'enabled' : 'disabled'}`}>
                    {webAuthnUnlockEnabled ? 'Geraete-Schluessel aktiv' : 'Nicht eingerichtet'}
                  </span>
                </div>
                {webAuthnError && <p className="form-error">{webAuthnError}</p>}
                <div className="pin-settings-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={submitWebAuthnUnlock}
                    disabled={webAuthnBusy || !areKeysUnlocked}
                  >
                    {webAuthnBusy ? 'Warte auf Authenticator...' : (webAuthnUnlockEnabled ? 'Neu koppeln' : 'Aktivieren')}
                  </button>
                  {webAuthnUnlockEnabled && (
                    <button type="button" className="btn-secondary" onClick={handleRemoveWebAuthnUnlock}>
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'privacy' && (
        <>
          <h2>Privacy</h2>
          <div style={{ maxWidth: '760px', margin: '0 auto', width: '100%' }}>
            <div className="profile-section-card privacy-profile-card">
              <div className="profile-section-title">Privacy</div>
              <p className="privacy-profile-copy">
                GaiaCom only contributes anonymous aggregate counters to the public Network Health Dashboard. It never publishes GaiaIDs, room names, topics, online activity, relationships, or per-user message counts.
              </p>

              <label className={`privacy-toggle-row ${user?.allowAnonymousStats !== false ? 'enabled' : 'disabled'}`}>
                <span>
                  <strong>Anonymous network statistics</strong>
                  <small>
                    Include this account in anonymous totals such as accounts, identities, rooms, messages in 24h, and GaiaDrops in 24h.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={user?.allowAnonymousStats !== false}
                  onChange={event => submitAnonymousStatsPreference(event.target.checked)}
                  disabled={privacyBusy}
                />
              </label>

              <div className="privacy-proof-grid">
                <div><strong>Allowed</strong><span>Aggregate counts, version distribution, node uptime, federation health.</span></div>
                <div><strong>Blocked</strong><span>GaiaIDs, room names, topics, online timestamps, social graph data, per-user activity.</span></div>
                <div><strong>Default</strong><span>Enabled at registration so the network can show public liveness without analytics profiles.</span></div>
                <div><strong>Control</strong><span>You can opt out here at any time.</span></div>
              </div>

              {privacyError && <p className="form-error">{privacyError}</p>}
              {privacyBusy && <p className="privacy-profile-copy">Saving privacy preference...</p>}
            </div>
          </div>
        </>
      )}

      {activeSection === 'legal' && (
        <>
          <h2>{t('privacy_imprint_title') || 'Datenschutz & Impressum'}</h2>
          <div style={{ maxWidth: '760px', margin: '0 auto', width: '100%' }}>
            <div className="profile-section-card legal-profile-card">
              <div className="profile-section-title">{t('privacy_imprint_title') || 'Datenschutz & Impressum'}</div>
              <p>{t('privacy_imprint_profile_desc') || 'GaiaCOM verarbeitet Kommunikationsinhalte nach dem Prinzip Datenminimierung, Ende-zu-Ende-Verschlüsselung und lokaler Schlüsselkontrolle.'}</p>
              <div className="legal-proof-list">
                <div><strong>E2EE</strong><span>{t('gdpr_reason_e2ee') || 'Private Inhalte bleiben nur für vorgesehene Empfänger entschlüsselbar.'}</span></div>
                <div><strong>{t('zero_knowledge') || 'Zero Knowledge'}</strong><span>{t('gdpr_reason_zero_knowledge') || 'Private Schlüssel und Recovery-Daten bleiben lokal unter Nutzerkontrolle.'}</span></div>
                <div><strong>{t('data_minimization') || 'Datenminimierung'}</strong><span>{t('gdpr_reason_minimal') || 'Metadaten werden nur für Routing, Zustellung und Sicherheitsnachweise genutzt.'}</span></div>
                <div><strong>{t('erasability') || 'Löschbarkeit'}</strong><span>{t('gdpr_reason_delete') || 'Account-Löschung entfernt Konto, Identitäten, lokale Sitzungen und serverseitig zuordenbare Daten.'}</span></div>
              </div>
              <a className="btn-primary legal-link-btn" href="https://gaiacom.de/impressum/" target="_blank" rel="noopener noreferrer">
                {t('open_privacy_imprint') || 'Impressum und Datenschutz öffnen'}
              </a>
            </div>
          </div>
        </>
      )}

      {activeSection === 'danger' && (
        <>
          <h2>{t('delete_account_title') || 'Account löschen'}</h2>
          <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
            <div className="profile-section-card danger-zone-card">
              <div className="profile-section-title">{t('delete_account_title') || 'Account löschen'}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                {t('delete_account_desc') || 'Dieser Modus vernichtet dein Konto, Identitäten, Gerätesitzungen, GaiaDrop-Daten, Upload-Metadaten und serverseitig zuordenbare Nachrichten unwiderruflich.'}
              </p>
              <form onSubmit={submitDeleteAccount}>
                <div className="form-group">
                  <label>{t('current_password') || 'Aktuelles Passwort'}</label>
                  <input
                    type="password"
                    className="input-field"
                    value={deletePassword}
                    onChange={event => setDeletePassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('delete_account_confirm_label') || 'Zur Bestätigung DELETE eingeben'}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={deleteConfirmation}
                    onChange={event => setDeleteConfirmation(event.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
                {deleteError && <p className="form-error">{deleteError}</p>}
                <button type="submit" className="btn-primary danger-action-btn" disabled={deleteBusy}>
                  {deleteBusy ? (t('loading') || 'Laden...') : (t('delete_account_button') || 'Account unwiderruflich löschen')}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {activeSection === 'keys' && (
        <>
          <h2>{t('kryptographische_schluessel') || 'Kryptographische Schlüssel'}</h2>
          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div className="profile-section-card">
              <div className="profile-section-title">
                {t('kryptographische_schluessel') || 'Kryptographische Schlüssel'}
              </div>
              
              {!areKeysUnlocked ? (
                <div className="crypto-unlock-prompt" style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {t('profile_unlock_desc') || 'Aus Sicherheitsgründen müssen Sie Ihr Passwort erneut eingeben, um Ihre privaten kryptographischen Schlüssel anzuzeigen.'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="password"
                      className="input-field"
                      placeholder={t('vault_pwd_placeholder') || 'Passwort eingeben...'}
                      value={profilePasswordInput}
                      onChange={e => setProfilePasswordInput(e.target.value)}
                      style={{ maxWidth: '280px' }}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: 'auto', padding: '0 20px' }}
                      onClick={handleUnlockProfileKeys}
                    >
                      🔑 {t('unlock_btn') || 'Freischalten'}
                    </button>
                  </div>
                  {profileUnlockError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '8px' }}>{profileUnlockError}</p>}
                </div>
              ) : (
                <>
                  <div className="crypto-grid">
                    <div className="crypto-card">
                      <div className="crypto-title">Ed25519 Identität (Sign Public)</div>
                      <div className="crypto-value">{derivedKeys?.sign.public}</div>
                    </div>
                    <div className="crypto-card">
                      <div className="crypto-title">Ed25519 Identität (Sign Private)</div>
                      <div className="crypto-value">{derivedKeys?.sign.private}</div>
                    </div>
                    <div className="crypto-card">
                      <div className="crypto-title">X25519 Box (Public)</div>
                      <div className="crypto-value">{derivedKeys?.box.public}</div>
                    </div>
                    <div className="crypto-card">
                      <div className="crypto-title">X25519 Box (Private)</div>
                      <div className="crypto-value">{derivedKeys?.box.private}</div>
                    </div>
                    <div className="crypto-card" style={{ gridColumn: 'span 2' }}>
                      <div className="crypto-title">ML-KEM-1024 Post-Quantum PKE (Public)</div>
                      <div className="crypto-value">{derivedKeys?.pke.public}</div>
                    </div>
                    <div className="crypto-card" style={{ gridColumn: 'span 2' }}>
                      <div className="crypto-title">ML-KEM-1024 Post-Quantum PKE (Private/Secret)</div>
                      <div className="crypto-value" style={{ maxHeight: '100px', overflowY: 'auto' }}>{derivedKeys?.pke.private}</div>
                    </div>
                    <div className="crypto-card" style={{ gridColumn: 'span 2' }}>
                      <div className="crypto-title">Mnemonic Recovery Seed Phrase (12 Wörter)</div>
                      <div className="crypto-value" style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{mnemonic}</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ width: '100%', marginTop: '15px' }}
                    onClick={() => setAreKeysUnlocked(false)}
                  >
                    🔑 {t('schluessel_entsperrt') || 'Schlüssel wieder sperren'}
                  </button>

                  <div className="profile-section-card recovery-export-card">
                    <div className="profile-section-title">Account Recovery Datei</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                      Exportiert deine GaiaCom Identitaet, Mnemonic, Profil und lokale Metadaten in eine
                      passwortgeschuetzte Datei. Das Recovery-Passwort wird nicht gespeichert.
                    </p>
                    <div className="recovery-export-grid">
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Recovery-Passwort min. 12 Zeichen"
                        value={recoveryPassword}
                        onChange={event => setRecoveryPassword(event.target.value)}
                        autoComplete="new-password"
                      />
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Recovery-Passwort wiederholen"
                        value={recoveryConfirmPassword}
                        onChange={event => setRecoveryConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    {recoveryError && <p className="form-error">{recoveryError}</p>}
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '12px' }}
                      onClick={handleRecoveryExport}
                      disabled={recoveryBusy}
                    >
                      {recoveryBusy ? 'Recovery wird erstellt...' : 'Recovery-Datei herunterladen'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfilePane;
