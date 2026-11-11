import { useEffect } from 'react';
import * as api from '../../api';
import { safeStorageJson } from '../../utils/safeJson';
import { mergeContactRecords } from '../../utils/contacts';

/* Mount-time synchronisation effects: inactivity lock, drop inbox, identity/contact/profile
   hydration, polling loop and SMTP body class (moved verbatim, same deps/cleanup). */
export default function useAppSyncEffects({ auth, ui, prefs, account, data, identity, t }) {
  const { user, derivedKeys, isLocked, handleLock, setShowWizard, mnemonic, writeCryptoSession } = auth;
  const { inactivityLockMinutes, cryptoSessionMinutes } = prefs;
  // `activeIdentity` lives in the UI shell (identity wiring), not in the auth hook.
  const { currentMenu, triggerAlert, setContacts, activeIdentity } = ui;
  const { fetchIdentities } = identity;
  const {
    setProfileDisplayName, setProfileRealName, setProfileWebsite, setProfileBio, setProfileAvatar
  } = account.profile;
  const { loadGaiaDropInbox } = data.drop;
  const { pollEmails, setInboxEmails, setSentEmails, isSmtpMode, isComposing } = data.emails;
  const {
    fetchRooms, setRooms, setActiveRoom, setChannels, setActiveChannel, setChatMessages
  } = data.chat;

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

  // --- Load GaiaDrop Inbox on Menu/Identity Change ---
  useEffect(() => {
    if (activeIdentity && derivedKeys && !isLocked) {
      loadGaiaDropInbox();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMenu, activeIdentity, derivedKeys, isLocked]);

  // Fetch identities & cache contacts
  useEffect(() => {
    if (user) {
      fetchIdentities(user, setShowWizard);
      const parsedCachedContacts = safeStorageJson(localStorage, `contacts_${user.id}`, []);
      setContacts(parsedCachedContacts);
      api.getMailContacts()
        .then(serverContacts => {
          const mergedContacts = mergeContactRecords(parsedCachedContacts, serverContacts || []);
          setContacts(mergedContacts);
          localStorage.setItem(`contacts_${user.id}`, JSON.stringify(mergedContacts));
        })
        .catch(() => {});
      // Load user profile details
      const cachedProfile = safeStorageJson(localStorage, `profile_${user.id}`, null);
      if (cachedProfile) {
        const parsed = cachedProfile;
        setProfileDisplayName(parsed.displayName || user.username || '');
        setProfileRealName(parsed.realName || '');
        setProfileWebsite(parsed.website || '');
        setProfileBio(parsed.bio || '');
        setProfileAvatar(parsed.avatar || '\u{1F916}');
      } else {
        setProfileDisplayName(user.username || '');
        setProfileRealName('');
        setProfileWebsite('');
        setProfileBio('Sicher verschlüsselt mit GaiaCOM');
        setProfileAvatar('\u{1F916}');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  // Fetch inbox, sent folders, and rooms on timer loop.
  // Before the first poll (and whenever the tab becomes visible again) the
  // session cookie is refreshed once: after an idle/background phase the first
  // parallel requests would otherwise both hit 401 before the single refresh
  // runs, which is pure console noise. Polls are paused while that refresh is
  // in flight.
  useEffect(() => {
    let interval = null;
    let disposed = false;
    let refreshing = false;
    const refreshSession = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        await api.rotateSession();
      } catch (_) {
        // Session/offline errors surface through the normal API error handling.
      } finally {
        refreshing = false;
      }
    };
    const poll = () => {
      if (refreshing) return;
      pollEmails();
      fetchRooms();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession().catch(() => {});
      }
    };
    if (activeIdentity && derivedKeys && !isLocked) {
      refreshSession()
        .then(() => {
          if (!disposed) poll();
        })
        .catch(() => {
          // A failed rotation keeps the current session; polling/login state is
          // handled by the auth layer, so no unhandled rejection is allowed here.
        });
      interval = setInterval(poll, 4000);
      document.addEventListener('visibilitychange', onVisibilityChange);
    } else {
      setInboxEmails([]);
      setSentEmails([]);
      setChatMessages([]);
      setRooms([]);
      setActiveRoom(null);
      setChannels([]);
      setActiveChannel(null);
    }
    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdentity, derivedKeys, isLocked]);

  // Keep the tab-scoped crypto session in sync with the "Unlock after reload"
  // setting: changing the window while unlocked must take effect immediately,
  // not only after the next manual unlock.
  useEffect(() => {
    if (!user?.id || !mnemonic || !derivedKeys || isLocked) return;
    writeCryptoSession(user, mnemonic, cryptoSessionMinutes, derivedKeys.hqc256 || null);
  }, [cryptoSessionMinutes, user, mnemonic, derivedKeys, isLocked, writeCryptoSession]);

  // Toggle warning-red SMTP class on body
  useEffect(() => {
    if (isSmtpMode && isComposing) {
      document.body.classList.add('smtp-active');
    } else {
      document.body.classList.remove('smtp-active');
    }
    return () => {
      document.body.classList.remove('smtp-active');
    };
  }, [isSmtpMode, isComposing]);
}
