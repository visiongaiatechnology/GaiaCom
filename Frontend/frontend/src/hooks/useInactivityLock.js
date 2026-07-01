// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useEffect } from 'react';

/**
 * Locks the app after a configurable idle timeout (inactivity).
 * Listens for user interaction events and resets the timer on each one.
 * Extracted from App.js (was lines 1149–1167). Zero logic changes.
 */
export function useInactivityLock({ user, derivedKeys, isLocked, inactivityLockMinutes, handleLock, triggerAlert, t }) {
  useEffect(() => {
    if (!user || !derivedKeys || isLocked || inactivityLockMinutes <= 0) return undefined;
    let timer = null;
    const lockAfterIdle = () => {
      handleLock();
      triggerAlert(t('sperren') || 'Gesperrt', t('inactivity_lock_notice') || 'GaiaCOM wurde wegen Inaktivitat kryptografisch gesperrt.', 'warning');
    };
    const resetTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(lockAfterIdle, inactivityLockMinutes * 60 * 1000);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(eventName => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach(eventName => window.removeEventListener(eventName, resetTimer));
    };
  }, [derivedKeys, handleLock, inactivityLockMinutes, isLocked, t, triggerAlert, user]);
}
