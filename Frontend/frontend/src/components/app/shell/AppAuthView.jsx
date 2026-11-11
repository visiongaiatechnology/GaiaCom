import AuthScreen from '../../auth/AuthScreen';
import React from 'react';
import { copySecretToClipboard } from '../../../utils/secureClipboard';

/*
 * Public authentication screen (VGT GLASS 2100): exact AuthScreen prop set, moved verbatim.
 */
export default function AppAuthView({auth, account, data, t}) {
  const {
    authError, cancelDevicePairing, completeDevicePairing, copiedMnemonic, derivedKeys, devicePairing,
    devicePairingError, handleAuthSubmit, handleGenerateMnemonic, isRegister, mnemonic, passwordInput,
    serverConsensus, serverVersion, setAuthError, setCopiedMnemonic, setIsRegister, setMnemonic,
    setPasswordInput, setShowRegSuccessPopup, setUser, setUsernameInput, showRegSuccessPopup,
    startDevicePairing, tempUserId, usernameInput,
  } = auth;
  const { handleImportRecoveryBackup } = account.profile;
  const {
    dropError, dropMessageInput, dropSenderInput, dropStatus, dropTargetInput,
    handleSubmitPublicGaiaDrop, setDropMessageInput, setDropSenderInput, setDropTargetInput,
  } = data.drop;

  return (
    <AuthScreen
        isRegister={isRegister}
        usernameInput={usernameInput}
        passwordInput={passwordInput}
        mnemonic={mnemonic}
        copiedMnemonic={copiedMnemonic}
        authError={authError}
        showRegSuccessPopup={showRegSuccessPopup}
        derivedKeys={derivedKeys}
        serverVersion={serverVersion}
        serverConsensus={serverConsensus}
        dropTargetInput={dropTargetInput}
        dropSenderInput={dropSenderInput}
        dropMessageInput={dropMessageInput}
        dropStatus={dropStatus}
        dropError={dropError}
        onSubmit={handleAuthSubmit}
        devicePairing={devicePairing}
        devicePairingError={devicePairingError}
        onStartDevicePairing={startDevicePairing}
        onCompleteDevicePairing={completeDevicePairing}
        onCancelDevicePairing={cancelDevicePairing}
        onImportRecovery={handleImportRecoveryBackup}
        onUsernameChange={setUsernameInput}
        onPasswordChange={setPasswordInput}
        onMnemonicChange={setMnemonic}
        onToggleMode={() => {
          setIsRegister(!isRegister);
          setAuthError('');
        }}
        onGenerateMnemonic={handleGenerateMnemonic}
        onCopyMnemonic={() => {
          // SEC-FE FE-05: secret clipboard write with visible warning + the
          // shared auto-clear timer (see utils/secureClipboard.js).
          copySecretToClipboard(mnemonic)
            .then(() => setCopiedMnemonic(true))
            .catch(() => setCopiedMnemonic(false));
        }}
        onCloseSuccess={() => {
          setShowRegSuccessPopup(false);
          setUser({ id: tempUserId, username: usernameInput, allowAnonymousStats: true });
        }}
        onSubmitGaiaDrop={handleSubmitPublicGaiaDrop}
        onDropTargetChange={setDropTargetInput}
        onDropSenderChange={setDropSenderInput}
        onDropMessageChange={setDropMessageInput}
        t={t}
      />
  );
}
