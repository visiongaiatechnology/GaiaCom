import { useEffect } from 'react';
import * as api from '../../api';
import { safeStorageJson } from '../../utils/safeJson';
import { mergeContactRecords } from '../../utils/contacts';

/* Mount-time synchronisation effects: inactivity lock, drop inbox, identity/contact/profile
   hydration, polling loop and SMTP body class (moved verbatim, same deps/cleanup). */
export default function useAppSyncEffects({ auth, ui, prefs, account, data, identity, t }) {
  const { user, derivedKeys, isLocked, handleLock, activeIdentity, setShowWizard } = auth;
  const { inactivityLockMinutes } = prefs;
  const { currentMenu, triggerAlert, setContacts } = ui;
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


  // Fetch inbox, sent folders, and rooms on timer loop
  useEffect(() => {
    let interval = null;
    if (activeIdentity && derivedKeys && !isLocked) {
      pollEmails();
      fetchRooms();
      interval = setInterval(() => {
        pollEmails();
        fetchRooms();
      }, 4000);
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
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdentity, derivedKeys, isLocked]);

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
