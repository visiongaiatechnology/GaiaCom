// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api';
import { safeStorageJson } from '../utils/safeJson';

export default function usePublicChannels({ activeIdentity, user, triggerAlert, enabled = false }) {
  const [publicChannels, setPublicChannels] = useState([]);
  const [activePublicChannel, setActivePublicChannel] = useState(null);
  const [publicChannelPosts, setPublicChannelPosts] = useState([]);
  const [publicChannelsError, setPublicChannelsError] = useState('');
  const [publicChannelsLoading, setPublicChannelsLoading] = useState(false);
  const [publicChannelPostsLoading, setPublicChannelPostsLoading] = useState(false);
  const notificationPrimedRef = useRef(false);

  const refreshPublicChannels = useCallback(async () => {
    if (!user || !enabled) return;
    setPublicChannelsError('');
    setPublicChannelsLoading(true);
    try {
      const result = await api.getPublicChannels();
      const channels = Array.isArray(result?.channels) ? result.channels : [];
      setPublicChannels(channels);
      setActivePublicChannel(prev => {
        if (!prev) return prev;
        return channels.find(channel => channel.id === prev.id) || prev;
      });
    } catch (error) {
      setPublicChannelsError(error.message || 'Could not load channels.');
    } finally {
      setPublicChannelsLoading(false);
    }
  }, [enabled, user]);

  const refreshPublicChannelPosts = useCallback(async channelId => {
    if (!channelId) {
      setPublicChannelPosts([]);
      return;
    }
    setPublicChannelPostsLoading(true);
    try {
      const result = await api.getPublicChannelPosts(channelId, 80, activeIdentity?.ID || '');
      const posts = Array.isArray(result?.posts) ? result.posts : [];
      setPublicChannelPosts(posts.slice().reverse());
    } catch (error) {
      triggerAlert('Posts unavailable', error.message || 'Could not load channel posts.', 'danger');
    } finally {
      setPublicChannelPostsLoading(false);
    }
  }, [activeIdentity?.ID, triggerAlert]);

  useEffect(() => {
    if (!enabled) return;
    refreshPublicChannels();
  }, [enabled, refreshPublicChannels]);

  useEffect(() => {
    refreshPublicChannelPosts(activePublicChannel?.id);
  }, [activePublicChannel?.id, refreshPublicChannelPosts]);

  useEffect(() => {
    if (!enabled || !user || !activeIdentity || publicChannels.length === 0) return undefined;
    const storageKey = `gaiacom_public_channel_seen_${user.id}`;
    const readSeen = () => {
      return safeStorageJson(localStorage, storageKey, {});
    };
    const writeSeen = value => {
      localStorage.setItem(storageKey, JSON.stringify(value));
    };
    const pollSubscribedChannels = async () => {
      const subscribed = publicChannels.filter(channel => channel.isSubscribed);
      if (subscribed.length === 0) return;
      const seen = readSeen();
      let changed = false;
      for (const channel of subscribed) {
        try {
          const result = await api.getPublicChannelPosts(channel.id, 5, activeIdentity.ID);
          const posts = Array.isArray(result?.posts) ? result.posts : [];
          const newest = posts[0];
          if (!newest?.id) continue;
          const previous = seen[channel.id];
          if (previous && previous !== newest.id && notificationPrimedRef.current) {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(channel.name || 'GaiaCom Channel', {
                body: newest.body ? newest.body.slice(0, 90) : 'New encrypted channel update'
              });
            }
          }
          if (previous !== newest.id) {
            seen[channel.id] = newest.id;
            changed = true;
          }
        } catch (_) {}
      }
      if (changed) {
        writeSeen(seen);
      }
      notificationPrimedRef.current = true;
    };
    pollSubscribedChannels();
    const interval = window.setInterval(pollSubscribedChannels, 10000);
    return () => window.clearInterval(interval);
  }, [activeIdentity, enabled, publicChannels, user]);

  const [discoverResults, setDiscoverResults] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  const createChannel = useCallback(async ({ name, description, category, avatar }) => {
    if (!activeIdentity?.ID) throw new Error('Active identity required.');
    const channel = await api.createPublicChannel(activeIdentity.ID, name, description, category, avatar || null);
    await refreshPublicChannels();
    setActivePublicChannel(channel);
    triggerAlert('Channel created', `"${channel.name}" is now public.`);
  }, [activeIdentity, refreshPublicChannels, triggerAlert]);

  const updateChannel = useCallback(async ({ channelId, name, description, category, avatar }) => {
    const channel = await api.updatePublicChannel(channelId, name, description, category, avatar || null);
    await refreshPublicChannels();
    setActivePublicChannel(channel);
    triggerAlert('Channel updated', 'Channel metadata was saved.');
  }, [refreshPublicChannels, triggerAlert]);

  const updateChannelComments = useCallback(async (channelId, commentsEnabled) => {
    const channel = await api.updatePublicChannelComments(channelId, commentsEnabled);
    setPublicChannels(prev => prev.map(item => item.id === channel.id ? channel : item));
    setActivePublicChannel(prev => prev?.id === channel.id ? channel : prev);
    triggerAlert(
      commentsEnabled ? 'Kommentare aktiviert' : 'Kommentare deaktiviert',
      commentsEnabled ? 'Neue Kommentare sind fuer diesen Kanal erlaubt.' : 'Neue Kommentare sind fuer diesen Kanal gesperrt.'
    );
    return channel;
  }, [triggerAlert]);

  const toggleSubscription = useCallback(async channel => {
    if (!activeIdentity?.ID || !channel?.id) return;
    const updated = channel.isSubscribed
      ? await api.unsubscribePublicChannel(activeIdentity.ID, channel.id)
      : await api.subscribePublicChannel(activeIdentity.ID, channel.id);
    setPublicChannels(prev => prev.map(item => item.id === updated.id ? updated : item));
    setActivePublicChannel(prev => prev?.id === updated.id ? updated : prev);
    triggerAlert(
      updated.isSubscribed ? 'Subscribed' : 'Unsubscribed',
      updated.isSubscribed ? `You subscribed to "${updated.name}".` : `You unsubscribed from "${updated.name}".`
    );
  }, [activeIdentity, triggerAlert]);

  const createPost = useCallback(async ({ body, attachments, scheduledFor }) => {
    if (!activeIdentity?.ID || !activePublicChannel?.id) throw new Error('Channel and identity required.');
    const post = await api.createPublicChannelPost(
      activeIdentity.ID,
      activePublicChannel.id,
      body,
      { mode: 'markdown-lite' },
      attachments || null,
      scheduledFor || ''
    );
    if (!scheduledFor) {
      setPublicChannelPosts(prev => [...prev, post]);
    }
    await refreshPublicChannelPosts(activePublicChannel.id);
    await refreshPublicChannels();
    triggerAlert(
      scheduledFor ? 'Beitrag geplant' : 'Published',
      scheduledFor ? 'Beitrag wurde erfolgreich geplant.' : 'Channel post published.'
    );
  }, [activeIdentity, activePublicChannel, refreshPublicChannelPosts, refreshPublicChannels, triggerAlert]);

  const togglePostReaction = useCallback(async (postId, emoji) => {
    if (!activeIdentity?.ID || !postId) throw new Error('Channel post and identity required.');
    const state = await api.togglePublicChannelPostReaction(activeIdentity.ID, postId, emoji);
    setPublicChannelPosts(prev => prev.map(post => (
      post.id === postId ? { ...post, reactionState: state } : post
    )));
    return state;
  }, [activeIdentity]);

  const createPostComment = useCallback(async (postId, body) => {
    if (!activeIdentity?.ID || !postId) throw new Error('Channel post and identity required.');
    const comment = await api.createPublicChannelPostComment(activeIdentity.ID, postId, body);
    setPublicChannelPosts(prev => prev.map(post => (
      post.id === postId ? { ...post, comments: [...(post.comments || []), comment] } : post
    )));
    return comment;
  }, [activeIdentity]);

  const togglePostPin = useCallback(async (postId, pinned) => {
    if (!postId) throw new Error('Channel post required.');
    const updated = await api.updatePublicChannelPostPin(postId, pinned);
    setPublicChannelPosts(prev => prev.map(post => (
      post.id === postId ? { ...post, isPinned: updated.isPinned, pinnedAt: updated.pinnedAt } : post
    )));
    return updated;
  }, []);

  const reportChannel = useCallback(async ({ channelId, category, severity, comment }) => {
    if (!activeIdentity?.ID) throw new Error('Active identity required.');
    await api.submitAbuseReport(activeIdentity.ID, 'channel', channelId, category, severity, null, comment);
    triggerAlert('Meldung eingereicht', 'Kanalmeldung wurde im Abuse-Consensus registriert.');
  }, [activeIdentity, triggerAlert]);

  const deleteChannel = useCallback(async (channelId) => {
    await api.deletePublicChannel(channelId);
    await refreshPublicChannels();
    setActivePublicChannel(null);
    triggerAlert('Kanal gelöscht', 'Der öffentliche Kanal wurde erfolgreich gelöscht.');
  }, [refreshPublicChannels, triggerAlert]);

  const verifyChannel = useCallback(async (channelId, verified) => {
    if (!activeIdentity?.ID) throw new Error('Active identity required.');
    await api.applyNodeOperatorAction(
      activeIdentity.ID,
      'verify_channel',
      channelId,
      verified,
      'Zertifizierung'
    );
    setPublicChannels(prev => prev.map(item => {
      if (item.id === channelId) {
        return { ...item, isVerified: verified };
      }
      return item;
    }));
    setActivePublicChannel(prev => {
      if (prev && prev.id === channelId) {
        return { ...prev, isVerified: verified };
      }
      return prev;
    });
    triggerAlert('Erfolg', verified ? 'Kanal wurde zertifiziert.' : 'Zertifizierung wurde entzogen.');
  }, [activeIdentity, triggerAlert]);

  const handleBlockChannel = useCallback(async channelId => {
    if (!activeIdentity?.ID || !channelId) return;
    try {
      await api.blockPublicChannel(activeIdentity.ID, channelId);
      setPublicChannels(prev => prev.filter(c => c.id !== channelId));
      if (activePublicChannel?.id === channelId) {
        setActivePublicChannel(null);
      }
      setDiscoverResults(prev => prev.filter(c => c.id !== channelId));
      triggerAlert('Blockiert', 'Kanal wurde blockiert.');
    } catch (error) {
      triggerAlert('Fehler', error.message || 'Kanal blockieren fehlgeschlagen.', 'danger');
    }
  }, [activeIdentity, activePublicChannel, triggerAlert]);

  const handleUnblockChannel = useCallback(async channelId => {
    if (!activeIdentity?.ID || !channelId) return;
    try {
      await api.unblockPublicChannel(activeIdentity.ID, channelId);
      triggerAlert('Entblockt', 'Kanal-Blockierung wurde aufgehoben.');
    } catch (error) {
      triggerAlert('Fehler', error.message || 'Kanal entblocken fehlgeschlagen.', 'danger');
    }
  }, [activeIdentity, triggerAlert]);

  const handleDiscoverChannels = useCallback(async (query, category) => {
    if (!activeIdentity?.ID) return;
    setDiscoverLoading(true);
    try {
      const result = await api.discoverPublicChannels(activeIdentity.ID, query, category);
      const list = Array.isArray(result?.channels) ? result.channels : [];
      setDiscoverResults(list);
    } catch (error) {
      triggerAlert('Fehler', error.message || 'Kanalsuche fehlgeschlagen.', 'danger');
    } finally {
      setDiscoverLoading(false);
    }
  }, [activeIdentity, triggerAlert]);

  const handleDeleteComment = useCallback(async (postId, commentId) => {
    try {
      await api.deleteChannelComment(commentId);
      setPublicChannelPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: (post.comments || []).filter(c => c.id !== commentId)
          };
        }
        return post;
      }));
      triggerAlert('Gelöscht', 'Kommentar wurde gelöscht.');
    } catch (error) {
      triggerAlert('Fehler', error.message || 'Kommentar löschen fehlgeschlagen.', 'danger');
    }
  }, [triggerAlert]);

  const handleModerateComment = useCallback(async (postId, commentId, status) => {
    try {
      await api.moderateChannelComment(commentId, status);
      setPublicChannelPosts(prev => prev.map(post => {
        if (post.id === postId) {
          if (status === 'deleted' || status === 'hidden') {
            return {
              ...post,
              comments: (post.comments || []).filter(c => c.id !== commentId)
            };
          } else {
            return {
              ...post,
              comments: (post.comments || []).map(c => c.id === commentId ? { ...c, status } : c)
            };
          }
        }
        return post;
      }));
      triggerAlert('Moderiert', `Kommentar-Status auf "${status}" gesetzt.`);
    } catch (error) {
      triggerAlert('Fehler', error.message || 'Kommentar moderieren fehlgeschlagen.', 'danger');
    }
  }, [triggerAlert]);

  return {
    publicChannels,
    setPublicChannels,
    activePublicChannel,
    setActivePublicChannel,
    publicChannelPosts,
    publicChannelsError,
    publicChannelsLoading,
    publicChannelPostsLoading,
    refreshPublicChannels,
    refreshPublicChannelPosts,
    createChannel,
    updateChannel,
    updateChannelComments,
    toggleSubscription,
    createPost,
    togglePostReaction,
    createPostComment,
    togglePostPin,
    reportChannel,
    deleteChannel,
    verifyChannel,
    discoverResults,
    discoverLoading,
    handleBlockChannel,
    handleUnblockChannel,
    handleDiscoverChannels,
    handleDeleteComment,
    handleModerateComment
  };
}
