import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../../../api';
import { MAX_POST_CHARS, compressImage, encryptImageBlob } from './channelMedia';

/**
 * State + handler controller for the Public Channels pane.
 *
 * All behaviour is the pre-redesign behaviour, moved out of the render module so
 * both files stay within the 500-line module rule: draft persistence, discovery
 * bootstrap on tab open, governance role probe, report/verify/delete flows,
 * image envelope creation and post/comment mutations.
 */
export default function useChannelsPane({
  activeIdentity,
  activePublicChannel,
  setActivePublicChannel,
  creatorOpen,
  setCreatorOpen,
  contacts,
  createChannel,
  updateChannel,
  createPost,
  togglePostReaction,
  createPostComment,
  togglePostPin,
  updateChannelComments,
  reportChannel,
  deleteChannel,
  verifyChannel,
  showConfirm,
  triggerAlert,
  handleDiscoverChannels,
  publicChannelPosts,
  onVerificationRefresh,
  ct
}) {
  const [mode, setMode] = useState('view');
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('General');
  const [avatarEnvelope, setAvatarEnvelope] = useState(null);
  const [postBody, setPostBody] = useState('');
  const [postAttachments, setPostAttachments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [channelActionsOpen, setChannelActionsOpen] = useState(false);
  const postRef = useRef(null);
  const postsScrollRef = useRef(null);

  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverCategory, setDiscoverCategory] = useState('All');
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');
  const [postSearchText, setPostSearchText] = useState('');
  const [scheduledForInput, setScheduledForInput] = useState('');
  const [commentInputTexts, setCommentInputTexts] = useState({});
  const [expandedCommentPostIds, setExpandedCommentPostIds] = useState({});
  // Server-fresh copy of the open channel after a verification mutation. The
  // parent hook keeps its own list; this override guarantees the pane renders
  // the value the server actually persisted instead of the optimistic value.
  const [channelOverride, setChannelOverride] = useState(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('spam');
  const [reportSeverity, setReportSeverity] = useState('low');
  const [reportComment, setReportComment] = useState('');
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await api.getGovernanceRoles();
        if (res && res.roles) setRoles(res.roles);
      } catch (_) {}
    }
    if (activeIdentity) loadRoles();
  }, [activeIdentity]);

  useEffect(() => {
    if (activePublicChannel?.id) {
      const draft = localStorage.getItem(`gaia_channel_draft_${activePublicChannel.id}`) || '';
      setPostBody(draft);
    } else {
      setPostBody('');
    }
    setPostSearchText('');
  }, [activePublicChannel?.id]);

  useEffect(() => {
    if (postsScrollRef.current) {
      postsScrollRef.current.scrollTop = postsScrollRef.current.scrollHeight;
    }
  }, [activePublicChannel?.id, publicChannelPosts?.length]);

  useEffect(() => {
    if (activeIdentity?.ID && activeTab === 'discover' && !activePublicChannel && handleDiscoverChannels) {
      handleDiscoverChannels(discoverQuery, discoverCategory === 'All' ? '' : discoverCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdentity?.ID, activeTab, activePublicChannel]);

  useEffect(() => {
    if (activePublicChannel) {
      setMode('view');
      setNameInput(activePublicChannel.name || '');
      setDescriptionInput(activePublicChannel.description || '');
      setCategoryInput(activePublicChannel.category || 'General');
      setAvatarEnvelope(activePublicChannel.avatar || null);
    } else if (creatorOpen) {
      setMode('create');
      setNameInput('');
      setDescriptionInput('');
      setCategoryInput('General');
      setAvatarEnvelope(null);
    } else {
      setMode('view');
      setNameInput('');
      setDescriptionInput('');
      setCategoryInput('General');
      setAvatarEnvelope(null);
    }
    setError('');
    setPostBody('');
    setPostAttachments([]);
    setChannelActionsOpen(false);
    setChannelOverride(null);
  }, [activePublicChannel, creatorOpen]);

  const handlePostBodyChange = value => {
    setPostBody(value);
    if (activePublicChannel?.id) {
      localStorage.setItem(`gaia_channel_draft_${activePublicChannel.id}`, value);
    }
  };

  const submitReportHandler = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await reportChannel({
        channelId: activePublicChannel.id,
        category: reportCategory,
        severity: reportSeverity,
        comment: reportComment
      });
      setReportModalOpen(false);
      setReportComment('');
      triggerAlert(ct('report_sent_title'), ct('report_sent_desc'));
    } catch (err) {
      setError(err.message || ct('report_failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleDiscoverCategory = category => {
    setDiscoverCategory(category);
    setMobileCategoryOpen(false);
    handleDiscoverChannels(discoverQuery, category === 'All' ? '' : category);
  };

  const handleReturnToChannelOverview = () => {
    setChannelActionsOpen(false);
    setReportModalOpen(false);
    setMobileCategoryOpen(false);
    setMode('view');
    setActiveTab('discover');
    if (setCreatorOpen) setCreatorOpen(false);
    if (setActivePublicChannel) setActivePublicChannel(null);
    if (activeIdentity?.ID && handleDiscoverChannels) {
      handleDiscoverChannels(discoverQuery, discoverCategory === 'All' ? '' : discoverCategory);
    }
  };

  const handleToggleVerification = async () => {
    if (!activeIdentity || !activePublicChannel || !verifyChannel) return;
    setBusy(true);
    setError('');
    const targetVal = !activePublicChannel.isVerified;
    try {
      await verifyChannel(activePublicChannel.id, targetVal);
      await refreshChannelFromServer(activePublicChannel.id);
      if (onVerificationRefresh) await onVerificationRefresh();
      triggerAlert(targetVal ? ct('certified') : ct('decertified'), ct('channel_status_updated'));
    } catch (err) {
      setError(err.message || ct('action_failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteChannelClick = () => {
    if (!activePublicChannel || !showConfirm) return;
    showConfirm(
      ct('confirm_delete_title'),
      ct('confirm_delete_desc'),
      async () => {
        setBusy(true);
        setError('');
        try {
          await deleteChannel(activePublicChannel.id);
        } catch (err) {
          setError(err.message || ct('delete_failed'));
        } finally {
          setBusy(false);
        }
      },
      null,
      ct('delete_channel'),
      ct('cancel'),
      true
    );
  };

  const wrapSelection = (before, after = before) => {
    const input = postRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = postBody.slice(start, end) || 'text';
    const next = `${postBody.slice(0, start)}${before}${selected}${after}${postBody.slice(end)}`;
    handlePostBodyChange(next.slice(0, MAX_POST_CHARS));
    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const handleAvatarFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImage(file, 640, 0.72);
      const encrypted = await encryptImageBlob(compressed, file.name);
      setAvatarEnvelope(encrypted);
    } catch (err) {
      setError(err.message || 'Avatar image could not be processed.');
    } finally {
      event.target.value = '';
    }
  };

  const handlePostImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImage(file);
      const encrypted = await encryptImageBlob(compressed, file.name);
      setPostAttachments(prev => [encrypted, ...prev].slice(0, 1));
    } catch (err) {
      setError(err.message || 'Image could not be processed.');
    } finally {
      event.target.value = '';
    }
  };

  const submitChannel = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'edit' && activePublicChannel) {
        await updateChannel({
          channelId: activePublicChannel.id,
          name: nameInput,
          description: descriptionInput,
          category: categoryInput,
          avatar: avatarEnvelope
        });
        setMode('view');
        if (setCreatorOpen) setCreatorOpen(false);
      } else {
        await createChannel({
          name: nameInput,
          description: descriptionInput,
          category: categoryInput,
          avatar: avatarEnvelope
        });
        if (setCreatorOpen) setCreatorOpen(false);
      }
    } catch (err) {
      setError(err.message || ct('save_failed'));
    } finally {
      setBusy(false);
    }
  };

  const submitPost = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const scheduledFor = scheduledForInput ? new Date(scheduledForInput).toISOString() : '';
      await createPost({
        body: postBody,
        attachments: postAttachments.length > 0 ? postAttachments : null,
        scheduledFor
      });
      setPostBody('');
      setPostAttachments([]);
      setScheduledForInput('');
      if (activePublicChannel?.id) {
        localStorage.removeItem(`gaia_channel_draft_${activePublicChannel.id}`);
      }
    } catch (err) {
      setError(err.message || 'Post could not be published.');
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePinPost = async post => {
    if (!togglePostPin) return;
    setError('');
    try {
      await togglePostPin(post.id, !post.isPinned);
    } catch (err) {
      setError(err.message || 'Pin-Status konnte nicht gespeichert werden.');
    }
  };

  const handleToggleComments = async () => {
    if (!activePublicChannel || !updateChannelComments) return;
    setBusy(true);
    setError('');
    try {
      await updateChannelComments(activePublicChannel.id, activePublicChannel.commentsEnabled === false);
    } catch (err) {
      setError(err.message || 'Kommentarstatus konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const handleReactToPost = async (postId, reactionToken) => {
    if (!togglePostReaction) return;
    setError('');
    try {
      await togglePostReaction(postId, reactionToken);
    } catch (err) {
      setError(err.message || 'Reaktion konnte nicht gespeichert werden.');
    }
  };

  const handleAddComment = async (postId, event) => {
    event.preventDefault();
    const text = commentInputTexts[postId] || '';
    if (!text.trim() || !createPostComment) return;
    setError('');
    try {
      await createPostComment(postId, text.trim());
      setCommentInputTexts(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      setError(err.message || 'Kommentar konnte nicht gespeichert werden.');
    }
  };

  const isOperator = roles.includes('node_operator');
  const channelOwner = activePublicChannel && contacts?.find(
    contact => contact.ID === activePublicChannel.createdBy || contact.gaiaID === activePublicChannel.createdBy
  );
  const ownerDisplayName = channelOwner ? channelOwner.displayName : ct('default_owner');

  // Server truth for the open channel: `isVerified` is persisted in
  // public_channels.is_verified and only the role-gated node-operator action
  // changes it. Refetching the channel list after that action replaces the
  // optimistic local guess with the persisted value.
  const overrideMatchesChannel =
    Boolean(channelOverride) && Boolean(activePublicChannel) && channelOverride.id === activePublicChannel.id;
  const displayChannel = activePublicChannel
    ? (overrideMatchesChannel ? { ...activePublicChannel, ...channelOverride } : activePublicChannel)
    : null;

  const refreshChannelFromServer = useCallback(async channelId => {
    if (!channelId) return null;
    try {
      const result = await api.getPublicChannels();
      const channels = Array.isArray(result?.channels) ? result.channels : [];
      const fresh = channels.find(channel => channel.id === channelId);
      if (fresh) {
        setChannelOverride(fresh);
        return fresh;
      }
      setError('Kanal konnte nach der Änderung nicht erneut geladen werden.');
      return null;
    } catch (err) {
      setError(err.message || 'Kanalstatus konnte nicht vom Server geladen werden.');
      return null;
    }
  }, []);

  const filteredPosts = (publicChannelPosts || []).filter(post => {
    if (!postSearchText) return true;
    const query = postSearchText.toLowerCase();
    return post.body && post.body.toLowerCase().includes(query);
  });

  const visiblePosts = [...filteredPosts].sort((a, b) => {
    const aPinned = !!a.isPinned;
    const bPinned = !!b.isPinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return {
    mode, setMode, nameInput, setNameInput, descriptionInput, setDescriptionInput,
    categoryInput, setCategoryInput, avatarEnvelope,
    postBody, handlePostBodyChange, postAttachments, busy, error, setError,
    postRef, postsScrollRef,
    discoverQuery, setDiscoverQuery, discoverCategory, mobileCategoryOpen, setMobileCategoryOpen,
    activeTab, setActiveTab, postSearchText, setPostSearchText,
    scheduledForInput, setScheduledForInput,
    commentInputTexts, setCommentInputTexts, expandedCommentPostIds, setExpandedCommentPostIds,
    channelActionsOpen, setChannelActionsOpen,
    reportModalOpen, setReportModalOpen, reportCategory, setReportCategory,
    reportSeverity, setReportSeverity, reportComment, setReportComment, submitReportHandler,
    handleDiscoverCategory, handleReturnToChannelOverview, handleToggleVerification,
    handleDeleteChannelClick, wrapSelection, handleAvatarFile, handlePostImage,
    submitChannel, submitPost, handleTogglePinPost, handleToggleComments,
    handleReactToPost, handleAddComment,
    isOperator, ownerDisplayName, displayChannel, refreshChannelFromServer, visiblePosts, filteredCount: filteredPosts.length
  };
}
