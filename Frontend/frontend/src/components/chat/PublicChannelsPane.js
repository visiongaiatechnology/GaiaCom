// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useEffect, useRef } from 'react';
import { renderMarkdown } from '../../utils/markdown';
import * as api from '../../api';
import { useTranslation } from '../../utils/i18n';
import { channelTranslations } from '../../utils/channelsTranslations';

const MAX_POST_CHARS = 3000;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToArrayBuffer(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function compressImage(file, maxSide = 1280, quality = 0.76) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image compression failed.')), 'image/webp', quality);
  });
  bitmap.close?.();
  return blob;
}

async function encryptImageBlob(blob, name) {
  const keyBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, await blob.arrayBuffer());
  return {
    type: 'encrypted-image',
    algorithm: 'AES-256-GCM',
    name,
    mime: 'image/webp',
    size: blob.size,
    iv: arrayBufferToBase64(iv.buffer),
    key: arrayBufferToBase64(keyBytes.buffer),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
}

function useDecryptedImage(attachment) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let revoked = '';
    let mounted = true;
    async function decrypt() {
      if (!attachment?.ciphertext || !attachment?.key || !attachment?.iv) {
        setUrl('');
        return;
      }
      try {
        const keyBytes = base64ToArrayBuffer(attachment.key);
        const iv = new Uint8Array(base64ToArrayBuffer(attachment.iv));
        const ciphertext = base64ToArrayBuffer(attachment.ciphertext);
        const cryptoKey = await window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
        const plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
        const objectUrl = URL.createObjectURL(new Blob([plain], { type: attachment.mime || 'image/webp' }));
        revoked = objectUrl;
        if (mounted) {
          setUrl(objectUrl);
        }
      } catch (_) {
        if (mounted) {
          setUrl('');
        }
      }
    }
    decrypt();
    return () => {
      mounted = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [attachment]);

  return url;
}

function ChannelAvatar({ avatar, name }) {
  const avatarObject = avatar && typeof avatar === 'object' ? avatar : null;
  const url = useDecryptedImage(avatarObject?.type === 'encrypted-image' ? avatarObject : null);
  if (url) {
    return <img src={url} alt="" />;
  }
  return <span>{String(name || 'C').slice(0, 1).toUpperCase()}</span>;
}

function EncryptedImage({ attachment }) {
  const url = useDecryptedImage(attachment);
  if (!url) {
    return <div className="public-channel-image-placeholder">Encrypted image preview unavailable</div>;
  }
  return <img className="public-channel-post-image" src={url} alt={attachment.name || 'Channel attachment'} />;
}

function formatChannelDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const PublicChannelsPane = ({
  activeIdentity,
  activePublicChannel,
  setActivePublicChannel,
  creatorOpen,
  setCreatorOpen,
  publicChannelPosts,
  publicChannelsError,
  publicChannelPostsLoading,
  createChannel,
  updateChannel,
  toggleSubscription,
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
  setMobileMenuOpen,
  contacts,
  discoverResults = [],
  discoverLoading = false,
  handleBlockChannel,
  handleUnblockChannel,
  handleDiscoverChannels,
  handleDeleteComment,
  handleModerateComment
}) => {
  const { language } = useTranslation();
  const ct = (key) => {
    const dict = channelTranslations[language] || channelTranslations.de;
    return dict[key] || channelTranslations.de[key] || key;
  };
  const categoryLabel = (category) => ct(`category_${String(category).toLowerCase()}`);

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

  // Discovery / Block states
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverCategory, setDiscoverCategory] = useState('All');
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');

  // Search inside channel
  const [postSearchText, setPostSearchText] = useState('');

  // Scheduled posts input
  const [scheduledForInput, setScheduledForInput] = useState('');

  // Verified Operators from governance.json
  const [govOperators, setGovOperators] = useState([]);

  // Local-only view state. Post reactions/comments are server-backed.
  const [commentInputTexts, setCommentInputTexts] = useState({});
  const [expandedCommentPostIds, setExpandedCommentPostIds] = useState({});

  useEffect(() => {
    fetch('/governance.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.operators) {
          setGovOperators(data.operators);
        }
      })
      .catch(() => {});
  }, []);

  // Reporting states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('spam');
  const [reportSeverity, setReportSeverity] = useState('low');
  const [reportComment, setReportComment] = useState('');

  const submitReportHandler = async (e) => {
    e.preventDefault();
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

  const [roles, setRoles] = useState([]);
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await api.getGovernanceRoles();
        if (res && res.roles) {
          setRoles(res.roles);
        }
      } catch (_) {}
    }
    if (activeIdentity) {
      loadRoles();
    }
  }, [activeIdentity]);

  // Load/save drafts on channel selection
  useEffect(() => {
    if (activePublicChannel?.id) {
      const draft = localStorage.getItem(`gaia_channel_draft_${activePublicChannel.id}`) || '';
      setPostBody(draft);
    } else {
      setPostBody('');
    }
    setPostSearchText('');
  }, [activePublicChannel?.id]);

  const handlePostBodyChange = (value) => {
    setPostBody(value);
    if (activePublicChannel?.id) {
      localStorage.setItem(`gaia_channel_draft_${activePublicChannel.id}`, value);
    }
  };

  // Scroll to bottom when channel changes or new posts are added
  useEffect(() => {
    if (postsScrollRef.current) {
      postsScrollRef.current.scrollTop = postsScrollRef.current.scrollHeight;
    }
  }, [activePublicChannel?.id, publicChannelPosts?.length]);

  // Load discovery on tab open
  useEffect(() => {
    if (activeIdentity?.ID && activeTab === 'discover' && !activePublicChannel && handleDiscoverChannels) {
      handleDiscoverChannels(discoverQuery, discoverCategory === 'All' ? '' : discoverCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdentity?.ID, activeTab, activePublicChannel]);

  const isOperator = roles.includes('node_operator');
  const channelCategories = ['All', 'General', 'Tech', 'News', 'Sports', 'Entertainment'];
  const handleDiscoverCategory = (category) => {
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
  }, [activePublicChannel, creatorOpen]);

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
      let scheduledFor = '';
      if (scheduledForInput) {
        scheduledFor = new Date(scheduledForInput).toISOString();
      }
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

  const handleTogglePinPost = async (post) => {
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

  const handleReactToPost = async (postId, emoji) => {
    if (!togglePostReaction) return;
    setError('');
    try {
      await togglePostReaction(postId, emoji);
    } catch (err) {
      setError(err.message || 'Reaktion konnte nicht gespeichert werden.');
    }
  };

  const handleAddComment = async (postId, e) => {
    e.preventDefault();
    const text = commentInputTexts[postId] || '';
    if (!text.trim()) return;
    if (!createPostComment) return;
    setError('');
    try {
      await createPostComment(postId, text.trim());
      setCommentInputTexts(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      setError(err.message || 'Kommentar konnte nicht gespeichert werden.');
    }
  };

  if (!activeIdentity) {
    return (
      <div className="public-channel-pane empty is-empty-state">
        <button type="button" className="mobile-floating-menu mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>{ct('menu')}</button>
        <div className="public-channel-empty-icon">ID</div>
        <h2>{ct('create_header')}</h2>
        <p>{ct('create_identity_msg')}</p>
      </div>
    );
  }

  const showForm = mode === 'create' || mode === 'edit';

  // Get Owner Name
  const channelOwner = activePublicChannel && contacts?.find(c => c.ID === activePublicChannel.createdBy || c.gaiaID === activePublicChannel.createdBy);
  const ownerDisplayName = channelOwner ? channelOwner.displayName : ct('default_owner');

  // Identify Node Operator trust verification
  const verifyingOperator = govOperators.length > 0 ? govOperators[0].displayName : 'Core Operator';

  // Filter posts inside active channel
  const filteredPosts = (publicChannelPosts || []).filter(post => {
    if (!postSearchText) return true;
    const query = postSearchText.toLowerCase();
    return post.body && post.body.toLowerCase().includes(query);
  });

  return (
    <div className={`public-channel-pane ${activePublicChannel ? 'has-active-channel' : 'is-empty-state'}`}>
      <div className="detail-mobile-actions">
        <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>{ct('menu')}</button>
        {activePublicChannel && (
          <button type="button" className="mobile-back-btn public-channel-mobile-overview-btn" onClick={handleReturnToChannelOverview}>
            {ct('overview')}
          </button>
        )}
        {!activePublicChannel && !showForm && (
          <button type="button" className="mobile-back-btn public-channel-mobile-filter-btn" onClick={() => setMobileCategoryOpen(true)}>
            {ct('category')}: {categoryLabel(discoverCategory)}
          </button>
        )}
      </div>

      {publicChannelsError && (
        <div className="public-channel-route-warning">
          <strong>{ct('channels_backend_unavailable')}</strong>
          <span>{publicChannelsError}. {ct('channels_backend_unavailable_desc')}</span>
        </div>
      )}

      {showForm ? (
        <section className="public-channel-editor">
          <h2>{mode === 'edit' ? ct('edit_header') : ct('create_header')}</h2>
          <form onSubmit={submitChannel}>
            <div className="public-channel-avatar-edit">
              <div className="public-channel-avatar">
                <ChannelAvatar avatar={avatarEnvelope} name={nameInput} />
              </div>
              <label className="btn-secondary public-channel-file-btn">
                {ct('set_image')}
                <input type="file" accept="image/*" onChange={handleAvatarFile} />
              </label>
            </div>
            <div className="form-group">
               <label>{ct('channel_name')}</label>
               <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                 <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>@</span>
                 <input 
                   className="input-field" 
                   value={nameInput.startsWith('@') ? nameInput.slice(1) : nameInput} 
                   maxLength={80} 
                   onChange={event => {
                     const val = event.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                     setNameInput('@' + val.toLowerCase());
                   }} 
                   placeholder="channelhandle"
                   style={{ paddingLeft: '28px', width: '100%', boxSizing: 'border-box' }}
                   required 
                 />
               </div>
            </div>
            <div className="form-group">
               <label>{ct('category')}</label>
               <select
                 className="input-field"
                 value={categoryInput}
                 onChange={e => setCategoryInput(e.target.value)}
                 style={{ width: '100%', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
               >
                 {['General', 'Tech', 'News', 'Sports', 'Entertainment'].map(cat => (
                   <option key={cat} value={categoryLabel(cat)}>{categoryLabel(cat)}</option>
                 ))}
               </select>
            </div>
            <div className="form-group">
               <label>{ct('description')}</label>
               <textarea className="input-field" value={descriptionInput} maxLength={600} onChange={event => setDescriptionInput(event.target.value)} />
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="public-channel-actions">
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? ct('saving') : ct('save_channel')}</button>
              <button type="button" className="btn-secondary" onClick={() => {
                if (setCreatorOpen) setCreatorOpen(false);
                setMode('view');
              }}>{ct('cancel')}</button>
            </div>
          </form>
        </section>
      ) : activePublicChannel ? (
        <>
          <header className="public-channel-header">
            <div className="public-channel-avatar">
              <ChannelAvatar avatar={activePublicChannel.avatar} name={activePublicChannel.name} />
            </div>
            <div className="public-channel-header-copy">
              <div className="public-channel-eyebrow">
                <span>{ct('public_channel')} ({categoryLabel(activePublicChannel.category || 'General')})</span>
                <span>{activePublicChannel.isAdmin ? ct('admin_console') : ct('viewer_mode')}</span>
              </div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activePublicChannel.name}
                {activePublicChannel.isVerified && (
                  <span style={{ 
                    color: '#00f2fe', 
                    background: 'rgba(0, 242, 254, 0.1)', 
                    border: '1px solid rgba(0, 242, 254, 0.3)', 
                    borderRadius: '4px', 
                    padding: '2px 6px', 
                    fontSize: '0.65rem', 
                    textTransform: 'uppercase', 
                    fontFamily: 'var(--font-mono)', 
                    display: 'inline-block'
                  }} title={`${ct('verified_by').replace('✓ ', '')}: ${verifyingOperator}`}>
                    {ct('verified_by')} {verifyingOperator}
                  </span>
                )}
              </h2>
              <p>{activePublicChannel.description || ct('no_description')}</p>
              
              <div className="public-channel-meta-row" style={{ fontSize: '0.75rem', display: 'flex', gap: '12px', color: 'var(--text-muted)' }}>
                <span>👤 {activePublicChannel.subscriberCount || 0} {ct('subscribers')}</span>
                <span>🔑 {ct('owner')}: <strong>{ownerDisplayName}</strong></span>
                <span>🛡️ {ct('federated_trust')}</span>
              </div>
            </div>
            <div className="public-channel-header-actions">
              <button type="button" className="btn-secondary" onClick={() => toggleSubscription(activePublicChannel)}>
                {activePublicChannel.isSubscribed ? ct('unsubscribe') : ct('subscribe')}
              </button>
              <button type="button" className="btn-action public-channel-actions-trigger" onClick={() => setChannelActionsOpen(true)}>
                {ct('channel_menu')}
              </button>
              {activePublicChannel.isAdmin && (
                <>
                  <button type="button" className="btn-action" onClick={() => setMode('edit')}>{ct('edit_btn')}</button>
                  <button type="button" className="btn-action" onClick={handleToggleComments} disabled={busy}>
                    {activePublicChannel.commentsEnabled !== false ? ct('comments_off') : ct('comments_on')}
                  </button>
                  <button type="button" className="btn-danger-outline" onClick={handleDeleteChannelClick}>{ct('delete_channel')}</button>
                </>
              )}
              {isOperator && (
                <button type="button" className="btn-action" style={{ border: '1px solid var(--accent-cyan)', background: 'transparent', color: 'var(--accent-cyan)' }} onClick={handleToggleVerification}>
                  {activePublicChannel.isVerified ? ct('decertify') : ct('certify')}
                </button>
              )}
              {!activePublicChannel.isAdmin && (
                <button type="button" className="btn-danger-outline" onClick={() => setReportModalOpen(true)}>{ct('report_action')}</button>
              )}
            </div>
          </header>

          {activePublicChannel.isSuspended && (
            <div className="public-channel-suspended-banner">
              <strong>⚠️ {ct('channel_suspended_title')}</strong>
              <p>{ct('channel_suspended_desc')}: {activePublicChannel.suspensionReason || ct('policy_violation')}</p>
            </div>
          )}

          {/* Search box inside channel posts list */}
          <div className="public-channel-search-bar" style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="input-field"
              placeholder={`🔍 ${ct('search_posts')}`}
              value={postSearchText}
              onChange={e => setPostSearchText(e.target.value)}
              style={{ margin: 0, padding: '6px 12px', fontSize: '0.85rem', width: '100%', maxWidth: '300px' }}
            />
          </div>

          <section ref={postsScrollRef} className="public-channel-posts gaia-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
            {publicChannelPostsLoading ? (
              <div className="public-channel-empty">{ct('searching')}</div>
            ) : filteredPosts.length === 0 ? (
              <div className="public-channel-empty">{ct('no_posts')}</div>
            ) : (
              // Order by pinned first, then chronological
              [...filteredPosts].sort((a,b) => {
                const aPinned = !!a.isPinned;
                const bPinned = !!b.isPinned;
                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;
                return new Date(a.createdAt) - new Date(b.createdAt);
              }).map(post => {
                const attachments = Array.isArray(post.attachments) ? post.attachments : [];
                const isPinned = !!post.isPinned;
                const reactions = post.reactionState?.reactions || {};
                const reactedByMe = post.reactionState?.reactedByMe || {};
                const comments = Array.isArray(post.comments) ? post.comments : [];
                const commentsExpanded = !!expandedCommentPostIds[post.id];

                // Detect future scheduled post
                const isPostScheduled = post.scheduledFor && new Date(post.scheduledFor) > new Date();

                return (
                  <article 
                    className="public-channel-post" 
                    key={post.id}
                    style={{
                      border: isPinned ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: isPinned ? 'rgba(0, 242, 254, 0.02)' : isPostScheduled ? 'rgba(255, 159, 67, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                      borderRadius: '8px',
                      padding: '16px',
                      position: 'relative'
                    }}
                  >
                    {isPinned && (
                      <span style={{ position: 'absolute', top: '10px', right: '16px', fontSize: '0.7rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📌 {ct('pinned')}
                      </span>
                    )}

                    {isPostScheduled && (
                      <span style={{ position: 'absolute', top: '10px', right: isPinned ? '110px' : '16px', fontSize: '0.7rem', color: '#ff9f43', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,159,67,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        📅 {ct('plan_post')}: {new Date(post.scheduledFor).toLocaleString()}
                      </span>
                    )}

                    <div className="public-channel-post-top" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                      <span>{activePublicChannel.name}</span>
                      <time>{formatChannelDate(post.createdAt)}</time>
                    </div>

                    {attachments.map((attachment, index) => (
                      attachment?.type === 'encrypted-image'
                        ? <EncryptedImage key={`${post.id}-${index}`} attachment={attachment} />
                        : null
                    ))}

                    {post.body && (
                      <div className="public-channel-post-body" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '14px' }}>
                        {renderMarkdown(post.body)}
                      </div>
                    )}

                    {/* Post Interactions (Pin, React, Comment Drawer Toggle) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Reaction buttons */}
                        {['👍', '❤️', '😂', '😮', '😢'].map(e => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => handleReactToPost(post.id, e)}
                            style={{
                              background: reactedByMe[e] ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                              border: reactedByMe[e] ? '1px solid rgba(0, 242, 254, 0.35)' : '1px solid transparent',
                              borderRadius: '999px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              color: reactedByMe[e] ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                            }}
                          >
                            {e} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reactions[e] || 0}</span>
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        {/* Pin toggle for admins */}
                        {activePublicChannel.isAdmin && (
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => handleTogglePinPost(post)}
                            style={{ fontSize: '0.8rem', color: isPinned ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                          >
                            {isPinned ? ct('unpin') : ct('pin')}
                          </button>
                        )}

                        <button
                          type="button"
                          className="link-button"
                          onClick={() => setExpandedCommentPostIds(prev => ({ ...prev, [post.id]: !commentsExpanded }))}
                          style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}
                        >
                          💬 {ct('comments')} ({comments.length})
                        </button>
                      </div>
                    </div>

                    {/* Comments Drawer (collapsible drawer under post) */}
                    {commentsExpanded && (
                      <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '6px', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                          {comments.map(c => {
                            const isCommentAuthor = c.authorIdentityId === activeIdentity.ID;
                            const canModerate = activePublicChannel.isAdmin || isCommentAuthor;
                            return (
                              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', lineHeight: '1.4', padding: '4px 0' }}>
                                <div>
                                  <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{c.authorDisplayName || c.authorGaiaId || ct('anonymous')}:</span>{' '}
                                  <span style={{ color: 'var(--text-primary)' }}>{c.body}</span>
                                </div>
                                {canModerate && (
                                  <button
                                    type="button"
                                    className="link-button"
                                    onClick={() => {
                                      if (activePublicChannel.isAdmin) {
                                        handleModerateComment(post.id, c.id, 'deleted');
                                      } else {
                                        handleDeleteComment(post.id, c.id);
                                      }
                                    }}
                                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}
                                    title={ct('delete_comment')}
                                  >
                                    🗑️ {ct('delete_comment')}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {comments.length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ct('no_comments')}</div>
                          )}
                        </div>

                        {activePublicChannel.commentsEnabled !== false ? (
                          <form onSubmit={(e) => handleAddComment(post.id, e)} style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              className="input-field"
                              placeholder={ct('comment_placeholder')}
                              value={commentInputTexts[post.id] || ''}
                              onChange={e => setCommentInputTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                              style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', margin: 0 }}
                              required
                            />
                            <button type="submit" className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem', width: 'auto' }}>
                              {ct('send')}
                            </button>
                          </form>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ct('comments_disabled')}</div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>

          {activePublicChannel.isAdmin && !activePublicChannel.isSuspended && (
            <form className="public-channel-composer" onSubmit={submitPost}>
              <div className="public-channel-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" title={ct('format_bold')} onClick={() => wrapSelection('**')}>B</button>
                  <button type="button" title={ct('format_italic')} onClick={() => wrapSelection('*')}>I</button>
                  <button type="button" title={ct('format_underline')} onClick={() => wrapSelection('__')}>U</button>
                  <label className="public-channel-composer-img-label">
                    IMG
                    <input type="file" accept="image/*" onChange={handlePostImage} />
                  </label>
                </div>
                {/* Datetime picker for scheduled posts */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ct('plan_label')}</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={scheduledForInput}
                    onChange={e => setScheduledForInput(e.target.value)}
                    style={{ margin: 0, padding: '2px 6px', fontSize: '0.75rem', width: 'auto' }}
                  />
                  {scheduledForInput && (
                    <button type="button" className="link-button" onClick={() => setScheduledForInput('')} style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{ct('reset')}</button>
                  )}
                </div>
              </div>
              <textarea
                ref={postRef}
                className="input-field"
                value={postBody}
                maxLength={MAX_POST_CHARS}
                onChange={event => handlePostBodyChange(event.target.value)}
                placeholder={ct('post_placeholder')}
              />
              <div className="public-channel-composer-footer">
                <span>{postBody.length}/{MAX_POST_CHARS}</span>
                {postAttachments.length > 0 && <span>{ct('attached_image')}</span>}
                <button type="submit" className="btn-primary" disabled={busy || (!postBody.trim() && postAttachments.length === 0)}>
                  {busy ? ct('publishing') : scheduledForInput ? ct('plan_post') : ct('publish')}
                </button>
              </div>
              {error && <p className="form-error">{error}</p>}
            </form>
          )}
        </>
      ) : (
        <section className="public-channel-editor" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
          {/* Tab selector for Discover vs Create */}
          <div className="public-channel-discovery-tabs" style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
              onClick={() => setActiveTab('discover')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'discover' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: activeTab === 'discover' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
            >
              {ct('discover')}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('create');
                setMode('create');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'create' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: activeTab === 'create' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
            >
              {ct('create_tab')}
            </button>
          </div>

          {activeTab === 'discover' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder={ct('search_placeholder')}
                  value={discoverQuery}
                  onChange={e => setDiscoverQuery(e.target.value)}
                  style={{ flex: 1, margin: 0 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleDiscoverChannels(discoverQuery, discoverCategory === 'All' ? '' : discoverCategory);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleDiscoverChannels(discoverQuery, discoverCategory === 'All' ? '' : discoverCategory)}
                  style={{ width: 'auto' }}
                >{ct('search_btn')}</button>
              </div>
              <div className="category-chips public-channel-category-chips" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {channelCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`chip ${discoverCategory === cat ? 'active' : ''}`}
                    onClick={() => handleDiscoverCategory(cat)}
                    style={{
                      background: discoverCategory === cat ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                      color: discoverCategory === cat ? '#000' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                  >
                    {categoryLabel(cat)}
                  </button>
                ))}
              </div>

              {/* Discovery search results list */}
              {discoverLoading ? (
                <div style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>{ct('searching')}</div>
              ) : discoverResults.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>{ct('no_channels')}</div>
              ) : (
                <div className="discover-grid gaia-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {discoverResults.map(chan => (
                    <div
                      key={chan.id}
                      className="discover-card glass-panel"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(255,255,255,0.02)',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="public-channel-avatar" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                          <ChannelAvatar avatar={chan.avatar} name={chan.name} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chan.name}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', background: 'rgba(0, 242, 254, 0.08)', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>
                              {categoryLabel(chan.category || 'General')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {chan.description || ct('no_description')}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>👤 {chan.subscriberCount || 0} {ct('subscribers')}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={async () => {
                            await toggleSubscription(chan);
                            handleDiscoverChannels(discoverQuery, discoverCategory === 'All' ? '' : discoverCategory);
                          }}
                          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          {ct('subscribe')}
                        </button>
                        <button
                          type="button"
                          className="btn-danger-outline"
                          onClick={() => handleBlockChannel(chan.id)}
                          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          {ct('block')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div className="public-channel-empty-icon">CH</div>
              <h2>{ct('create_header')}</h2>
              <p className="public-channel-viewer-note">{ct('create_channel_empty_desc')}</p>
              <button type="button" className="btn-primary" onClick={() => {
                setMode('create');
              }}>{ct('create_channel_empty_btn')}</button>
            </div>
          )}
        </section>
      )}

      {mobileCategoryOpen && (
        <div className="popup-overlay public-channel-mobile-category-overlay">
          <div className="popup-card glass-panel public-channel-mobile-category-sheet">
            <div className="public-channel-actions-modal-header">
              <div>
                <div className="public-channel-actions-modal-eyebrow">{ct('discover')}</div>
                <h3>{ct('category')}</h3>
              </div>
              <button type="button" className="chat-icon-btn" onClick={() => setMobileCategoryOpen(false)} aria-label={ct('close')}>
                {'\u2715'}
              </button>
            </div>
            <div className="public-channel-mobile-category-list">
              {channelCategories.map(category => (
                <button
                  key={category}
                  type="button"
                  className={`btn-secondary public-channel-actions-modal-btn ${discoverCategory === category ? 'active' : ''}`}
                  onClick={() => handleDiscoverCategory(category)}
                >
                  {categoryLabel(category)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Abuse report modal overlay */}
      {reportModalOpen && (
        <div className="popup-overlay abuse-report-overlay">
          <div className="popup-card glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>{ct('report_title')}: {activePublicChannel.name}</h3>
            <form onSubmit={submitReportHandler}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>{ct('report_category')}</label>
                <select 
                  className="input-field" 
                  value={reportCategory} 
                  onChange={e => setReportCategory(e.target.value)}
                  style={{ width: '100%', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="spam">{ct('report_spam')}</option>
                  <option value="phishing">{ct('report_phishing')}</option>
                  <option value="malware">{ct('report_malware')}</option>
                  <option value="harassment">{ct('report_harassment')}</option>
                  <option value="illegal_content">{ct('report_illegal_content')}</option>
                  <option value="threat">{ct('report_threat')}</option>
                  <option value="other">{ct('report_other')}</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>{ct('report_severity')}</label>
                <select 
                  className="input-field" 
                  value={reportSeverity} 
                  onChange={e => setReportSeverity(e.target.value)}
                  style={{ width: '100%', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="low">{ct('severity_low')}</option>
                  <option value="medium">{ct('severity_medium')}</option>
                  <option value="high">{ct('severity_high')}</option>
                  <option value="critical">{ct('severity_critical')}</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>{ct('report_notes')}</label>
                <textarea 
                  className="input-field" 
                  value={reportComment} 
                  placeholder={ct('report_placeholder')}
                  onChange={e => setReportComment(e.target.value)}
                  style={{ width: '100%', height: '80px' }}
                />
              </div>

              <div className="button-row" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setReportModalOpen(false)}>{ct('cancel')}</button>
                <button type="submit" className="btn-danger" disabled={busy}>
                  {busy ? ct('report_submitting') : ct('report_submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {channelActionsOpen && activePublicChannel && (
        <div className="popup-overlay">
          <div className="popup-card glass-panel public-channel-actions-modal">
            <div className="public-channel-actions-modal-header">
              <div>
                <div className="public-channel-actions-modal-eyebrow">{ct('channel_control')}</div>
                <h3>{activePublicChannel.name}</h3>
              </div>
              <button type="button" className="chat-icon-btn" onClick={() => setChannelActionsOpen(false)} aria-label={ct('close')}>
                {'\u2715'}
              </button>
            </div>

            <div className="public-channel-actions-modal-list">
              {activePublicChannel.isAdmin && (
                <>
                  <button type="button" className="btn-secondary public-channel-actions-modal-btn" onClick={() => { setChannelActionsOpen(false); setMode('edit'); }}>{ct('edit_btn')}</button>
                  <button type="button" className="btn-secondary public-channel-actions-modal-btn" onClick={() => { setChannelActionsOpen(false); handleToggleComments(); }} disabled={busy}>
                    {activePublicChannel.commentsEnabled !== false ? ct('comments_off') : ct('comments_on')}
                  </button>
                  <button type="button" className="btn-danger-outline public-channel-actions-modal-btn" onClick={() => { setChannelActionsOpen(false); handleDeleteChannelClick(); }}>{ct('delete_channel')}</button>
                </>
              )}

              {isOperator && (
                <button type="button" className="btn-secondary public-channel-actions-modal-btn public-channel-actions-operator" onClick={() => { setChannelActionsOpen(false); handleToggleVerification(); }}>
                  {activePublicChannel.isVerified ? ct('decertify') : ct('certify')}
                </button>
              )}

              {!activePublicChannel.isAdmin && (
                <>
                  <button type="button" className="btn-danger-outline public-channel-actions-modal-btn" onClick={() => { setChannelActionsOpen(false); handleBlockChannel(activePublicChannel.id); }}>{ct('block_action')}</button>
                  <button type="button" className="btn-danger-outline public-channel-actions-modal-btn" onClick={() => { setChannelActionsOpen(false); setReportModalOpen(true); }}>{ct('report_action')}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicChannelsPane;
