import React from 'react';
import Icon from '../../ui/Icon';
import { validateMnemonic } from '../../../crypto';
import { SECRET_CLIPBOARD_WARNING } from '../../../utils/secureClipboard';

export default function AuthAccessPanel({
  t,
  isRegister,
  usernameInput,
  passwordInput,
  mnemonic,
  copiedMnemonic,
  authError,
  legalAccepted,
  setLegalAccepted,
  onUsernameChange,
  onPasswordChange,
  onMnemonicChange,
  onGenerateMnemonic,
  onCopyMnemonic,
  onSubmit,
  onToggleMode,
  onOpenTerms,
  onSwitchRecovery
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const trimmedMnemonic = String(mnemonic || '').trim();
  const mnemonicValid = trimmedMnemonic
    ? validateMnemonic(trimmedMnemonic.toLowerCase().replace(/\s+/g, ' '))
    : false;
  const mnemonicInvalid = Boolean(trimmedMnemonic) && !mnemonicValid;
  const submitDisabled =
    (isRegister && (!legalAccepted || !mnemonicValid)) ||
    (!isRegister && Boolean(trimmedMnemonic) && !mnemonicValid);
  const generateTitle = trimmedMnemonic
    ? 'Ersetzt die aktuelle Phrase durch einen neuen Zufalls-Seed'
    : 'Erzeugt einen neuen 12-Wörter-BIP39-Seed';
  const generateLabel = trimmedMnemonic
    ? (t('auth_generate_new_seed') || 'Neuen Seed generieren')
    : (t('auth_generate_seed') || 'Seed generieren');
  const copyLabel = copiedMnemonic
    ? (t('auth_copied') || 'Kopiert')
    : (t('auth_copy_seed') || 'Seed kopieren');
  const submitLabel = isRegister
    ? (t('auth_btn_register') || 'Konto erstellen')
    : (t('auth_btn_login') || 'Anmelden');
  const toggleLabel = isRegister
    ? (t('auth_toggle_login') || 'Ich habe bereits ein Konto')
    : (t('auth_toggle_register') || 'Neues Konto erstellen');

  let seedHint = null;
  if (mnemonicInvalid) {
    seedHint = (
      <p className="field-error" id="vgt-auth-mnemonic-error" role="alert">
        {t('auth_seed_invalid') ||
          'Ungültige Mnemonic-Phrase: benötigt werden 12 Wörter aus der BIP39-Wortliste mit gültiger Prüfsumme.'}
        {isRegister ? ' Nutze „Seed generieren“ für einen gültigen Seed.' : ''}
      </p>
    );
  } else if (isRegister && !trimmedMnemonic) {
    seedHint = (
      <p className="field-hint">
        {t('auth_seed_autogenerate_hint') ||
          'Der Seed wird beim Wechsel in den Registrierungsmodus automatisch erzeugt — oder hier über „Seed generieren“.'}
      </p>
    );
  } else if (isRegister && mnemonicValid) {
    seedHint = (
      <p className="field-hint">
        {t('auth_seed_backup_hint') ||
          'Dieser Seed wurde für deine Registrierung erzeugt. Kopiere ihn jetzt — ohne ihn lässt sich das Konto auf einem anderen Gerät nicht wiederherstellen.'}
      </p>
    );
  }

  return (
    <form className="vgt-auth-form" onSubmit={onSubmit} noValidate={false}>
      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-auth-username">{t('auth_username') || 'Benutzername'}</label>
        <input
          id="vgt-auth-username"
          type="text"
          className="input-field"
          placeholder={t('auth_username_placeholder') || 'benutzername'}
          value={usernameInput}
          onChange={(event) => onUsernameChange(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-auth-password">{t('auth_password') || 'Passwort'}</label>
        <div className="vgt-field__row">
          <input
            id="vgt-auth-password"
            type={showPassword ? 'text' : 'password'}
            className="input-field"
            placeholder={t('auth_password_placeholder') || 'Passwort'}
            value={passwordInput}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
          />
          <button
            type="button"
            className="btn-icon vgt-field__reveal"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? (t('ui_auth_hide_password') || 'Passwort verbergen') : (t('ui_auth_show_password') || 'Passwort anzeigen')}
            aria-pressed={showPassword}
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
          </button>
        </div>
      </div>

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-auth-mnemonic">{t('auth_mnemonic') || 'Mnemonic Seed'}</label>
        <textarea
          id="vgt-auth-mnemonic"
          className="input-field"
          placeholder={t('auth_mnemonic_placeholder') || '12 Wörter, getrennt durch Leerzeichen'}
          value={mnemonic}
          onChange={(event) => onMnemonicChange(event.target.value)}
          autoComplete="off"
          rows={2}
          spellCheck={false}
          required
          aria-invalid={mnemonicInvalid || undefined}
          aria-describedby={mnemonicInvalid ? 'vgt-auth-mnemonic-error' : undefined}
        />
        <div className="vgt-field__hint-row">
          <span className="field-hint">{t('ui_auth_seed_hint') || 'Der Seed wird ausschließlich lokal zur Schlüsselableitung verwendet.'}</span>
          {isRegister && (
            <button
              type="button"
              className="btn-action"
              onClick={onGenerateMnemonic}
              title={generateTitle}
            >
              {generateLabel}
            </button>
          )}
          {mnemonic && (
            <button type="button" className="btn-action" onClick={onCopyMnemonic}>
              <Icon name="copy" size={14} />
              {copyLabel}
            </button>
          )}
        </div>
        {seedHint}
        <p className="field-hint" role={copiedMnemonic ? 'status' : undefined}>
          {copiedMnemonic
            ? SECRET_CLIPBOARD_WARNING
            : (t('ui_auth_seed_secret') || 'Der Seed ist ein Geheimnis. Nach dem Einfügen aus der Zwischenablage leeren.')}
        </p>
      </div>

      {authError && <p className="field-error" role="alert">{authError}</p>}

      {isRegister && (
        <label className="vgt-consent">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(event) => setLegalAccepted(event.target.checked)}
            required
          />
          <span>
            {t('auth_consent_privacy_terms') || 'Ich habe die Datenschutzbestimmungen und Nutzungsbedingungen gelesen und stimme ihnen zu.'}{' '}
            <button type="button" className="vgt-link" onClick={onOpenTerms}>
              {t('auth_terms_of_use_show') || 'Nutzungsbedingungen anzeigen'}
            </button>
          </span>
        </label>
      )}

      <button type="submit" className="btn-primary vgt-auth-form__submit" disabled={submitDisabled}>
        {submitLabel}
        <Icon name="arrowRight" size={16} />
      </button>

      <div className="vgt-auth-form__alt">
        <button type="button" className="vgt-link" onClick={onToggleMode}>
          {toggleLabel}
        </button>
        <button type="button" className="vgt-link" onClick={onSwitchRecovery}>
          {t('auth_recovery_mode') || 'Recovery-Modus'}
        </button>
      </div>
    </form>
  );
}
