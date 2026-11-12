import React from 'react';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';

export default function ProfileSecuritySection({
  cryptoSessionMinutes,
  setCryptoSessionMinutes,
  inactivityLockMinutes,
  setInactivityLockMinutes,
  pinUnlockEnabled,
  handleRemoveUnlockPin,
  webAuthnUnlockEnabled,
  handleRemoveWebAuthnUnlock,
  unlockPin,
  setUnlockPin,
  unlockPinConfirm,
  setUnlockPinConfirm,
  unlockPinBusy,
  unlockPinError,
  submitUnlockPin,
  webAuthnBusy,
  webAuthnError,
  submitWebAuthnUnlock,
  areKeysUnlocked,
  t
}) {
  return (
    <ProfileSection
      eyebrow="Sicherheit"
      title={t('crypto_lock_title') || 'Kryptografische Sperre'}
      description={
        t('crypto_lock_desc') ||
        'Steuert, wann GaiaCom die lokalen Kryptoschlüssel wieder aus dem Arbeitsspeicher entfernt.'
      }
    >
      <div className="vgt-profile-stack">
        <div className="vgt-profile-form__row">
          <ProfileField
            id="vgt-crypto-session-minutes"
            label={t('crypto_session_duration') || 'Entsperrt nach Reload'}
            hint={
              t('crypto_session_duration_desc') ||
              'Hält die Kryptositzung nur für die gewählte Dauer in diesem Browser-Tab offen.'
            }
          >
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
          </ProfileField>
          {Number(cryptoSessionMinutes) > 0 ? (
            <p className="field-hint" role="note">
              {t('crypto_session_storage_warning') ||
                'Für „Entsperrt nach Reload“ hält GaiaCom den Seed für diese Dauer im sessionStorage dieses Browser-Tabs. Bei gemeinsam genutzten Geräten oder Browser-Extensions ist das ein Risiko — der sicherste Modus ist „Immer nach Reload sperren“.'}
            </p>
          ) : null}

          <ProfileField
            id="vgt-inactivity-lock-minutes"
            label={t('inactivity_lock_duration') || 'Sperren bei Inaktivität'}
            hint={
              t('inactivity_lock_duration_desc') ||
              'Nach dieser Zeit ohne Eingabe wird GaiaCom automatisch kryptografisch gesperrt.'
            }
          >
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
          </ProfileField>
        </div>

        <hr className="vgt-divider" />

        <form className="vgt-profile-form" onSubmit={submitUnlockPin}>
          <div className="vgt-profile-record">
            <div className="vgt-profile-record__head">
              <h3 className="vgt-h4">Geräte-Code-Entsperrung</h3>
              <span className={`vgt-status ${pinUnlockEnabled ? 'vgt-status--ok' : 'vgt-status--idle'}`.trim()}>
                {pinUnlockEnabled ? 'Aktiv' : 'Nicht eingerichtet'}
              </span>
            </div>
            <p className="vgt-caption">
              Der Geräte-Code gilt nur auf diesem Gerät und speichert eine zweite lokal verschlüsselte
              Kopie deiner Schlüssel. Neue Codes brauchen 12 bis 32 Zeichen; reine Zahlen mindestens
              14 Stellen.
            </p>
          </div>

          <div className="vgt-profile-form__row">
            <ProfileField id="vgt-unlock-pin" label="Geräte-Code" required>
              <input
                type="password"
                inputMode="text"
                className="input-field"
                placeholder="16–64 Zeichen"
                value={unlockPin}
                onChange={event => setUnlockPin(event.target.value.slice(0, 32))}
                autoComplete="new-password"
              />
            </ProfileField>
            <ProfileField id="vgt-unlock-pin-confirm" label="Geräte-Code wiederholen" required>
              <input
                type="password"
                inputMode="text"
                className="input-field"
                placeholder="Wiederholung"
                value={unlockPinConfirm}
                onChange={event => setUnlockPinConfirm(event.target.value.slice(0, 32))}
                autoComplete="new-password"
              />
            </ProfileField>
          </div>

          {unlockPinError ? <p className="field-error" role="alert">{unlockPinError}</p> : null}

          <div className="vgt-profile-form__actions">
            <button type="submit" className="btn-primary" disabled={unlockPinBusy}>
              {unlockPinBusy ? 'Speichere …' : (pinUnlockEnabled ? 'Geräte-Code aktualisieren' : 'Geräte-Code aktivieren')}
            </button>
            {pinUnlockEnabled ? (
              <button type="button" className="btn-secondary" onClick={handleRemoveUnlockPin}>
                Geräte-Code entfernen
              </button>
            ) : null}
          </div>
        </form>

        <hr className="vgt-divider" />

        <div className="vgt-profile-form">
          <div className="vgt-profile-record">
            <div className="vgt-profile-record__head">
              <h3 className="vgt-h4">Geräte-Schlüssel</h3>
              <span className={`vgt-status ${webAuthnUnlockEnabled ? 'vgt-status--ok' : 'vgt-status--idle'}`.trim()}>
                {webAuthnUnlockEnabled ? 'Aktiv' : 'Nicht eingerichtet'}
              </span>
            </div>
            <p className="vgt-caption">
              Nutzt WebAuthn PRF, wenn dein Browser und Authenticator es unterstützen. Die lokale
              Schlüsselkopie ist dann ohne dieses Gerät nicht offline entschlüsselbar.
            </p>
          </div>

          {webAuthnError ? <p className="field-error" role="alert">{webAuthnError}</p> : null}

          <div className="vgt-profile-form__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={submitWebAuthnUnlock}
              disabled={webAuthnBusy || !areKeysUnlocked}
            >
              {webAuthnBusy ? 'Warte auf Authenticator …' : (webAuthnUnlockEnabled ? 'Neu koppeln' : 'Aktivieren')}
            </button>
            {webAuthnUnlockEnabled ? (
              <button type="button" className="btn-secondary" onClick={handleRemoveWebAuthnUnlock}>
                Entfernen
              </button>
            ) : null}
          </div>
          {!areKeysUnlocked ? (
            <p className="vgt-caption">Zum Aktivieren müssen die lokalen Schlüssel in diesem Tab entsperrt sein.</p>
          ) : null}
        </div>
      </div>
    </ProfileSection>
  );
}
