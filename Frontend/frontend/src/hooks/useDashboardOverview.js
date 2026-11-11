import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';

const MAX_ACTIVITY = 5;
const PREVIEW_MAX = 96;

function parseTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function relativeTime(value) {
  const timestamp = parseTimestamp(value);
  if (!timestamp) return '';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'gerade';
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.round(hours / 24);
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
}

function preview(value, max = PREVIEW_MAX) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function identityKey(identity) {
  return (
    identity?.GaiaID ||
    identity?.gaiaID ||
    identity?.ID ||
    identity?.id ||
    ''
  );
}

/**
 * Dashboard overview derived exclusively from real application data:
 * decrypted inbox mails, real direct chat messages, real public channels and
 * the real GSN node feed / notification unread count. No sample values exist
 * here; an empty account yields honest zeros and an explicit empty activity
 * state.
 */
export default function useDashboardOverview({
  activeIdentity,
  inboxEmails = [],
  chatMessages = [],
  publicChannels = [],
  contacts = [],
  rooms = []
}) {
  const [gsnPosts, setGsnPosts] = useState([]);
  const [gsnUnread, setGsnUnread] = useState(0);
  const [gsnLoaded, setGsnLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const gaiaID = identityKey(activeIdentity);
    const identityId = activeIdentity?.ID || '';
    if (!gaiaID && !identityId) {
      setGsnPosts([]);
      setGsnUnread(0);
      setGsnLoaded(true);
      return undefined;
    }
    setGsnLoaded(false);
    (async () => {
      try {
        const [feed, notificationPayload] = await Promise.all([
          api.getGsnFeedNode().catch(() => []),
          identityId ? api.getGsnNotifications(identityId).catch(() => null) : Promise.resolve(null)
        ]);
        if (cancelled) return;
        setGsnPosts(Array.isArray(feed) ? feed : []);
        setGsnUnread(Number(notificationPayload?.unreadCount) || 0);
      } catch (err) {
        if (!cancelled) {
          console.warn('Dashboard GSN overview unavailable', err);
          setGsnPosts([]);
          setGsnUnread(0);
        }
      } finally {
        if (!cancelled) setGsnLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeIdentity?.ID, activeIdentity?.GaiaID]);

  const ownKeys = useMemo(() => {
    const keys = new Set();
    const gaia = identityKey(activeIdentity);
    if (gaia) keys.add(gaia);
    if (activeIdentity?.ID) keys.add(activeIdentity.ID);
    if (activeIdentity?.GaiaID) keys.add(activeIdentity.GaiaID);
    return keys;
  }, [activeIdentity]);

  const contactNames = useMemo(() => {
    const map = new Map();
    for (const contact of contacts) {
      const gaia = contact?.gaiaID || contact?.GaiaID;
      if (gaia) map.set(gaia.toLowerCase(), contact.displayName || contact.DisplayName || gaia);
    }
    return map;
  }, [contacts]);

  const conversationPartners = useMemo(() => {
    const partners = new Set();
    for (const message of chatMessages) {
      const sender = message?.sender || '';
      const recipient = message?.recipient || '';
      const other = ownKeys.has(sender) ? recipient : sender;
      if (other && !ownKeys.has(other)) partners.add(other);
    }
    return partners;
  }, [chatMessages, ownKeys]);

  const activity = useMemo(() => {
    const items = [];

    for (const mail of inboxEmails) {
      if (!mail) continue;
      if (mail.subject === '[CHAT]') continue;
      const sender = mail.senderGaia || mail.sender || 'Unbekannt';
      items.push({
        id: `mail-${mail.id || parseTimestamp(mail.createdAt)}-${items.length}`,
        icon: 'mail',
        title: 'Neue Mail',
        sub: `${sender}: ${preview(mail.subject || '(Kein Betreff)')}`,
        time: relativeTime(mail.createdAt),
        timestamp: parseTimestamp(mail.createdAt),
        menu: 'inbox'
      });
    }

    for (const message of chatMessages) {
      if (!message?.body) continue;
      const sender = message.sender || '';
      const label = ownKeys.has(sender)
        ? 'Du'
        : contactNames.get(sender.toLowerCase()) || sender;
      items.push({
        id: `chat-${message.id || parseTimestamp(message.createdAt)}-${items.length}`,
        icon: 'chat',
        title: 'Chat-Nachricht',
        sub: `${label}: ${preview(message.body)}`,
        time: relativeTime(message.createdAt),
        timestamp: parseTimestamp(message.createdAt),
        menu: 'chat'
      });
    }

    for (const post of gsnPosts) {
      if (!post?.body) continue;
      items.push({
        id: `gsn-${post.id || parseTimestamp(post.timestamp)}`,
        icon: 'social',
        title: 'GSN-Beitrag',
        sub: `${post.displayName || post.gaiaId || 'Netzwerk'}: ${preview(post.body)}`,
        time: relativeTime(post.timestamp),
        timestamp: parseTimestamp(post.timestamp),
        menu: 'gsn'
      });
    }

    return items
      .filter(item => item.sub)
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, MAX_ACTIVITY);
  }, [inboxEmails, chatMessages, gsnPosts, ownKeys, contactNames]);

  return {
    mailCount: inboxEmails.length,
    chatCount: conversationPartners.size,
    channelCount: publicChannels.length,
    socialCount: gsnPosts.length,
    gsnUnread,
    gsnLoaded,
    roomCount: rooms.length,
    activity
  };
}
