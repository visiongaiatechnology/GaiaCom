import { useState } from 'react';

/**
 * Account-security actions for the identity pane: account deletion ceremony,
 * recovery-file export, device PIN, WebAuthn device key and the anonymous
 * network-statistics preference.
 *
 * Extracted without behaviour change: the same guards, the same minimum
 * password length, the same confirmation contract, the same API callbacks
 * that the parent passes in.
 */
export default function useProfileSecurity({
  handleDeleteAccount,
  handleExportRecoveryBackup,
  handleSetUnlockPin,
  handleRemoveUnlockPin,
  handleSetWebAuthnUnlock,
  handleRemoveWebAuthnUnlock,
  handleUpdatePrivacySettings,
  areKeysUnlocked,
  mnemonic
}) {
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

  return {
    deletePassword,
    setDeletePassword,
    deleteConfirmation,
    setDeleteConfirmation,
    deleteError,
    deleteBusy,
    submitDeleteAccount,
    privacyBusy,
    privacyError,
    submitAnonymousStatsPreference,
    recoveryPassword,
    setRecoveryPassword,
    recoveryConfirmPassword,
    setRecoveryConfirmPassword,
    recoveryBusy,
    recoveryError,
    handleRecoveryExport,
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
    handleRemoveUnlockPin,
    handleRemoveWebAuthnUnlock
  };
}
