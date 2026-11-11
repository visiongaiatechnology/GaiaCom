import React from 'react';
import QRCode from 'qrcode';
import Icon from '../../ui/Icon';
import {
  SECRET_CLIPBOARD_WARNING,
  copySecretToClipboard
} from '../../../utils/secureClipboard';

export default function AuthPairPanel({
  t,
  devicePairing,
  devicePairingError,
  onStartDevicePairing,
  onCompleteDevicePairing,
  onCancelDevicePairing,
  usernameInput,
  passwordInput,
  onUsernameChange,
  onPasswordChange
}) {
  const [pairingLabel, setPairingLabel] = React.useState('');
  const [pairingQr, setPairingQr] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    if (!devicePairing?.pairing?.id || !devicePairing?.secret) {
      setPairingQr('');
      return undefined;
    }
    const payload = `gaiacom://pairing/${devicePairing.pairing.id}/${devicePairing.secret}`;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 260,
      color: { dark: '#0a0e13', light: '#f2f5f4' }
    })
      .then((url) => { if (active) setPairingQr(url); })
      .catch(() => { if (active) setPairingQr(''); });
    return () => { active = false; };
  }, [devicePairing]);

  const pairingCode = devicePairing?.pairing?.id
    ? `gaiacom://pairing/${devicePairing.pairing.id}/${devicePairing.secret}`
    : '';

  const copyCode = React.useCallback(() => {
    if (!pairingCode) return;
    // SEC-FE FE-05: pairing codes are secrets; the helper schedules the
    // clipboard auto-clear and the visible warning below explains it.
    copySecretToClipboard(pairingCode).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false)
    );
  }, [pairingCode]);

  if (!devicePairing) {
    return (
      <div className="vgt-auth-form">
        <p className="vgt-body vgt-body--sm">
          Dieses neue Gerät erzeugt eigene X25519- und ML-KEM-Schlüssel. Die Freigabe erfolgt
          ausschließlich durch ein bereits entsperrtes GaiaCom-Gerät.
        </p>
        <div className="vgt-field">
          <label className="input-label" htmlFor="vgt-pair-user">{t('auth_username') || 'Benutzername'}</label>
          <input
            id="vgt-pair-user"
            className="input-field"
            placeholder={t('auth_username_placeholder') || 'Benutzername'}
            value={usernameInput}
            onChange={(event) => onUsernameChange(event.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="vgt-field">
          <label className="input-label" htmlFor="vgt-pair-pass">{t('auth_password') || 'Passwort'}</label>
          <input
            id="vgt-pair-pass"
            className="input-field"
            type="password"
            placeholder={t('auth_password_placeholder') || 'Passwort'}
            value={passwordInput}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="vgt-field">
          <label className="input-label" htmlFor="vgt-pair-label">Gerätename</label>
          <input
            id="vgt-pair-label"
            className="input-field"
            placeholder="Name dieses Geräts, z. B. Mein Laptop"
            value={pairingLabel}
            onChange={(event) => setPairingLabel(event.target.value)}
            maxLength={80}
          />
        </div>
        {devicePairingError && <p className="field-error" role="alert">{devicePairingError}</p>}
        <button
          type="button"
          className="btn-primary vgt-auth-form__submit"
          onClick={() => onStartDevicePairing(pairingLabel)}
          disabled={!pairingLabel.trim()}
        >
          Pairing-Code erzeugen
        </button>
      </div>
    );
  }

  return (
    <div className="vgt-auth-form">
      <p className="vgt-body vgt-body--sm">
        Öffne auf dem bereits entsperrten Gerät <strong>Profil → Angemeldete Geräte</strong> und
        bestätige diesen Code. Er läuft automatisch ab.
      </p>

      {pairingQr ? (
        <img className="vgt-pair-qr" src={pairingQr} alt="QR-Code zur sicheren Gerätekopplung" width="260" height="260" />
      ) : (
        <div className="vgt-pair-qr vgt-pair-qr--pending" role="img" aria-label="QR-Code wird erzeugt">
          <Icon name="qr" size={36} />
          <span className="vgt-caption">QR-Code wird erzeugt…</span>
        </div>
      )}

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-pair-code">Pairing-Code</label>
        <textarea id="vgt-pair-code" className="input-field" readOnly value={pairingCode} rows={2} />
      </div>

      {devicePairingError && <p className="field-error" role="alert">{devicePairingError}</p>}

      <p className="field-hint" role={copied ? 'status' : undefined}>
        {copied
          ? SECRET_CLIPBOARD_WARNING
          : 'Der Code enthält ein Kopplungsgeheimnis. Nach dem Einfügen aus der Zwischenablage leeren.'}
      </p>

      <div className="vgt-auth-form__actions">
        <button type="button" className="btn-secondary" onClick={copyCode}>
          <Icon name="copy" size={15} />
          {copied ? 'Kopiert' : 'Code kopieren'}
        </button>
        <button type="button" className="btn-primary" onClick={onCompleteDevicePairing}>
          Freigabe prüfen
        </button>
      </div>
      <button type="button" className="vgt-link" onClick={onCancelDevicePairing}>
        Abbrechen
      </button>
    </div>
  );
}
