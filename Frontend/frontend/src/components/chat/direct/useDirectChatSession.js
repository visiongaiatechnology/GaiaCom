import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../../api';

/**
 * Session state for a 1:1 conversation: scroll anchoring, near-bottom detection,
 * context-menu / long-press state, presence + typing polls, security events and
 * key-rotation notices. Behaviour is identical to the pre-redesign ChatPane;
 * only the ownership moved out of the render body.
 */
export default function useDirectChatSession({
  activeChatContact,
  activeIdentity,
  contactPresence,
  visibleMessages,
  lastMessageId
}) {
  const scrollRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const previousLastMessageIdRef = useRef('');
  const lastIncomingMessageIdRef = useRef('');

  const [actionMessageId, setActionMessageId] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);
  const [contactTyping, setContactTyping] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [dismissedKeyRotation, setDismissedKeyRotation] = useState('');

  /* ---------- block state mirrors the contact record ---------- */
  useEffect(() => {
    if (activeChatContact && activeIdentity) {
      setIsBlocked(!!activeChatContact.blocked);
    }
  }, [activeChatContact, activeIdentity]);

  /* ---------- desktop notification permission (once) ---------- */
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  /* ---------- notify when a new incoming message arrives in background ---------- */
  const lastIncomingMessage = useMemo(() => {
    const incoming = visibleMessages.filter(message => message.sender !== activeIdentity?.GaiaID);
    return incoming.length > 0 ? incoming[incoming.length - 1] : null;
  }, [visibleMessages, activeIdentity?.GaiaID]);

  useEffect(() => {
    if (!lastIncomingMessage) return;
    if (lastIncomingMessageIdRef.current && lastIncomingMessageIdRef.current !== lastIncomingMessage.id) {
      if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(activeChatContact?.displayName || 'Neue Nachricht', {
          body: lastIncomingMessage.body || 'Datei empfangen',
          icon: '/favicon.ico'
        });
      }
    }
    lastIncomingMessageIdRef.current = lastIncomingMessage.id;
  }, [lastIncomingMessage, activeChatContact]);

  /* ---------- scrolling ---------- */
  const syncScrollState = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    const nearBottom = distanceFromBottom <= 72;
    setIsNearBottom(current => (current === nearBottom ? current : nearBottom));
    if (nearBottom) {
      setPendingMessageCount(0);
    }
  }, []);

  const scrollToLatest = useCallback(behavior => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    setPendingMessageCount(0);
    setIsNearBottom(true);
  }, []);

  const jumpToMessage = useCallback(messageId => {
    const node = scrollRef.current;
    if (!node) return;
    const target = node.querySelector(`[data-message-id="${messageId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  /* reset when the conversation changes */
  useEffect(() => {
    setPendingMessageCount(0);
    setIsNearBottom(true);
    previousLastMessageIdRef.current = '';
    window.requestAnimationFrame(() => {
      scrollToLatest('auto');
    });
  }, [activeChatContact?.ID, activeChatContact?.gaiaID, scrollToLatest]);

  /* follow new messages while the user is at the bottom, count them otherwise */
  useEffect(() => {
    if (!lastMessageId) {
      previousLastMessageIdRef.current = '';
      return;
    }

    if (!previousLastMessageIdRef.current) {
      previousLastMessageIdRef.current = lastMessageId;
      window.requestAnimationFrame(() => {
        scrollToLatest('auto');
      });
      return;
    }

    if (previousLastMessageIdRef.current === lastMessageId) {
      return;
    }

    previousLastMessageIdRef.current = lastMessageId;
    if (isNearBottom) {
      window.requestAnimationFrame(() => {
        scrollToLatest('smooth');
      });
      return;
    }

    setPendingMessageCount(count => count + 1);
  }, [isNearBottom, lastMessageId, scrollToLatest]);

  /* attach scroll listener on the active conversation */
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    syncScrollState();
    node.addEventListener('scroll', syncScrollState);

    return () => {
      node.removeEventListener('scroll', syncScrollState);
    };
  }, [activeChatContact?.ID, activeChatContact?.gaiaID, syncScrollState]);

  /* ---------- long-press / context menu ---------- */
  useEffect(() => () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
  }, []);

  const openMessageActions = useCallback((event, messageId) => {
    event.preventDefault();
    event.stopPropagation();
    setActionMessageId(messageId);
  }, []);

  const startLongPress = useCallback(messageId => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      setActionMessageId(messageId);
    }, 520);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  /* ---------- security events (replay / tamper / integrity) ---------- */
  useEffect(() => {
    if (!activeIdentity?.ID) {
      setSecurityAlerts([]);
      return undefined;
    }

    let stopped = false;
    const isRelevantSecurityEvent = event => {
      const category = String(event?.category || '').toLowerCase();
      const summary = String(event?.summary || '').toLowerCase();
      return (
        category.includes('replay') ||
        category.includes('tamper') ||
        category.includes('integrity') ||
        summary.includes('replay') ||
        summary.includes('manipulation') ||
        summary.includes('integrity')
      );
    };

    const loadSecurityAlerts = async () => {
      try {
        const result = await api.getSecurityEvents();
        if (!stopped) {
          setSecurityAlerts((result?.events || []).filter(event => !event?.acknowledged_at && isRelevantSecurityEvent(event)));
        }
      } catch (_) {
        if (!stopped) {
          setSecurityAlerts([]);
        }
      }
    };

    loadSecurityAlerts();
    const interval = window.setInterval(loadSecurityAlerts, 15000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeIdentity?.ID]);

  /* ---------- peer typing poll ---------- */
  useEffect(() => {
    if (!activeIdentity?.ID || !activeChatContact?.gaiaID) {
      setContactTyping(false);
      return undefined;
    }

    let stopped = false;
    const loadTyping = async () => {
      try {
        const result = await api.getTypingStatus(activeIdentity.ID, {
          peerGaiaId: activeChatContact.gaiaID
        });
        if (!stopped) {
          setContactTyping(!!result?.direct?.isTyping);
        }
      } catch (_) {
        if (!stopped) {
          setContactTyping(false);
        }
      }
    };

    loadTyping();
    const interval = window.setInterval(loadTyping, 2000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeChatContact?.gaiaID, activeIdentity?.ID]);

  /* ---------- key rotation notice (local dismiss state) ---------- */
  const keyHistory = useMemo(
    () => (Array.isArray(activeChatContact?.keyHistory) ? activeChatContact.keyHistory : []),
    [activeChatContact?.keyHistory]
  );
  const keyRotationDismissKey = useMemo(() => {
    if (!activeChatContact?.gaiaID || keyHistory.length <= 1) return '';
    const fingerprints = keyHistory
      .map(entry => entry?.fingerprint || entry?.publicKey || '')
      .filter(Boolean)
      .join('|');
    return `${activeChatContact.gaiaID}|${fingerprints}`;
  }, [activeChatContact?.gaiaID, keyHistory]);
  const keyRotationDismissStorageKey = activeChatContact?.gaiaID
    ? `key_rotation_notice_${activeIdentity?.ID || 'local'}_${activeChatContact.gaiaID}`
    : '';
  const hasKeyRotation = keyHistory.length > 1 && keyRotationDismissKey !== dismissedKeyRotation;

  useEffect(() => {
    if (!keyRotationDismissStorageKey) {
      setDismissedKeyRotation('');
      return;
    }
    setDismissedKeyRotation(localStorage.getItem(keyRotationDismissStorageKey) || '');
  }, [keyRotationDismissStorageKey]);

  const dismissKeyRotationNotice = useCallback(() => {
    if (!keyRotationDismissKey) return;
    setDismissedKeyRotation(keyRotationDismissKey);
    if (keyRotationDismissStorageKey) {
      localStorage.setItem(keyRotationDismissStorageKey, keyRotationDismissKey);
    }
  }, [keyRotationDismissKey, keyRotationDismissStorageKey]);

  /* ---------- presence labels (only claims backed by presence data) ---------- */
  const presenceLabel = !contactPresence
    ? 'Status unbekannt'
    : contactPresence.isOnline
      ? (contactPresence.status === 'away' ? 'abwesend' : contactPresence.status === 'busy' ? 'beschäftigt' : 'online')
      : contactPresence.lastSeenAt
        ? `zuletzt gesehen ${new Date(contactPresence.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'offline';
  const statusLabel = contactTyping ? 'tippt gerade...' : presenceLabel;

  const recentSecurityAlerts = securityAlerts.slice(0, 3);
  const isOnline = Boolean(contactPresence?.isOnline) && !contactTyping;

  return {
    scrollRef,
    actionMessageId,
    setActionMessageId,
    isNearBottom,
    pendingMessageCount,
    scrollToLatest,
    jumpToMessage,
    openMessageActions,
    startLongPress,
    cancelLongPress,
    contactTyping,
    recentSecurityAlerts,
    isBlocked,
    presenceLabel,
    statusLabel,
    isOnline,
    keyHistory,
    hasKeyRotation,
    dismissKeyRotationNotice
  };
}