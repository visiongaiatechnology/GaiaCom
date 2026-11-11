import { startTransition, useState, useEffect, useCallback } from 'react';

/* App UI shell state: navigation, mobile menu, dialogs, identities, PWA install (moved verbatim). */
export default function useAppUiShell(t) {
  // Mail List Collapsible State
  const [mailListCollapsed, setMailListCollapsed] = useState(false);

  // Quantum shield explanation popup state
  const [showQuantumShieldModal, setShowQuantumShieldModal] = useState(false);

  // Mobile menu control state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Custom Alerts/Popups States
  const [alertConfig, setAlertConfig] = useState(null); // { title, text, type }
  const [confirmConfig, setConfirmConfig] = useState(null);

  const triggerAlert = useCallback((title, text, type = 'success') => {
    setAlertConfig({ title, text, type });
  }, []);

  const showConfirm = useCallback((title, text, onConfirm, onCancel = null, confirmText = null, cancelText = null, danger = false) => {
    setConfirmConfig({
      showThreeButtons: false,
      title,
      text,
      onConfirm,
      onCancel,
      confirmText: confirmText || t('bestaetigen') || 'Bestätigen',
      cancelText: cancelText || t('abbrechen') || 'Abbrechen',
      danger
    });
  }, [t]);

  const showConfirmThreeButtons = useCallback((title, text, onConfirm, onConfirmAlternative, confirmText, confirmAlternativeText, cancelText, onCancel = null) => {
    setConfirmConfig({
      showThreeButtons: true,
      title,
      text,
      onConfirm,
      onConfirmAlternative,
      confirmText,
      confirmAlternativeText,
      cancelText,
      onCancel
    });
  }, []);

  // Core navigation & data
  const [currentMenu, setCurrentMenuState] = useState('dashboard'); // 'dashboard', 'inbox', 'smtp_inbox', 'sent', 'groups', 'chat', 'contacts', 'profile'
  const setCurrentMenu = useCallback((nextMenu) => {
    startTransition(() => setCurrentMenuState(nextMenu));
  }, []);
  const [activeProfileSection, setActiveProfileSection] = useState(() => (typeof window !== 'undefined' && window.innerWidth > 992) ? 'edit' : null);
  const [publicChannelCreatorOpen, setPublicChannelCreatorOpen] = useState(false);
  const [identities, setIdentities] = useState([]);
  const [activeIdentity, setActiveIdentity] = useState(null);
  const [activeIdentityRoles, setActiveIdentityRoles] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA installation choice:', outcome);
    setDeferredPrompt(null);
  };

  return {
    mailListCollapsed,
    setMailListCollapsed,
    showQuantumShieldModal,
    setShowQuantumShieldModal,
    mobileMenuOpen,
    setMobileMenuOpen,
    alertConfig,
    setAlertConfig,
    confirmConfig,
    setConfirmConfig,
    triggerAlert,
    showConfirm,
    showConfirmThreeButtons,
    currentMenu,
    setCurrentMenu,
    activeProfileSection,
    setActiveProfileSection,
    publicChannelCreatorOpen,
    setPublicChannelCreatorOpen,
    identities,
    setIdentities,
    activeIdentity,
    setActiveIdentity,
    activeIdentityRoles,
    setActiveIdentityRoles,
    contacts,
    setContacts,
    presenceMap,
    setPresenceMap,
    deferredPrompt,
    handleInstallApp,
  };
}
