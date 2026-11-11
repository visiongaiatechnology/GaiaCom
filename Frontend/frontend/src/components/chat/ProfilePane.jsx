import React, { useEffect, useState } from 'react';
import * as api from '../../api';
import Icon from '../ui/Icon';
import ProfileIdentityHeader from './profile/ui/ProfileIdentityHeader';
import useProfileDevices from './profile/hooks/useProfileDevices';
import useProfilePreferences from './profile/hooks/useProfilePreferences';
import useProfileSecurity from './profile/hooks/useProfileSecurity';
import ProfileEditSection from './profile/sections/ProfileEditSection';
import ProfilePasswordSection from './profile/sections/ProfilePasswordSection';
import ProfileMailboxSection from './profile/sections/ProfileMailboxSection';
import ProfileDevicesSection from './profile/sections/ProfileDevicesSection';
import ProfileSecuritySection from './profile/sections/ProfileSecuritySection';
import ProfileKeysSection from './profile/sections/ProfileKeysSection';
import ProfilePrivacySection from './profile/sections/ProfilePrivacySection';
import ProfileAccessibilitySection from './profile/sections/ProfileAccessibilitySection';
import ProfileNotificationsSection from './profile/sections/ProfileNotificationsSection';
import ProfileLegalSection from './profile/sections/ProfileLegalSection';
import ProfileDangerSection from './profile/sections/ProfileDangerSection';

/**
 * Identity workspace (VGT GLASS 2100).
 *
 * Composition-only shell: the identity header, the sticky section rail and the
 * active section live in `components/chat/profile/**`. All props, callbacks,
 * state and handlers are the same as before the redesign; sections are still
 * selected through the parent `activeProfileSection` contract.
 */
export const ProfilePane = ({
  activeIdentity,
  displayGaiaID,
  profileAvatar,
  setProfileAvatar,
  profileDisplayName,
  setProfileDisplayName,
  profileRealName,
  setProfileRealName,
  profileWebsite,
  setProfileWebsite,
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
  deviceKeyVault,
  setDeviceKeyVault,
  setAreKeysUnlocked,
  setCurrentMenu,
  t,
  activeSection,
  setActiveProfileSection,
  cryptoSessionMinutes,
  setCryptoSessionMinutes,
  inactivityLockMinutes,
  setInactivityLockMinutes,
  pinUnlockEnabled,
  handleSetUnlockPin,
  handleRemoveUnlockPin,
  webAuthnUnlockEnabled,
  handleSetWebAuthnUnlock,
  handleRemoveWebAuthnUnlock,
  handleDeleteAccount,
  handleExportRecoveryBackup,
  user,
  handleUpdatePrivacySettings,
  notificationPreferences,
  setNotificationPreferences,
  mailSettings,
  saveSettings,
  filterRules,
  saveFilterRule,
  labelsList
}) => {
  const [roles, setRoles] = useState([]);
  const [rolesError, setRolesError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!activeIdentity) {
      setRoles([]);
      setRolesError(false);
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const result = await api.getGovernanceRoles();
        if (cancelled) return;
        setRoles(Array.isArray(result?.roles) ? result.roles : []);
        setRolesError(false);
      } catch (_) {
        if (cancelled) return;
        setRoles([]);
        setRolesError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activeIdentity]);

  const devices = useProfileDevices({
    activeIdentity,
    deviceKeyVault,
    setDeviceKeyVault,
    derivedKeys,
    mnemonic
  });

  const security = useProfileSecurity({
    handleDeleteAccount,
    handleExportRecoveryBackup,
    handleSetUnlockPin,
    handleRemoveUnlockPin,
    handleSetWebAuthnUnlock,
    handleRemoveWebAuthnUnlock,
    handleUpdatePrivacySettings,
    areKeysUnlocked,
    mnemonic
  });

  const preferences = useProfilePreferences({ mailSettings, saveSettings, saveFilterRule });

  const selectSection = key => {
    if (typeof setActiveProfileSection === 'function') setActiveProfileSection(key);
  };

  const goBack = () => {
    if (setActiveProfileSection) {
      setActiveProfileSection(null);
    } else {
      setCurrentMenu('inbox');
    }
  };

  if (!activeSection) {
    return (
      <div className="vgt-profile-pane vgt-profile-pane--empty">
        <p className="vgt-body vgt-body--sm">
          {t('profile_settings_hint') || 'Profil-Einstellungen werden im rechten Panel angezeigt.'}
        </p>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'edit':
        return (
          <ProfileEditSection
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
            t={t}
          />
        );
      case 'password':
        return (
          <ProfilePasswordSection
            currentPasswordInput={currentPasswordInput}
            setCurrentPasswordInput={setCurrentPasswordInput}
            newPasswordInput={newPasswordInput}
            setNewPasswordInput={setNewPasswordInput}
            confirmPasswordInput={confirmPasswordInput}
            setConfirmPasswordInput={setConfirmPasswordInput}
            passwordChangeError={passwordChangeError}
            handleChangePassword={handleChangePassword}
            t={t}
          />
        );
      case 'mailbox_settings':
        return (
          <ProfileMailboxSection
            sigInput={preferences.sigInput}
            setSigInput={preferences.setSigInput}
            localeInput={preferences.localeInput}
            setLocaleInput={preferences.setLocaleInput}
            keyboardModeInput={preferences.keyboardModeInput}
            setKeyboardModeInput={preferences.setKeyboardModeInput}
            handleSaveMailboxSettings={preferences.handleSaveMailboxSettings}
            filterRules={filterRules}
            filterSender={preferences.filterSender}
            setFilterSender={preferences.setFilterSender}
            filterSubject={preferences.filterSubject}
            setFilterSubject={preferences.setFilterSubject}
            filterAction={preferences.filterAction}
            setFilterAction={preferences.setFilterAction}
            filterLabelVal={preferences.filterLabelVal}
            setFilterLabelVal={preferences.setFilterLabelVal}
            handleAddFilter={preferences.handleAddFilter}
            labelsList={labelsList}
            onOpenKeys={() => selectSection('keys')}
            t={t}
          />
        );
      case 'devices':
        return (
          <ProfileDevicesSection
            deviceSessions={devices.deviceSessions}
            deviceKeys={devices.deviceKeys}
            devicesLoading={devices.devicesLoading}
            devicesError={devices.devicesError}
            loadDeviceSessions={devices.loadDeviceSessions}
            loadDeviceKeys={devices.loadDeviceKeys}
            revokeDevice={devices.revokeDevice}
            revokeDeviceKey={devices.revokeDeviceKey}
            formatDeviceTime={devices.formatDeviceTime}
            pairingCode={devices.pairingCode}
            setPairingCode={devices.setPairingCode}
            pairingBusy={devices.pairingBusy}
            pairingStatus={devices.pairingStatus}
            approveNewDevice={devices.approveNewDevice}
            rotationPassword={devices.rotationPassword}
            setRotationPassword={devices.setRotationPassword}
            rotationBusy={devices.rotationBusy}
            rotationStatus={devices.rotationStatus}
            rotateCurrentDeviceKey={devices.rotateCurrentDeviceKey}
            deviceKeyVault={deviceKeyVault}
            t={t}
          />
        );
      case 'security':
        return (
          <ProfileSecuritySection
            cryptoSessionMinutes={cryptoSessionMinutes}
            setCryptoSessionMinutes={setCryptoSessionMinutes}
            inactivityLockMinutes={inactivityLockMinutes}
            setInactivityLockMinutes={setInactivityLockMinutes}
            pinUnlockEnabled={pinUnlockEnabled}
            handleRemoveUnlockPin={security.handleRemoveUnlockPin}
            webAuthnUnlockEnabled={webAuthnUnlockEnabled}
            handleRemoveWebAuthnUnlock={security.handleRemoveWebAuthnUnlock}
            unlockPin={security.unlockPin}
            setUnlockPin={security.setUnlockPin}
            unlockPinConfirm={security.unlockPinConfirm}
            setUnlockPinConfirm={security.setUnlockPinConfirm}
            unlockPinBusy={security.unlockPinBusy}
            unlockPinError={security.unlockPinError}
            submitUnlockPin={security.submitUnlockPin}
            webAuthnBusy={security.webAuthnBusy}
            webAuthnError={security.webAuthnError}
            submitWebAuthnUnlock={security.submitWebAuthnUnlock}
            areKeysUnlocked={areKeysUnlocked}
            t={t}
          />
        );
      case 'keys':
        return (
          <ProfileKeysSection
            areKeysUnlocked={areKeysUnlocked}
            profilePasswordInput={profilePasswordInput}
            setProfilePasswordInput={setProfilePasswordInput}
            handleUnlockProfileKeys={handleUnlockProfileKeys}
            profileUnlockError={profileUnlockError}
            derivedKeys={derivedKeys}
            mnemonic={mnemonic}
            setAreKeysUnlocked={setAreKeysUnlocked}
            recoveryPassword={security.recoveryPassword}
            setRecoveryPassword={security.setRecoveryPassword}
            recoveryConfirmPassword={security.recoveryConfirmPassword}
            setRecoveryConfirmPassword={security.setRecoveryConfirmPassword}
            recoveryBusy={security.recoveryBusy}
            recoveryError={security.recoveryError}
            handleRecoveryExport={security.handleRecoveryExport}
            t={t}
          />
        );
      case 'privacy':
        return (
          <ProfilePrivacySection
            user={user}
            privacyBusy={security.privacyBusy}
            privacyError={security.privacyError}
            submitAnonymousStatsPreference={security.submitAnonymousStatsPreference}
            t={t}
          />
        );
      case 'accessibility':
        return (
          <ProfileAccessibilitySection
            accessibilityPrefs={preferences.accessibilityPrefs}
            updateAccessibilityPreference={preferences.updateAccessibilityPreference}
          />
        );
      case 'notifications':
        return (
          <ProfileNotificationsSection
            notificationPreferences={notificationPreferences}
            setNotificationPreferences={setNotificationPreferences}
          />
        );
      case 'legal':
        return <ProfileLegalSection t={t} />;
      case 'danger':
        return (
          <ProfileDangerSection
            deletePassword={security.deletePassword}
            setDeletePassword={security.setDeletePassword}
            deleteConfirmation={security.deleteConfirmation}
            setDeleteConfirmation={security.setDeleteConfirmation}
            deleteError={security.deleteError}
            deleteBusy={security.deleteBusy}
            submitDeleteAccount={security.submitDeleteAccount}
            onNavigate={selectSection}
            t={t}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="vgt-profile-pane">
      <div className="vgt-profile-pane__bar">
        <button type="button" className="btn-ghost vgt-profile-back" onClick={goBack}>
          <Icon name="chevronLeft" size={16} />
          {t('wizard_back') || 'Zurück'}
        </button>
      </div>

      <ProfileIdentityHeader
        activeIdentity={activeIdentity}
        displayGaiaID={displayGaiaID}
        displayName={profileDisplayName || activeIdentity?.DisplayName || ''}
        avatar={profileAvatar}
        areKeysUnlocked={areKeysUnlocked}
        deviceKeyVault={deviceKeyVault}
        roles={roles}
        rolesError={rolesError}
      />

      <div className="vgt-profile-workspace">
        <div className="vgt-profile-content">{renderSection()}</div>
      </div>
    </div>
  );
};

export default ProfilePane;
