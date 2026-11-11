import { useState, useCallback } from 'react';

/* Local crypto-session / inactivity-lock preferences and their persistence keys (moved verbatim). */
export default function useAppLocalPrefs() {
  const [cryptoSessionMinutes, setCryptoSessionMinutesState] = useState(() => {
    const stored = Number(localStorage.getItem('gaia_crypto_session_minutes') || '0');
    return Number.isFinite(stored) && stored >= 0 ? stored : 0;
  });
  const [inactivityLockMinutes, setInactivityLockMinutesState] = useState(() => {
    const stored = Number(localStorage.getItem('gaia_inactivity_lock_minutes') || '15');
    return Number.isFinite(stored) && stored >= 0 ? stored : 15;
  });

  const setCryptoSessionMinutes = useCallback((minutes) => {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    setCryptoSessionMinutesState(safeMinutes);
    localStorage.setItem('gaia_crypto_session_minutes', String(safeMinutes));
    if (safeMinutes === 0) {
      sessionStorage.removeItem('gaia_crypto_session');
    }
  }, []);

  const setInactivityLockMinutes = useCallback((minutes) => {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    setInactivityLockMinutesState(safeMinutes);
    localStorage.setItem('gaia_inactivity_lock_minutes', String(safeMinutes));
  }, []);

  return {
    cryptoSessionMinutes,
    setCryptoSessionMinutes,
    inactivityLockMinutes,
    setInactivityLockMinutes,
  };
}
