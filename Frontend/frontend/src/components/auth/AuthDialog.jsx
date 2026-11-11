import React from 'react';
import LogoMark from '../layout/LogoMark';
import Icon from '../ui/Icon';
import AuthAccessPanel from './dialog/AuthAccessPanel';
import AuthDropPanel from './dialog/AuthDropPanel';
import AuthPairPanel from './dialog/AuthPairPanel';
import AuthRecoveryPanel from './dialog/AuthRecoveryPanel';

const TAB_LABELS = {
  auth: 'auth_tab_login',
  drop: 'auth_tab_drop',
  recovery: 'auth_recovery_mode',
  pair: 'ui_auth_pair_tab'
};

export default function AuthDialog({
  open,
  onClose,
  t,
  activeTab,
  setActiveTab,
  isRegister,
  usernameInput,
  passwordInput,
  mnemonic,
  copiedMnemonic,
  authError,
  legalAccepted,
  setLegalAccepted,
  onSubmit,
  onImportRecovery,
  onUsernameChange,
  onPasswordChange,
  onMnemonicChange,
  onGenerateMnemonic,
  onCopyMnemonic,
  onToggleMode,
  onOpenTerms,
  devicePairing,
  devicePairingError,
  onStartDevicePairing,
  onCompleteDevicePairing,
  onCancelDevicePairing,
  dropTargetInput,
  dropSenderInput,
  dropMessageInput,
  dropStatus,
  dropError,
  onDropTargetChange,
  onDropSenderChange,
  onDropMessageChange,
  onSubmitGaiaDrop
}) {
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    if (isRegister && activeTab === 'pair') setActiveTab('auth');
  }, [isRegister, activeTab, setActiveTab]);

  React.useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const firstField = dialogRef.current?.querySelector('input, textarea, button');
    firstField?.focus?.();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleAuthSubmit = (event) => {
    if (isRegister && !legalAccepted) {
      event.preventDefault();
      return;
    }
    onSubmit(event);
  };

  const tabs = isRegister ? ['auth', 'drop', 'recovery'] : ['auth', 'drop', 'recovery', 'pair'];

  return (
    <div className="vgt-overlay vgt-overlay--auth" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        className="vgt-auth-dialog vgt-glass--modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vgt-auth-title"
        ref={dialogRef}
      >
        <header className="vgt-auth-dialog__head">
          <div className="vgt-auth-dialog__brand">
            <LogoMark compact size={34} />
            <div>
              <h2 className="vgt-h3" id="vgt-auth-title">{t('ui_auth_title') || 'Zugang zum GaiaCom-Netz'}</h2>
              <p className="vgt-caption">{t('ui_auth_subtitle') || 'Serverkonto und lokaler Schlüsseltresor sind getrennte Grenzen.'}</p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('ui_auth_close') || 'Dialog schließen'}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <ol className="vgt-auth-dialog__boundary" aria-label={t('ui_auth_boundary_aria') || 'Zwei Sicherheitsgrenzen'}>
          <li>
            <span className="vgt-auth-dialog__step vgt-numeric">1</span>
            <div>
              <strong>{t('ui_auth_step1_title') || 'Serverzugang'}</strong>
              <small>{t('ui_auth_step1_desc') || 'Anmeldung am GaiaCom-Konto. Lokale Schlüssel werden dabei nicht übertragen.'}</small>
            </div>
          </li>
          <li>
            <span className="vgt-auth-dialog__step vgt-numeric">2</span>
            <div>
              <strong>{t('ui_auth_step2_title') || 'Lokaler Tresor'}</strong>
              <small>{t('ui_auth_step2_desc') || 'Nach der Anmeldung entsperrst du deine Schlüssel ausschließlich auf diesem Gerät.'}</small>
            </div>
          </li>
        </ol>

        <div className="vgt-auth-dialog__status" role="note">
          <span className="vgt-caption">{t('ui_auth_arch_label') || 'Protokollarchitektur (Build-Fakten, kein Live-Status):'}</span>
          <span className="vgt-status vgt-status--idle">E2EE</span>
          <span className="vgt-status vgt-status--idle">Hybrid-PQC</span>
          <span className="vgt-status vgt-status--idle">{t('ui_auth_keys_local') || 'Schlüssel lokal'}</span>
        </div>

        <div className="vgt-auth-tabs" role="tablist" aria-label={t('ui_auth_options_aria') || 'Zugangsoptionen'}>
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`vgt-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls="vgt-auth-panel"
              className={activeTab === tab ? 'vgt-auth-tabs__btn is-active' : 'vgt-auth-tabs__btn'}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'pair' ? (t('ui_auth_pair_tab') || 'Gerät koppeln') : (t(TAB_LABELS[tab]) || tab)}
            </button>
          ))}
        </div>

        <div className="vgt-auth-panel" role="tabpanel" id="vgt-auth-panel" aria-labelledby={`vgt-tab-${activeTab}`}>
          {activeTab === 'auth' && (
            <AuthAccessPanel
              t={t}
              isRegister={isRegister}
              usernameInput={usernameInput}
              passwordInput={passwordInput}
              mnemonic={mnemonic}
              copiedMnemonic={copiedMnemonic}
              authError={authError}
              legalAccepted={legalAccepted}
              setLegalAccepted={setLegalAccepted}
              onUsernameChange={onUsernameChange}
              onPasswordChange={onPasswordChange}
              onMnemonicChange={onMnemonicChange}
              onGenerateMnemonic={onGenerateMnemonic}
              onCopyMnemonic={onCopyMnemonic}
              onSubmit={handleAuthSubmit}
              onToggleMode={onToggleMode}
              onOpenTerms={onOpenTerms}
              onSwitchRecovery={() => setActiveTab('recovery')}
            />
          )}

          {activeTab === 'drop' && (
            <AuthDropPanel
              t={t}
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
          )}

          {activeTab === 'recovery' && (
            <AuthRecoveryPanel
              t={t}
              onImportRecovery={onImportRecovery}
              onBack={() => setActiveTab('auth')}
            />
          )}

          {activeTab === 'pair' && (
            <AuthPairPanel
              t={t}
              devicePairing={devicePairing}
              devicePairingError={devicePairingError}
              onStartDevicePairing={onStartDevicePairing}
              onCompleteDevicePairing={onCompleteDevicePairing}
              onCancelDevicePairing={onCancelDevicePairing}
              usernameInput={usernameInput}
              passwordInput={passwordInput}
              onUsernameChange={onUsernameChange}
              onPasswordChange={onPasswordChange}
            />
          )}
        </div>

        <footer className="vgt-auth-dialog__foot">
          <p className="vgt-caption">
            {t('ui_auth_footer') || 'GaiaCom 3 · Sovereign Beta 3.0.2 · Sitzung und Schlüssel bleiben lokal, bis du sie freigibst.'}
          </p>
        </footer>
      </div>
    </div>
  );
}
