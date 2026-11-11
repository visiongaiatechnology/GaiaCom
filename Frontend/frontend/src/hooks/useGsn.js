import { useCallback, useState, useEffect } from 'react';
import * as api from '../api';
import * as crypto from '../crypto';

export default function useGsn({ activeIdentity, derivedKeys, triggerAlert }) {
  const [nodeFeed, setNodeFeed] = useState([]);
  const [followingFeed, setFollowingFeed] = useState([]);
  const [loadingNodeFeed, setLoadingNodeFeed] = useState(false);
  const [loadingFollowingFeed, setLoadingFollowingFeed] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeComments, setActiveComments] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [trends, setTrends] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendsError, setTrendsError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [network, setNetwork] = useState({ followers: [], following: [] });
  const [loadingNetwork, setLoadingNetwork] = useState(false);
  const [networkError, setNetworkError] = useState('');

  const fetchMyProfile = useCallback(async () => {
    if (!activeIdentity || !activeIdentity.GaiaID) {
      setMyProfile(null);
      return null;
    }
    try {
      const response = await api.getGsnProfile(activeIdentity.GaiaID);
      if (response && response.profile) {
        setMyProfile(response.profile);
        return response.profile;
      }
    } catch (err) {
      console.error('Failed to load own GSN profile', err);
    }
    return null;
  }, [activeIdentity]);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  const fetchNodeFeed = useCallback(async (nodeId = '') => {
    setLoadingNodeFeed(true);
    try {
      const feed = await api.getGsnFeedNode(nodeId);
      setNodeFeed(Array.isArray(feed) ? feed : []);
    } catch (err) {
      triggerAlert('Fehler beim Laden des Node feeds', err.message, 'danger');
    } finally {
      setLoadingNodeFeed(false);
    }
  }, [triggerAlert]);

  const fetchFollowingFeed = useCallback(async () => {
    setLoadingFollowingFeed(true);
    try {
      const feed = await api.getGsnFeedFollowing();
      setFollowingFeed(Array.isArray(feed) ? feed : []);
    } catch (err) {
      triggerAlert('Fehler beim Laden des Following feeds', err.message, 'danger');
    } finally {
      setLoadingFollowingFeed(false);
    }
  }, [triggerAlert]);

  const createPost = useCallback(async (body, imageAttachment = '', repostOfPostId = '') => {
    if (!activeIdentity || !derivedKeys) {
      throw new Error('Aktive Identität und Schlüssel benötigt.');
    }

    const timestamp = new Date().toISOString();
    // String template matching backend validation: timestamp:body:image:repost
    const msg = `${timestamp}:${body}:${imageAttachment}:${repostOfPostId}`;
    let signature;
    try {
      signature = crypto.signGsnMessage(msg, derivedKeys.sign.private);
    } catch (err) {
      throw new Error(`Fehler bei der Signierung des Beitrags: ${err.message}`);
    }

    const newPost = await api.createGsnPost(
      activeIdentity.ID,
      body,
      imageAttachment,
      signature,
      repostOfPostId,
      timestamp
    );

    // Refresh node feed
    await fetchNodeFeed();
    return newPost;
  }, [activeIdentity, derivedKeys, fetchNodeFeed]);

  const deletePost = useCallback(async (postId) => {
    await api.deleteGsnPost(postId);
    setNodeFeed(prev => prev.filter(post => post.id !== postId));
    setFollowingFeed(prev => prev.filter(post => post.id !== postId));
    triggerAlert('Erfolg', 'Beitrag wurde gelöscht.');
  }, [triggerAlert]);

  const reactToPost = useCallback(async (postId, emoji) => {
    if (!activeIdentity) throw new Error('Aktive Identität benötigt.');
    const result = await api.reactToGsnPost(postId, activeIdentity.ID, emoji);
    const updater = posts => posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          reactions: result.reactions,
          reactedByMe: result.reactedByMe
        };
      }
      return post;
    });

    setNodeFeed(updater);
    setFollowingFeed(updater);
    return result;
  }, [activeIdentity]);

  const fetchComments = useCallback(async (postId) => {
    setLoadingComments(true);
    try {
      const comments = await api.getGsnComments(postId);
      setActiveComments(prev => ({
        ...prev,
        [postId]: Array.isArray(comments) ? comments : []
      }));
    } catch (err) {
      triggerAlert('Fehler beim Laden der Kommentare', err.message, 'danger');
    } finally {
      setLoadingComments(false);
    }
  }, [triggerAlert]);

  const addComment = useCallback(async (postId, body) => {
    if (!activeIdentity || !derivedKeys) {
      throw new Error('Aktive Identität und Schlüssel benötigt.');
    }

    const timestamp = new Date().toISOString();
    // String template matching backend validation: timestamp:postId:body
    const msg = `${timestamp}:${postId}:${body}`;
    let signature;
    try {
      signature = crypto.signGsnMessage(msg, derivedKeys.sign.private);
    } catch (err) {
      throw new Error(`Fehler bei der Signierung des Kommentars: ${err.message}`);
    }

    const comment = await api.addGsnComment(postId, activeIdentity.ID, body, signature, timestamp);

    // Update comments locally
    setActiveComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), comment]
    }));

    // Update commentCount on feeds
    const incrementCommentCount = posts => posts.map(post => {
      if (post.id === postId) {
        return { ...post, commentCount: (post.commentCount || 0) + 1 };
      }
      return post;
    });
    setNodeFeed(incrementCommentCount);
    setFollowingFeed(incrementCommentCount);

    return comment;
  }, [activeIdentity, derivedKeys]);

  const fetchProfile = useCallback(async (gaiaId) => {
    setLoadingProfile(true);
    try {
      const response = await api.getGsnProfile(gaiaId);
      if (response && response.profile) {
        setActiveProfile({
          ...response.profile,
          isFollowing: !!response.isFollowing
        });
      }
    } catch (err) {
      triggerAlert('Profil konnte nicht geladen werden', err.message, 'danger');
    } finally {
      setLoadingProfile(false);
    }
  }, [triggerAlert]);

  const followUser = useCallback(async (followingGaiaId) => {
    if (!activeIdentity) throw new Error('Aktive Identität benötigt.');
    await api.followGsnUser(activeIdentity.ID, followingGaiaId);
    if (activeProfile && activeProfile.gaiaId === followingGaiaId) {
      setActiveProfile(prev => prev ? {
        ...prev,
        isFollowing: true,
        followersCount: (prev.followersCount || 0) + 1
      } : null);
    }
    triggerAlert('Erfolg', `Du folgst jetzt ${followingGaiaId}`);
  }, [activeIdentity, activeProfile, triggerAlert]);

  const unfollowUser = useCallback(async (followingGaiaId) => {
    if (!activeIdentity) throw new Error('Aktive Identität benötigt.');
    await api.unfollowGsnUser(activeIdentity.ID, followingGaiaId);
    if (activeProfile && activeProfile.gaiaId === followingGaiaId) {
      setActiveProfile(prev => prev ? {
        ...prev,
        isFollowing: false,
        followersCount: Math.max(0, (prev.followersCount || 0) - 1)
      } : null);
    }
    triggerAlert('Erfolg', `Du folgst ${followingGaiaId} nicht mehr`);
  }, [activeIdentity, activeProfile, triggerAlert]);

  const updateProfile = useCallback(async ({ realName, displayName, description, avatar, website }) => {
    if (!activeIdentity) throw new Error('Aktive Identität benötigt.');
    const updated = await api.updateGsnProfile(
      activeIdentity.ID,
      displayName,
      description,
      avatar,
      website,
      realName
    );
    if (activeProfile && activeProfile.gaiaId === activeIdentity.GaiaID) {
      setActiveProfile(prev => prev ? { ...prev, ...updated } : updated);
    }
    setMyProfile(updated);
    triggerAlert('Profil aktualisiert', 'Dein GSN-Profil wurde erfolgreich aktualisiert.');
    return updated;
  }, [activeIdentity, activeProfile, triggerAlert]);

  const fetchNotifications = useCallback(async () => {
    if (!activeIdentity || !activeIdentity.ID) {
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }
    setLoadingNotifications(true);
    setNotificationsError('');
    try {
      const response = await api.getGsnNotifications(activeIdentity.ID);
      setNotifications(Array.isArray(response?.items) ? response.items : []);
      setUnreadNotifications(Number(response?.unreadCount) || 0);
    } catch (err) {
      setNotifications([]);
      setUnreadNotifications(0);
      setNotificationsError('Benachrichtigungen konnten nicht geladen werden.');
      console.warn('GSN notifications unavailable', err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [activeIdentity]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!activeIdentity || !activeIdentity.ID) return;
    try {
      await api.markGsnNotificationsRead(activeIdentity.ID);
      setNotifications(prev => prev.map(item => ({ ...item, read: true })));
      setUnreadNotifications(0);
    } catch (err) {
      console.warn('GSN notification read failed', err);
      throw err;
    }
  }, [activeIdentity]);

  const fetchTrends = useCallback(async (windowHours = 168) => {
    setLoadingTrends(true);
    setTrendsError('');
    try {
      const response = await api.getGsnTrends(windowHours);
      setTrends(Array.isArray(response?.items) ? response.items : []);
    } catch (err) {
      setTrends([]);
      setTrendsError('Trends konnten nicht geladen werden.');
      console.warn('GSN trends unavailable', err);
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async (limit = 5) => {
    if (!activeIdentity || !activeIdentity.ID) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    setSuggestionsError('');
    try {
      const response = await api.getGsnSuggestions(activeIdentity.ID, limit);
      setSuggestions(Array.isArray(response?.items) ? response.items : []);
    } catch (err) {
      setSuggestions([]);
      setSuggestionsError('Empfehlungen konnten nicht geladen werden.');
      console.warn('GSN suggestions unavailable', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [activeIdentity]);

  const fetchNetwork = useCallback(async () => {
    if (!activeIdentity || !activeIdentity.ID) {
      setNetwork({ followers: [], following: [] });
      return;
    }
    setLoadingNetwork(true);
    setNetworkError('');
    try {
      const response = await api.getGsnNetwork(activeIdentity.ID);
      setNetwork({
        followers: Array.isArray(response?.followers) ? response.followers : [],
        following: Array.isArray(response?.following) ? response.following : []
      });
    } catch (err) {
      setNetwork({ followers: [], following: [] });
      setNetworkError('Netzwerk konnte nicht geladen werden.');
      console.warn('GSN network unavailable', err);
    } finally {
      setLoadingNetwork(false);
    }
  }, [activeIdentity]);

  const deleteComment = useCallback(async (postId, commentId) => {    await api.deleteGsnComment(postId, commentId);
    setActiveComments(prev => {
      const postComments = prev[postId] || [];
      return {
        ...prev,
        [postId]: postComments.filter(c => c.id !== commentId)
      };
    });

    const decrementCommentCount = posts => posts.map(post => {
      if (post.id === postId) {
        return { ...post, commentCount: Math.max(0, (post.commentCount || 0) - 1) };
      }
      return post;
    });
    setNodeFeed(decrementCommentCount);
    setFollowingFeed(decrementCommentCount);
  }, []);

  return {
    nodeFeed,
    followingFeed,
    loadingNodeFeed,
    loadingFollowingFeed,
    activeProfile,
    loadingProfile,
    activeComments,
    loadingComments,
    myProfile,
    fetchNodeFeed,
    fetchFollowingFeed,
    createPost,
    deletePost,
    reactToPost,
    addComment,
    deleteComment,
    fetchComments,
    followUser,
    unfollowUser,
    fetchProfile,
    updateProfile,
    setActiveProfile,
    fetchMyProfile,
    notifications,
    unreadNotifications,
    loadingNotifications,
    notificationsError,
    fetchNotifications,
    markAllNotificationsRead,
    trends,
    loadingTrends,
    trendsError,
    fetchTrends,
    suggestions,
    loadingSuggestions,
    suggestionsError,
    fetchSuggestions,
    network,
    loadingNetwork,
    networkError,
    fetchNetwork
  };
}
