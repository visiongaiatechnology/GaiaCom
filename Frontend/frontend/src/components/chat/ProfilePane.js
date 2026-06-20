import React from 'react';
import * as api from '../../api';

export const ProfilePane = ({
  activeIdentity,
  displayGaiaID,
  profileAvatar,
  setProfileAvatar,
  profileDisplayName,
  setProfileDisplayName,
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
  setActiveProfileSection
}) => {
  const [deviceSessions, setDeviceSessions] = React.useState([]);
  const [devicesLoading, setDevicesLoading] = React.useState(false);
  const [devicesError, setDevicesError] = React.useState('');

  const loadDeviceSessions = React.useCallback(async () => {
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

  React.useEffect(() => {
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
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
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
    <div className="profile-container">
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
                {profileAvatar.startsWith('data:image/') ? (
                  <img src={profileAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profileAvatar
                )}
              </div>
              <div>
                <h3>{profileDisplayName || (t('no_specification') || 'Kein Anzeigename')}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : ''}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>{t('biography') || 'Biografie'}: {profileBio || (t('no_specification') || 'Keine Angabe')}</p>
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
