import { useCallback, useEffect } from 'react';

/* First-run onboarding + boot-sequence effects, plus the hasActiveContent derivation
   (moved verbatim; same storage keys, timers and dependency arrays). */
export default function useAppBootOnboarding({ auth, ui, markers, data }) {
  const { user, derivedKeys, isLocked, showWizard, activeIdentity } = auth;
  const { showFirstRunOnboarding, setShowFirstRunOnboarding, setShowBootSequence, bootSequenceSeenRef, onboardingSeenKeyRef } = markers;
  const { currentMenu, setCurrentMenu, setMobileMenuOpen, publicChannelCreatorOpen, activeProfileSection } = ui;
  const { mailSettings, saveSettings, selectedMail, isComposing, setSelectedMail, setIsComposing } = data.emails;
  const { activeChatContact, activeRoom } = data.chat;
  const { activePublicChannel } = data.publicChannels;
  const { selectedDrop } = data.drop;

  useEffect(() => {
    if (!user?.id || !derivedKeys || isLocked || showWizard) {
      if (!user?.id || !derivedKeys) {
        bootSequenceSeenRef.current = '';
      }
      setShowBootSequence(false);
      return;
    }
    if (bootSequenceSeenRef.current === user.id) {
      return;
    }
    bootSequenceSeenRef.current = user.id;
    setShowBootSequence(false);
    const frame = window.requestAnimationFrame(() => setShowBootSequence(true));
    const timer = window.setTimeout(() => setShowBootSequence(false), 2600);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [derivedKeys, isLocked, showWizard, user?.id]);

  useEffect(() => {
    if (!user?.id || !activeIdentity?.ID || !derivedKeys || isLocked || showWizard) {
      setShowFirstRunOnboarding(false);
      onboardingSeenKeyRef.current = '';
      return undefined;
    }

    const storageKey = `gaia_first_run_onboarding_${user.id}_${activeIdentity.ID}`;
    if (onboardingSeenKeyRef.current === storageKey) {
      return undefined;
    }
    onboardingSeenKeyRef.current = storageKey;

    if (
      localStorage.getItem(storageKey) === 'done' ||
      localStorage.getItem(`gaia_integrated_onboarding_done_${user.id}`) === 'done' ||
      mailSettings?.onboardingDone === true ||
      mailSettings?.onboardingDone === 1
    ) {
      setShowFirstRunOnboarding(false);
      if (localStorage.getItem(storageKey) !== 'done') {
        localStorage.setItem(storageKey, 'done');
      }
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowFirstRunOnboarding(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeIdentity?.ID, derivedKeys, isLocked, showWizard, user?.id, mailSettings]);

  const closeFirstRunOnboarding = useCallback(() => {
    if (user?.id && activeIdentity?.ID) {
      const storageKey = `gaia_first_run_onboarding_${user.id}_${activeIdentity.ID}`;
      localStorage.setItem(storageKey, 'done');
      saveSettings({ ...mailSettings, onboardingDone: true });
    }
    setShowFirstRunOnboarding(false);
  }, [activeIdentity?.ID, user?.id, mailSettings, saveSettings]);

  const openOnboardingDestination = useCallback((menu, afterOpen = null) => {
    closeFirstRunOnboarding();
    setCurrentMenu(menu);
    setSelectedMail(null);
    setIsComposing(false);
    setMobileMenuOpen(false);
    if (afterOpen) afterOpen();
  }, [closeFirstRunOnboarding, setIsComposing, setSelectedMail]);

  const hasActiveContent = !!(
    selectedMail ||
    isComposing ||
    currentMenu === 'dashboard' ||
    (currentMenu === 'chat' && activeChatContact) ||
    (currentMenu === 'groups' && activeRoom) ||
    (currentMenu === 'public_channels' && (activePublicChannel || publicChannelCreatorOpen)) ||
    currentMenu === 'network_health' ||
    currentMenu === 'abuse_center' ||
    currentMenu === 'security_center' ||
    (currentMenu === 'profile' && activeProfileSection) ||
    currentMenu === 'vault' ||
    (currentMenu === 'gaiadrop' && selectedDrop) ||
    currentMenu === 'gsn'
  );

  return { showFirstRunOnboarding, closeFirstRunOnboarding, openOnboardingDestination, hasActiveContent };
}
