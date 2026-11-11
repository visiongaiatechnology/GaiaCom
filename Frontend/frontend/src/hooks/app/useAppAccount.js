import React, { useState } from 'react';
import { useProfileActions } from '../../utils/useProfileActions';
import { parseToGaiaID } from '../../utils/gaiaAddress';
import { appendKeyHistory } from '../../utils/keyHistory';

/* Profile actions, user/lock transition veil state and recipient key-change guard (moved verbatim). */
export default function useAppAccount({ auth, ui, prefs, markers, t }) {
  const {
    user, setUser, mnemonic, setMnemonic, derivedKeys, setDerivedKeys, isLocked,
    usernameInput, setUsernameInput, passwordInput, setPasswordInput, writeCryptoSession
  } = auth;
  const { cryptoSessionMinutes, setCryptoSessionMinutes, inactivityLockMinutes, setInactivityLockMinutes } = prefs;
  const { activeIdentity, triggerAlert, contacts, setContacts } = ui;
  const { setKeyChangeWarning, setKeyChangeConfirmInput } = markers;

  // --- Profile & Contact Actions (need user/mnemonic from auth hook) ---
  const profile = useProfileActions({
    user, setUser,
    mnemonic, setMnemonic,
    derivedKeys, setDerivedKeys,
    usernameInput, setUsernameInput,
    passwordInput, setPasswordInput,
    cryptoSessionMinutes,
    setCryptoSessionMinutes,
    inactivityLockMinutes,
    setInactivityLockMinutes,
    writeCryptoSession,
    activeIdentity,
    triggerAlert,
    t
  });

  const [showTransition, setShowTransition] = useState(false);
  const [transitionText, setTransitionText] = useState('GAIACOM');
  const prevUserRef = React.useRef(user);
  const prevIsLockedRef = React.useRef(isLocked);

  React.useEffect(() => {
    if (!prevUserRef.current && user) {
      prevUserRef.current = user;
      setTransitionText('GAIACOM');
      setShowTransition(true);
    }
    prevUserRef.current = user;
  }, [user]);

  React.useEffect(() => {
    if (prevIsLockedRef.current && !isLocked && user) {
      prevIsLockedRef.current = isLocked;
      setTransitionText('GAIACOM');
      setShowTransition(true);
    }
    prevIsLockedRef.current = isLocked;
  }, [isLocked, user]);

  // Single owner for the veil timeout: guarantees the welcome veil always clears,
  // even when both transition triggers fire in the same commit (the previous
  // per-effect timers could cancel each other and leave the veil stuck).
  React.useEffect(() => {
    if (!showTransition) return undefined;
    const timer = setTimeout(() => setShowTransition(false), 2100);
    return () => clearTimeout(timer);
  }, [showTransition]);

  function verifyRecipientsAndRun(recipientGaiaIds, pubRecords, runFn) {
    for (let i = 0; i < recipientGaiaIds.length; i++) {
      const gaiaID = recipientGaiaIds[i];
      const pubRecord = pubRecords[i];
      
      const formatted = parseToGaiaID(gaiaID);
      const stored = contacts.find(c => parseToGaiaID(c.gaiaID) === formatted);
      const fetchedKey = pubRecord.public_keys.identity;
      
      if (stored && stored.publicKey !== fetchedKey) {
        setKeyChangeWarning({
          gaiaID: formatted,
          displayName: stored.displayName,
          oldKey: stored.publicKey,
          newKey: fetchedKey,
          resumeFn: () => {
            const updatedStored = {
              ...stored,
              publicKey: fetchedKey,
              keyHistory: appendKeyHistory(stored, fetchedKey, true),
              keyConfirmedAt: new Date().toISOString()
            };
            const updated = contacts.map(c => c.ID === stored.ID ? updatedStored : c);
            setContacts(updated);
            localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
            setKeyChangeWarning(null);
            setKeyChangeConfirmInput('');
            verifyRecipientsAndRun(recipientGaiaIds, pubRecords, runFn);
          },
          cancelFn: () => {
            setKeyChangeWarning(null);
            setKeyChangeConfirmInput('');
            triggerAlert('Abgebrochen', 'Sicherheitskritischer Schlüsselwechsel nicht bestätigt.', 'danger');
          }
        });
        return;
      }
    }
    runFn();
  }

  return { profile, showTransition, transitionText, verifyRecipientsAndRun };
}
