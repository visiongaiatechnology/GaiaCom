import React from 'react';
import UnlockScreen from '../../auth/UnlockScreen';

/*
 * Locked session screen (VGT GLASS 2100): exact UnlockScreen prop set, moved verbatim.
 */
export default function AppLockedScreen({auth, account}) {
  const { handleLogout, handleUnlock, setUnlockPassword, unlockError, unlockPassword } = auth;
  const { pinUnlockEnabled, webAuthnUnlockEnabled } = account.profile;

  return (
    <UnlockScreen
        unlockPassword={unlockPassword}
        unlockError={unlockError}
        pinEnabled={pinUnlockEnabled}
        webAuthnEnabled={webAuthnUnlockEnabled}
        onPasswordChange={setUnlockPassword}
        onSubmit={handleUnlock}
        onLogout={handleLogout}
      />
  );
}
