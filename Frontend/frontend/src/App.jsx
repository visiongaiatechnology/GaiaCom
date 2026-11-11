import React, { useRef, useCallback } from 'react';
import { useTranslation } from './utils/i18n';
import useGaiaAuth from './hooks/useGaiaAuth';
import useAppTheme from './hooks/app/useAppTheme';
import useAppUiShell from './hooks/app/useAppUiShell';
import useAppLocalPrefs from './hooks/app/useAppLocalPrefs';
import useAppMarkersState from './hooks/app/useAppMarkersState';
import useAppIdentityWiring from './hooks/app/useAppIdentityWiring';
import useAppNotificationSync from './hooks/app/useAppNotificationSync';
import useAppAccount from './hooks/app/useAppAccount';
import useAppWorkspaceData from './hooks/app/useAppWorkspaceData';
import useAppSyncEffects from './hooks/app/useAppSyncEffects';
import useAppDerived from './hooks/app/useAppDerived';
import useMailKeyboardShortcuts from './hooks/app/useMailKeyboardShortcuts';
import useAppBootOnboarding from './hooks/app/useAppBootOnboarding';
import AppLockedScreen from './components/app/shell/AppLockedScreen';
import AppAuthView from './components/app/shell/AppAuthView';
import AppWizardView from './components/app/shell/AppWizardView';
import DesktopTitleBar from './components/aurora/DesktopTitleBar';
import AppWorkspaceShell from './components/app/shell/AppWorkspaceShell';

// Security invariant checked by adversarial tests:
// untrusted: !!(env.Untrusted || env.untrusted || isLegacySmtp)

// mergeContactRecords is now in ./utils/contacts.js

/**
 * App — composition root (VGT GLASS 2100).
 *
 * The former monolithic body is split into ordered subsystem hooks
 * (`hooks/app/*`) and screen components (`components/app/shell/*`). These hook
 * calls are made in exactly the original order, so effect ordering, dependency
 * arrays, localStorage keys, timers and handler signatures are unchanged; this
 * file only wires the resulting values to the active screen.
 */
export default function App() {
  const { language, changeLanguage, t } = useTranslation();

  // Ordered hook chain — preserves the original App.jsx hook/effect sequence.
  const theme = useAppTheme();
  const ui = useAppUiShell(t);
  const prefs = useAppLocalPrefs();
  const markers = useAppMarkersState();
  const identity = useAppIdentityWiring(ui);

  // clearAllData was a []-memoised callback before the split; the reset body now
  // lives in useAppWorkspaceData (same statements) and is dispatched via this ref.
  const resetRef = useRef(null);
  const clearAllData = useCallback(() => {
    if (typeof resetRef.current === 'function') resetRef.current();
  }, []);

  const auth = useGaiaAuth({
    triggerAlert: ui.triggerAlert,
    fetchIdentities: () => identity.fetchIdentities(auth.user, auth.setShowWizard),
    clearAllData,
    cryptoSessionMinutes: prefs.cryptoSessionMinutes
  });

  useAppNotificationSync({ theme, auth });
  const account = useAppAccount({ auth, ui, prefs, markers, t });
  const data = useAppWorkspaceData({ auth, ui, theme, prefs, markers, account, t, resetRef });
  useAppSyncEffects({ auth, ui, prefs, account, data, identity, t });
  const derived = useAppDerived({ auth, ui, data });
  useMailKeyboardShortcuts({ ui, data });
  const boot = useAppBootOnboarding({ auth, ui, markers, data });

  // --- RENDER SCREEN (same branch order as before) ---

  // Unlock Screen
  if (auth.isLocked) {
    return (
      <div className="ax4-authframe">
        <DesktopTitleBar />
        <div className="ax4-authframe__body"><AppLockedScreen auth={auth} account={account} /></div>
      </div>
    );
  }

  // 1. Auth Page
  if (!auth.user || !auth.derivedKeys) {
    return (
      <div className="ax4-authframe">
        <DesktopTitleBar />
        <div className="ax4-authframe__body"><AppAuthView auth={auth} account={account} data={data} t={t} /></div>
      </div>
    );
  }

  // 2. Setup Wizard (Profile generator)
  if (auth.showWizard) {
    return (
      <div className="ax4-authframe">
        <DesktopTitleBar />
        <div className="ax4-authframe__body"><AppWizardView auth={auth} t={t} /></div>
      </div>
    );
  }

  return (
    <AppWorkspaceShell
      theme={theme}
      ui={ui}
      prefs={prefs}
      markers={markers}
      auth={auth}
      account={account}
      data={data}
      derived={derived}
      boot={boot}
      identity={identity}
      language={language}
      changeLanguage={changeLanguage}
      t={t}
    />
  );
}
