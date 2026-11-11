import React from 'react';
import Icon from '../../../ui/Icon';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';

function statusClass(message, successWhen) {
  if (!message) return '';
  return successWhen(message) ? 'is-success' : 'is-error';
}

export default function ProfileDevicesSection({
  deviceSessions,
  deviceKeys,
  devicesLoading,
  devicesError,
  loadDeviceSessions,
  loadDeviceKeys,
  revokeDevice,
  revokeDeviceKey,
  formatDeviceTime,
  pairingCode,
  setPairingCode,
  pairingBusy,
  pairingStatus,
  approveNewDevice,
  rotationPassword,
  setRotationPassword,
  rotationBusy,
  rotationStatus,
  rotateCurrentDeviceKey,
  deviceKeyVault,
  t
}) {
  const sessions = Array.isArray(deviceSessions) ? deviceSessions : [];
  const keys = Array.isArray(deviceKeys) ? deviceKeys : [];

  return (
    <ProfileSection
      eyebrow="Geräte"
      title={t('device_sessions_title') || 'Geräte & Sitzungen'}
      description={
        t('device_sessions_desc') ||
        'Prüfe aktive Browser-Sitzungen und kryptografisch gekoppelte Geräteidentitäten.'
      }
    >
      <div className="vgt-profile-stack">
        <div className="vgt-device-block">
          <div className="vgt-device-block__head">
            <div>
              <h3 className="vgt-h4">Browser-Sitzungen</h3>
              <p className="vgt-caption">Von diesem Konto angemeldete Clients.</p>
            </div>
            <button type="button" className="btn-action" onClick={loadDeviceSessions}>
              <Icon name="refresh" size={14} />
              {t('refresh') || 'Aktualisieren'}
            </button>
          </div>

          {devicesError ? (
            <p className="vgt-inline-status is-error" role="alert">{devicesError}</p>
          ) : null}

          {devicesLoading ? (
            <p className="vgt-empty-note" role="status">Geräte werden geladen …</p>
          ) : sessions.length === 0 ? (
            <p className="vgt-empty-note">
              {t('device_sessions_empty') ||
                'Keine aktiven Sitzungen gemeldet. Lade neu, sobald du dich auf einem weiteren Gerät angemeldet hast.'}
            </p>
          ) : (
            <ul className="vgt-row-list">
              {sessions.map(session => (
                <li className="vgt-row" key={session.id}>
                  <div className="vgt-row__main">
                    <strong>{session.deviceLabel || session.deviceType || (t('unbenannt') || 'Unbenanntes Gerät')}</strong>
                    <span className="vgt-row__meta">
                      {[session.os, session.browser, session.deviceType].filter(Boolean).join(' · ') || 'Keine Client-Angaben'}
                    </span>
                    <span className="vgt-row__meta vgt-mono">IP: {session.ipAddress || 'nicht angegeben'}</span>
                    <span className="vgt-row__meta">
                      {t('device_since') || 'Seit'}: {formatDeviceTime(session.createdAt)} · {t('device_last_seen') || 'Zuletzt'}: {formatDeviceTime(session.lastSeenAt)}
                    </span>
                  </div>
                  {session.isCurrent ? (
                    <span className="vgt-status vgt-status--ok">{t('device_current') || 'Dieses Gerät'}</span>
                  ) : (
                    <button type="button" className="btn-secondary" onClick={() => revokeDevice(session)}>
                      {t('device_logout') || 'Abmelden'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <hr className="vgt-divider" />

        <div className="vgt-device-block">
          <div className="vgt-device-block__head">
            <div>
              <h3 className="vgt-h4">Kryptografische Geräteidentitäten</h3>
              <p className="vgt-caption">
                Getrennt von Browser-Sitzungen. Ein Widerruf sperrt die registrierte Geräteidentität
                dauerhaft für weitere Kopplungszyklen.
              </p>
            </div>
            <button type="button" className="btn-action" onClick={loadDeviceKeys}>
              <Icon name="refresh" size={14} />
              Schlüssel aktualisieren
            </button>
          </div>

          {keys.length === 0 ? (
            <p className="vgt-empty-note">
              Noch keine kryptografisch gekoppelten Geräte. Nutze unten „Neues Gerät freigeben“, um
              ein weiteres Gerät zu koppeln.
            </p>
          ) : (
            <ul className="vgt-row-list">
              {keys.map(key => {
                const active = key.status === 'active';
                return (
                  <li className="vgt-row" key={key.id}>
                    <div className="vgt-row__main">
                      <strong>{key.deviceLabel || 'Gekoppeltes Gerät'}</strong>
                      <span className="vgt-row__meta">Registriert: {formatDeviceTime(key.createdAt)}</span>
                    </div>
                    <span className={`vgt-status ${active ? 'vgt-status--ok' : 'vgt-status--idle'}`.trim()}>
                      {active ? 'Aktiv' : 'Widerrufen'}
                    </span>
                    {active ? (
                      <button type="button" className="btn-danger-outline" onClick={() => revokeDeviceKey(key)}>
                        Schlüssel widerrufen
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <hr className="vgt-divider" />

        <form className="vgt-profile-form" onSubmit={rotateCurrentDeviceKey}>
          <h3 className="vgt-h4">
            {deviceKeyVault?.deviceKeyId ? 'Schlüssel dieses Geräts rotieren' : 'Dieses Gerät kryptografisch registrieren'}
          </h3>
          <p className="vgt-caption">
            Erzeugt ein neues lokales X25519-, ML-KEM- und Ed25519-Keyset, registriert es atomar und
            widerruft erst danach die bisherige Geräteidentität.
          </p>
          <ProfileField
            id="vgt-rotation-password"
            label="Lokales Tresorpasswort"
            hint="Wird nur lokal geprüft und nicht übertragen."
            required
          >
            <input
              className="input-field"
              type="password"
              value={rotationPassword}
              onChange={event => setRotationPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </ProfileField>
          {rotationStatus ? (
            <p className={`vgt-inline-status ${statusClass(rotationStatus, message => message.startsWith('Rotation erfolgreich:'))}`.trim()} role="status">
              {rotationStatus}
            </p>
          ) : null}
          <div className="vgt-profile-form__actions">
            <button type="submit" className="btn-primary" disabled={rotationBusy || !rotationPassword}>
              {rotationBusy ? 'Schlüsselvorgang läuft …' : (deviceKeyVault?.deviceKeyId ? 'Geräteschlüssel rotieren' : 'Dieses Gerät registrieren')}
            </button>
          </div>
        </form>

        <hr className="vgt-divider" />

        <form className="vgt-profile-form" onSubmit={approveNewDevice}>
          <h3 className="vgt-h4">Neues Gerät freigeben</h3>
          <p className="vgt-caption">
            Prüfe den Code direkt auf dem neuen Gerät. Die Freigabe verschlüsselt deine lokale
            Recovery-Identität ausschließlich für dessen frische Geräteschlüssel.
          </p>
          <ProfileField
            id="vgt-pairing-code"
            label="Pairing-Code des neuen Geräts"
            hint="Format: gaiacom://pairing/…"
            required
          >
            <textarea
              className="input-field"
              value={pairingCode}
              onChange={event => setPairingCode(event.target.value)}
              autoComplete="off"
              required
            />
          </ProfileField>
          {pairingStatus ? (
            <p className={`vgt-inline-status ${statusClass(pairingStatus, message => message.includes('freigegeben'))}`.trim()} role="status">
              {pairingStatus}
            </p>
          ) : null}
          <div className="vgt-profile-form__actions">
            <button type="submit" className="btn-primary" disabled={pairingBusy || !pairingCode.trim()}>
              {pairingBusy ? 'Freigabe wird signiert …' : 'Gerät kryptografisch freigeben'}
            </button>
          </div>
        </form>
      </div>
    </ProfileSection>
  );
}
