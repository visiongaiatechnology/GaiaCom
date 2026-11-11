import React, { Suspense, lazy } from 'react';
const ProfilePane = lazy(() => import('../../../chat/ProfilePane'));
import PaneFallback from '../PaneFallback';

/**
 * PaneProfile — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneProfile(props) {
  const {
    activeIdentity,
    activeProfileSection,
    areKeysUnlocked,
    confirmPasswordInput,
    cryptoSessionMinutes,
    currentMenu,
    currentPasswordInput,
    derivedKeys,
    deviceKeyVault,
    displayGaiaID,
    filterRules,
    handleAvatarFileChange,
    handleChangePassword,
    handleDeleteAccount,
    handleExportRecoveryBackup,
    handleRemoveUnlockPin,
    handleRemoveWebAuthnUnlock,
    handleSetUnlockPin,
    handleSetWebAuthnUnlock,
    handleUnlockProfileKeys,
    handleUpdatePrivacySettings,
    inactivityLockMinutes,
    labelsList,
    mailSettings,
    mnemonic,
    newPasswordInput,
    notificationPreferences,
    passwordChangeError,
    pinUnlockEnabled,
    profileAvatar,
    profileBio,
    profileDisplayName,
    profilePasswordInput,
    profileRealName,
    profileUnlockError,
    profileWebsite,
    saveFilterRule,
    saveProfile,
    saveSettings,
    setActiveProfileSection,
    setAreKeysUnlocked,
    setConfirmPasswordInput,
    setCryptoSessionMinutes,
    setCurrentMenu,
    setCurrentPasswordInput,
    setDeviceKeyVault,
    setInactivityLockMinutes,
    setNewPasswordInput,
    setNotificationPreferences,
    setProfileAvatar,
    setProfileBio,
    setProfileDisplayName,
    setProfilePasswordInput,
    setProfileRealName,
    setProfileWebsite,
    t,
    user,
    webAuthnUnlockEnabled,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'profile' && (
          <ProfilePane
            activeIdentity={activeIdentity}
            displayGaiaID={displayGaiaID}
            profileAvatar={profileAvatar}
            setProfileAvatar={setProfileAvatar}
            profileDisplayName={profileDisplayName}
            setProfileDisplayName={setProfileDisplayName}
            profileRealName={profileRealName}
            setProfileRealName={setProfileRealName}
            profileWebsite={profileWebsite}
            setProfileWebsite={setProfileWebsite}
            profileBio={profileBio}
            setProfileBio={setProfileBio}
            saveProfile={saveProfile}
            handleAvatarFileChange={handleAvatarFileChange}
            currentPasswordInput={currentPasswordInput}
            setCurrentPasswordInput={setCurrentPasswordInput}
            newPasswordInput={newPasswordInput}
            setNewPasswordInput={setNewPasswordInput}
            confirmPasswordInput={confirmPasswordInput}
            setConfirmPasswordInput={setConfirmPasswordInput}
            passwordChangeError={passwordChangeError}
            handleChangePassword={handleChangePassword}
            areKeysUnlocked={areKeysUnlocked}
            profilePasswordInput={profilePasswordInput}
            setProfilePasswordInput={setProfilePasswordInput}
            handleUnlockProfileKeys={handleUnlockProfileKeys}
            profileUnlockError={profileUnlockError}
            derivedKeys={derivedKeys}
            mnemonic={mnemonic}
            deviceKeyVault={deviceKeyVault}
            setDeviceKeyVault={setDeviceKeyVault}
            setAreKeysUnlocked={setAreKeysUnlocked}
            setCurrentMenu={setCurrentMenu}
            t={t}
            activeSection={activeProfileSection}
            setActiveProfileSection={setActiveProfileSection}
            cryptoSessionMinutes={cryptoSessionMinutes}
            setCryptoSessionMinutes={setCryptoSessionMinutes}
            inactivityLockMinutes={inactivityLockMinutes}
            setInactivityLockMinutes={setInactivityLockMinutes}
            pinUnlockEnabled={pinUnlockEnabled}
            handleSetUnlockPin={handleSetUnlockPin}
            handleRemoveUnlockPin={handleRemoveUnlockPin}
            webAuthnUnlockEnabled={webAuthnUnlockEnabled}
            handleSetWebAuthnUnlock={handleSetWebAuthnUnlock}
            handleRemoveWebAuthnUnlock={handleRemoveWebAuthnUnlock}
            handleDeleteAccount={handleDeleteAccount}
            handleExportRecoveryBackup={handleExportRecoveryBackup}
            user={user}
            handleUpdatePrivacySettings={handleUpdatePrivacySettings}
            notificationPreferences={notificationPreferences}
            setNotificationPreferences={setNotificationPreferences}
            mailSettings={mailSettings}
            saveSettings={saveSettings}
            filterRules={filterRules}
            saveFilterRule={saveFilterRule}
            labelsList={labelsList}
          />
        )}
        </Suspense>
    </>
  );
}
