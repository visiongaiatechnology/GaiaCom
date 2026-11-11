import React from 'react';
import LandingPage from '../public/landing/LandingPage';
import AuthDialog from './AuthDialog';
import { TermsDialog, RegistrationSuccess, CookieBanner } from '../public/landing/LandingLegal';
import { useTranslation } from '../../utils/i18n';

/**
 * Public entry surface: landing page + access dialog.
 *
 * Layout / visual design: VGT GLASS 2100 (see src/styles/glass2100/ and
 * src/styles/areas/landing.css). All authentication, registration, pairing,
 * drop and recovery logic stays in App.jsx / useGaiaAuth and is passed in as
 * props; this component only owns presentation state.
 */
export default function AuthScreen({
  isRegister,
  usernameInput,
  passwordInput,
  mnemonic,
  copiedMnemonic,
  authError,
  showRegSuccessPopup,
  derivedKeys,
  serverVersion,
  serverConsensus,
  dropTargetInput,
  dropSenderInput,
  dropMessageInput,
  dropStatus,
  dropError,
  onSubmit,
  onImportRecovery,
  onUsernameChange,
  onPasswordChange,
  onMnemonicChange,
  onDropTargetChange,
  onDropSenderChange,
  onDropMessageChange,
  onSubmitGaiaDrop,
  onGenerateMnemonic,
  onCopyMnemonic,
  onToggleMode,
  onCloseSuccess,
  devicePairing,
  devicePairingError,
  onStartDevicePairing,
  onCompleteDevicePairing,
  onCancelDevicePairing
}) {
  const { language, changeLanguage, t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState('auth');
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showTermsPopup, setShowTermsPopup] = React.useState(false);
  const [legalAccepted, setLegalAccepted] = React.useState(false);
  const [showCookieBanner, setShowCookieBanner] = React.useState(() => {
    try {
      return localStorage.getItem('gaia_cookie_ack') !== 'sovereign-v1';
    } catch (_) {
      return true;
    }
  });

  const acceptCookieBanner = React.useCallback(() => {
    try {
      localStorage.setItem('gaia_cookie_ack', 'sovereign-v1');
    } catch (_) {}
    setShowCookieBanner(false);
  }, []);

  React.useEffect(() => {
    if (authError) setShowAuthModal(true);
  }, [authError]);

  const openAuth = React.useCallback((tab = 'auth') => {
    setActiveTab(tab);
    setShowAuthModal(true);
  }, []);

  const openTerms = React.useCallback(() => setShowTermsPopup(true), []);
  const closeTerms = React.useCallback(() => setShowTermsPopup(false), []);
  const closeAuth = React.useCallback(() => setShowAuthModal(false), []);

  return (
    <div className={`vgt-public auth-lang-${language}`}>
      <LandingPage
        t={t}
        language={language}
        changeLanguage={changeLanguage}
        serverVersion={serverVersion}
        serverConsensus={serverConsensus}
        onOpenAuth={openAuth}
        onOpenTerms={openTerms}
        dropTargetInput={dropTargetInput}
        dropSenderInput={dropSenderInput}
        dropMessageInput={dropMessageInput}
        dropStatus={dropStatus}
        dropError={dropError}
        onDropTargetChange={onDropTargetChange}
        onDropSenderChange={onDropSenderChange}
        onDropMessageChange={onDropMessageChange}
        onSubmitGaiaDrop={onSubmitGaiaDrop}
      />

      <AuthDialog
        open={showAuthModal}
        onClose={closeAuth}
        t={t}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRegister={isRegister}
        usernameInput={usernameInput}
        passwordInput={passwordInput}
        mnemonic={mnemonic}
        copiedMnemonic={copiedMnemonic}
        authError={authError}
        legalAccepted={legalAccepted}
        setLegalAccepted={setLegalAccepted}
        onSubmit={onSubmit}
        onImportRecovery={onImportRecovery}
        onUsernameChange={onUsernameChange}
        onPasswordChange={onPasswordChange}
        onMnemonicChange={onMnemonicChange}
        onGenerateMnemonic={onGenerateMnemonic}
        onCopyMnemonic={onCopyMnemonic}
        onToggleMode={onToggleMode}
        onOpenTerms={openTerms}
        devicePairing={devicePairing}
        devicePairingError={devicePairingError}
        onStartDevicePairing={onStartDevicePairing}
        onCompleteDevicePairing={onCompleteDevicePairing}
        onCancelDevicePairing={onCancelDevicePairing}
        dropTargetInput={dropTargetInput}
        dropSenderInput={dropSenderInput}
        dropMessageInput={dropMessageInput}
        dropStatus={dropStatus}
        dropError={dropError}
        onDropTargetChange={onDropTargetChange}
        onDropSenderChange={onDropSenderChange}
        onDropMessageChange={onDropMessageChange}
        onSubmitGaiaDrop={onSubmitGaiaDrop}
      />

      {showRegSuccessPopup && (
        <RegistrationSuccess t={t} onClose={onCloseSuccess} derivedKeys={derivedKeys} />
      )}

      {showTermsPopup && <TermsDialog t={t} onClose={closeTerms} />}

      {showCookieBanner && <CookieBanner t={t} onAccept={acceptCookieBanner} />}
    </div>
  );
}
