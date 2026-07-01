// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
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

  useEffect(() => {
    if (activeIdentity && activeIdentity.GaiaID) {
      api.getGsnProfile(activeIdentity.GaiaID)
        .then(response => {
          if (response && response.profile) {
            setMyProfile(response.profile);
          }
        })
        .catch(err => {
          console.error('Fehler beim Laden des eigenen GSN Profils', err);
        });
    } else {
      setMyProfile(null);
    }
  }, [activeIdentity]);

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

  const deleteComment = useCallback(async (postId, commentId) => {
    await api.deleteGsnComment(postId, commentId);
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
    setActiveProfile
  };
}
