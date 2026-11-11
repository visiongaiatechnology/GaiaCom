import React from 'react';
import Icon from '../../ui/Icon';

export default function AuthRecoveryPanel({ t, onImportRecovery, onBack }) {
  const [recoveryFile, setRecoveryFile] = React.useState(null);
  const [recoveryPassword, setRecoveryPassword] = React.useState('');
  const [recoveryLocalPassword, setRecoveryLocalPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const runImport = React.useCallback(async () => {
    if (!onImportRecovery) return;
    setBusy(true);
    setError('');
    try {
      await onImportRecovery(recoveryFile, recoveryPassword, recoveryLocalPassword);
      setRecoveryFile(null);
      setRecoveryPassword('');
      setRecoveryLocalPassword('');
    } catch (err) {
      setError(err?.message || 'Recovery konnte nicht importiert werden.');
    } finally {
      setBusy(false);
    }
  }, [onImportRecovery, recoveryFile, recoveryPassword, recoveryLocalPassword]);

  return (
    <div className="vgt-auth-form">
      <p className="vgt-body vgt-body--sm">
        {t('auth_recovery_import_desc') || 'Stelle deine GaiaCom-Schlüssel aus einer passwortgeschützten Backup-Datei wieder her. Danach sind Mnemonic und Nutzername vorausgefüllt.'}
      </p>

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-recovery-file">
          {t('auth_recovery_import_file') || 'Recovery-Datei'}
        </label>
        <input
          id="vgt-recovery-file"
          type="file"
          className="input-field"
          accept=".json,.gaiacom-recovery.json,application/json"
          onChange={(event) => setRecoveryFile(event.target.files?.[0] || null)}
        />
        {recoveryFile && <span className="field-hint">{recoveryFile.name}</span>}
      </div>

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-recovery-pass">
          {t('auth_recovery_file_pwd_placeholder') || 'Passwort der Recovery-Datei'}
        </label>
        <input
          id="vgt-recovery-pass"
          type="password"
          className="input-field"
          value={recoveryPassword}
          onChange={(event) => setRecoveryPassword(event.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-recovery-local">
          {t('auth_recovery_local_pwd_placeholder') || 'Neues lokales Entsperrpasswort (min. 12 Zeichen)'}
        </label>
        <input
          id="vgt-recovery-local"
          type="password"
          className="input-field"
          value={recoveryLocalPassword}
          onChange={(event) => setRecoveryLocalPassword(event.target.value)}
          autoComplete="new-password"
          minLength={12}
        />
      </div>

      {error && <p className="field-error" role="alert">{error}</p>}

      <button
        type="button"
        className="btn-primary vgt-auth-form__submit"
        onClick={runImport}
        disabled={busy || !recoveryFile || !recoveryPassword || recoveryLocalPassword.length < 12}
      >
        <Icon name="import" size={16} />
        {busy
          ? (t('auth_recovery_importing') || 'Importiere…')
          : (t('auth_recovery_decrypt') || 'Recovery entschlüsseln')}
      </button>

      <button type="button" className="vgt-link" onClick={onBack}>
        {t('auth_back_to_login') || 'Zurück zur Anmeldung'}
      </button>
    </div>
  );
}
