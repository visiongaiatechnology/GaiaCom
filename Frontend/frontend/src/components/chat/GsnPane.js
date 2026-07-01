// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useEffect, useMemo } from 'react';
import useGsn from '../../hooks/useGsn';
import * as api from '../../api';
import * as crypto from '../../crypto';
import { sanitizeAvatarFile } from '../../utils/avatar';
import { getHumanProof, saveHumanProof } from '../../utils/humanProof';
import { safeJsonParse } from '../../utils/safeJson';

import GaiaPassportCard from '../common/GaiaPassportCard';
import HumanProofDialog from '../common/HumanProofDialog';
import DecryptedAvatar from './gsn/DecryptedAvatar';
import GsnPostCard from './gsn/GsnPostCard';
import GsnPostComposer from './gsn/GsnPostComposer';
import GsnProfileEditor from './gsn/GsnProfileEditor';

const REPORT_COMMENT_LIMIT = 8000;

function parseTrustPassportSummary(summary) {
  const parsed = typeof summary === 'string' ? safeJsonParse(summary, null) : summary;
  if (!parsed || typeof parsed !== 'object') return null;
  const roles = Array.isArray(parsed.roles) ? parsed.roles : [];
  return {
    abuseScore: Number(parsed.abuseScore) || 0,
    trustAgeDays: Number(parsed.trustAgeDays) || 0,
    roles,
    humanProof: parsed.humanProof || null,
    isHumanVerified: Boolean(parsed.isHumanVerified)
  };
}

export default function GsnPane({
  activeIdentity,
  derivedKeys,
  triggerAlert,
  setMobileMenuOpen,
  t,
  showConfirm,
  rooms = [],
  contacts = [],
  publicChannels = [],
  setCurrentMenu,
  activeChatContact,
  setActiveChatContact,
  chatMessages = [],
  chatInputText = '',
  setChatInputText,
  handleSendChatMessage,
  setActiveRoom,
  setActivePublicChannel
}) {
  const {
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
  } = useGsn({ activeIdentity, derivedKeys, triggerAlert });

  const [activeTab, setActiveTab] = useState('node'); // 'node' | 'following'
  const [repostOfPostId, setRepostOfPostId] = useState('');

  // Comments state
  const [expandedComments, setExpandedComments] = useState({}); // postId -> boolean
  const [commentTextMap, setCommentTextMap] = useState({}); // postId -> string

  // Profile Edit fields
  const [editMode, setEditMode] = useState(false);
  const [editRealName, setEditRealName] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  // Abuse Report modal state
  const [reportModalTarget, setReportModalTarget] = useState(null); // { type: 'post'|'user', id: string } | null
  const [reportCategory, setReportCategory] = useState('spam');
  const [reportSeverity, setReportSeverity] = useState('low');
  const [reportComment, setReportComment] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [showHumanProofDialog, setShowHumanProofDialog] = useState(false);
  const [humanProofRefresh, setHumanProofRefresh] = useState(0);
  const [activeHumanProof, setActiveHumanProof] = useState(null);

  const miniChatMessages = useMemo(() => {
    if (!activeIdentity || !activeChatContact) return [];
    return chatMessages
      .filter(msg =>
        (msg.sender === activeChatContact.gaiaID && msg.recipient === activeIdentity.GaiaID) ||
        (msg.sender === activeIdentity.GaiaID && msg.recipient === activeChatContact.gaiaID)
      )
      .slice(-6);
  }, [activeIdentity, activeChatContact, chatMessages]);

  const openRoomFromRail = (room) => {
    if (setActiveRoom) setActiveRoom(room);
    if (setCurrentMenu) setCurrentMenu('groups');
  };

  const openChannelFromRail = (channel) => {
    if (setActivePublicChannel) setActivePublicChannel(channel);
    if (setCurrentMenu) setCurrentMenu('public_channels');
  };

  const handleMiniChatSubmit = async (event) => {
    event.preventDefault();
    if (!activeChatContact || !chatInputText.trim() || !handleSendChatMessage) return;
    await handleSendChatMessage(event);
  };

  // Fetch feeds on mount
  useEffect(() => {
    fetchNodeFeed();
    fetchFollowingFeed();
  }, [fetchNodeFeed, fetchFollowingFeed]);

  const [visiblePostsCount, setVisiblePostsCount] = useState(15);

  const handleFeedScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setVisiblePostsCount(prev => Math.min(prev + 15, currentFeed.length));
    }
  };

  const currentFeed = activeTab === 'node' ? nodeFeed : followingFeed;
  const currentFeedLoading = activeTab === 'node' ? loadingNodeFeed : loadingFollowingFeed;
  const activeTrustSummary = useMemo(
    () => parseTrustPassportSummary(activeProfile?.trustPassportSummary),
    [activeProfile?.trustPassportSummary]
  );
  const isOwnActiveProfile = Boolean(
    activeIdentity?.GaiaID &&
    activeProfile?.gaiaId &&
    activeIdentity.GaiaID.toLowerCase() === activeProfile.gaiaId.toLowerCase()
  );

  useEffect(() => {
    const summaryProof = activeTrustSummary?.humanProof || null;
    if (activeProfile?.gaiaId && summaryProof) {
      saveHumanProof(activeProfile.gaiaId, summaryProof);
      setActiveHumanProof(summaryProof);
      return;
    }
    setActiveHumanProof(getHumanProof(activeProfile?.gaiaId));
  }, [activeProfile?.gaiaId, activeTrustSummary?.humanProof, humanProofRefresh]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setVisiblePostsCount(15);
    if (tab === 'node') {
      fetchNodeFeed();
    } else {
      fetchFollowingFeed();
    }
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);

  const handleAvatarImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    setAvatarUploadProgress(5);
    try {
      const compressedDataUrl = await sanitizeAvatarFile(file);
      setAvatarUploadProgress(15);
      
      const resBlob = await fetch(compressedDataUrl);
      const cleanBlob = await resBlob.blob();
      setAvatarUploadProgress(25);

      const { encryptedBlob, keyHex, ivHex } = await crypto.encryptFileSymmetric(cleanBlob);
      const encryptedSize = encryptedBlob.size;
      const encryptedBuf = await encryptedBlob.arrayBuffer();

      const hashBuf = await window.crypto.subtle.digest('SHA-256', encryptedBuf);
      const fileHash = Array.prototype.map.call(new Uint8Array(hashBuf), x => ('00' + x.toString(16)).slice(-2)).join('');
      setAvatarUploadProgress(35);

      const initRes = await api.initUpload(file.name, encryptedSize, file.type, fileHash);
      const fileId = initRes.fileId;
      setAvatarUploadProgress(45);

      const CHUNK_SIZE = 1024 * 1024;
      const totalChunks = Math.ceil(encryptedSize / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, encryptedSize);
        const chunkBlob = encryptedBlob.slice(start, end);
        const chunkBuf = await chunkBlob.arrayBuffer();
        
        const chunkHashBuf = await window.crypto.subtle.digest('SHA-256', chunkBuf);
        const chunkHash = Array.prototype.map.call(new Uint8Array(chunkHashBuf), x => ('00' + x.toString(16)).slice(-2)).join('');
        
        await api.uploadChunk(fileId, i, chunkHash, chunkBlob);
        setAvatarUploadProgress(Math.round(45 + ((i + 1) / totalChunks) * 50));
      }

      await api.completeUpload(fileId);
      setAvatarUploadProgress(100);

      const avatarMeta = JSON.stringify({
        fileId,
        keyHex,
        ivHex
      });
      setEditAvatar(avatarMeta);
      triggerAlert(t('success') || 'Erfolg', 'Profilbild wurde verschlüsselt und hochgeladen.');
    } catch (err) {
      console.error(err);
      triggerAlert(t('error') || 'Fehler', 'Profilbild-Upload fehlgeschlagen: ' + err.message, 'danger');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeletePost = (postId) => {
    showConfirm(
      t('gsn_delete_confirm_title') || 'Beitrag löschen?',
      t('gsn_delete_confirm_desc') || 'Bist du sicher, dass du diesen Beitrag unwiderruflich löschen möchtest?',
      async () => {
        try {
          await deletePost(postId);
        } catch (err) {
          triggerAlert(t('error') || 'Fehler', err.message, 'danger');
        }
      }
    );
  };

  const handleDeleteComment = (postId, commentId) => {
    showConfirm(
      t('gsn_delete_comment_confirm_title') || 'Kommentar löschen?',
      t('gsn_delete_comment_confirm_desc') || 'Bist du sicher, dass du diesen Kommentar unwiderruflich löschen möchtest?',
      async () => {
        try {
          await deleteComment(postId, commentId);
        } catch (err) {
          triggerAlert(t('error') || 'Fehler', err.message, 'danger');
        }
      }
    );
  };

  const handleRepost = (post) => {
    setRepostOfPostId(post.id);
    const composer = document.querySelector('.gsn-composer');
    if (composer) {
      composer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleComments = (postId) => {
    const isExpanded = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: isExpanded }));
    if (isExpanded && !activeComments[postId]) {
      fetchComments(postId);
    }
  };

  const handleAddComment = async (postId) => {
    const text = commentTextMap[postId] || '';
    if (!text.trim()) return;

    try {
      await addComment(postId, text);
      setCommentTextMap(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    }
  };

  const handleOpenProfile = async (gaiaId) => {
    await fetchProfile(gaiaId);
    setEditMode(false);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        realName: editRealName,
        displayName: editDisplayName,
        description: editBio,
        avatar: editAvatar,
        website: editWebsite
      });
      setEditMode(false);
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    }
  };

  const openEditProfile = () => {
    if (activeProfile) {
      setEditRealName(activeProfile.realName || '');
      setEditDisplayName(activeProfile.displayName || '');
      setEditBio(activeProfile.description || '');
      setEditAvatar(activeProfile.avatar || '');
      setEditWebsite(activeProfile.website || '');
      setEditMode(true);
    }
  };

  const handleOpenReportModal = (type, id) => {
    setReportModalTarget({ type, id });
    setReportCategory('spam');
    setReportSeverity('low');
    setReportComment('');
  };

  const handleSubmitReport = async () => {
    if (!reportModalTarget || !activeIdentity) return;
    const trimmedComment = reportComment.trim();
    if (trimmedComment.length > REPORT_COMMENT_LIMIT) {
      triggerAlert('Meldung zu lang', `Maximal ${REPORT_COMMENT_LIMIT} Zeichen.`);
      return;
    }
    setSubmittingReport(true);
    try {
      await api.submitAbuseReport(
        activeIdentity.ID,
        reportModalTarget.type,
        reportModalTarget.id,
        reportCategory,
        reportSeverity,
        null,
        trimmedComment
      );
      triggerAlert(t('success') || 'Erfolg', t('gsn_report_submitted') || 'Meldung wurde an die Governance übermittelt.');
      setReportModalTarget(null);
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="gsn-container">
      {/* Header */}
      <div className="gsn-header">
        <div className="gsn-header-title">
          <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
            {t('menu') || 'Menü'}
          </button>
          <h2>
            🌐 {t('gsn_title') || 'GSN Social Feed'}
          </h2>
        </div>
        <div className="gsn-tabs">
          <button
            type="button"
            className={`gsn-tab ${activeTab === 'node' ? 'active' : ''}`}
            onClick={() => handleTabChange('node')}
          >
            🏠 {t('gsn_node_feed') || 'Node Feed'}
          </button>
          <button
            type="button"
            className={`gsn-tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => handleTabChange('following')}
          >
            👥 {t('gsn_following_feed') || 'Folge ich'}
          </button>
        </div>
      </div>

      <div className="gsn-social-layout">
        <section className="gsn-feed-column">
      {/* Feed List */}
      <div className="gsn-feed-list" onScroll={handleFeedScroll}>
        {currentFeedLoading ? (
          <div className="gsn-feed-state">
            <div className="spinner gsn-feed-spinner"></div>
            {t('loading') || 'Lade Feed...'}
          </div>
        ) : currentFeed.length === 0 ? (
          <div className="gsn-feed-state">
            📭 {t('gsn_feed_empty') || 'Keine Beiträge gefunden.'}
          </div>
        ) : (
          currentFeed.slice(0, visiblePostsCount).map(post => (
            <GsnPostCard
              key={post.id}
              post={post}
              activeIdentity={activeIdentity}
              myProfile={myProfile}
              currentFeed={currentFeed}
              expandedComments={expandedComments}
              toggleComments={toggleComments}
              loadingComments={loadingComments}
              activeComments={activeComments}
              commentTextMap={commentTextMap}
              setCommentTextMap={setCommentTextMap}
              handleOpenProfile={handleOpenProfile}
              handleOpenReportModal={handleOpenReportModal}
              handleDeletePost={handleDeletePost}
              handleDeleteComment={handleDeleteComment}
              handleAddComment={handleAddComment}
              reactToPost={reactToPost}
              handleRepost={handleRepost}
              t={t}
            />
          ))
        )}
      </div>

      {/* Composer */}
      {activeIdentity && (
        <GsnPostComposer
          activeIdentity={activeIdentity}
          createPost={createPost}
          repostOfPostId={repostOfPostId}
          setRepostOfPostId={setRepostOfPostId}
          triggerAlert={triggerAlert}
          t={t}
        />
      )}
        </section>

        <aside className="gsn-right-rail">
          <section className="gsn-rail-card">
            <div className="gsn-rail-header">
              <span>Public Spaces</span>
              <button type="button" onClick={() => setCurrentMenu && setCurrentMenu('public_channels')}>Alle</button>
            </div>
            <div className="gsn-rail-list">
              {rooms.slice(0, 5).map(room => (
                <button key={room.ID || room.id || room.Name} type="button" className="gsn-rail-item" onClick={() => openRoomFromRail(room)}>
                  <span className="gsn-rail-icon">#</span>
                  <span>
                    <strong>{room.Name || room.name}</strong>
                    <small>{room.Members?.length || 0} Members</small>
                  </span>
                </button>
              ))}
              {rooms.length === 0 && (
                <div className="gsn-rail-empty">Keine oeffentlichen Gruppen geladen.</div>
              )}
            </div>
          </section>

          <section className="gsn-rail-card">
            <div className="gsn-rail-header">
              <span>Channels</span>
              <button type="button" onClick={() => setCurrentMenu && setCurrentMenu('public_channels')}>Oeffnen</button>
            </div>
            <div className="gsn-rail-list">
              {publicChannels.slice(0, 4).map(channel => (
                <button key={channel.id || channel.ID || channel.slug || channel.name} type="button" className="gsn-rail-item" onClick={() => openChannelFromRail(channel)}>
                  <span className="gsn-rail-icon">~</span>
                  <span>
                    <strong>{channel.name || channel.Name || channel.title || 'Channel'}</strong>
                    <small>{channel.subscriberCount || channel.memberCount || 0} Abos</small>
                  </span>
                </button>
              ))}
              {publicChannels.length === 0 && (
                <div className="gsn-rail-empty">Noch keine Channels im Cache.</div>
              )}
            </div>
          </section>

          <section className="gsn-rail-card gsn-mini-chat">
            <div className="gsn-rail-header">
              <span>Mini E2E Chat</span>
              <button type="button" onClick={() => setCurrentMenu && setCurrentMenu('chat')}>Vollbild</button>
            </div>
            <div className="gsn-mini-contact-strip">
              {contacts.slice(0, 6).map(contact => (
                <button
                  key={contact.ID || contact.id || contact.gaiaID}
                  type="button"
                  className={`gsn-mini-contact ${activeChatContact?.gaiaID === contact.gaiaID ? 'active' : ''}`}
                  onClick={() => setActiveChatContact && setActiveChatContact(contact)}
                  title={contact.displayName || contact.gaiaID}
                >
                  {(contact.displayName || contact.gaiaID || '?').slice(0, 1).toUpperCase()}
                </button>
              ))}
            </div>

            <div className="gsn-mini-chat-window">
              {!activeChatContact ? (
                <div className="gsn-rail-empty">Kontakt waehlen, dann verschluesselt nebenbei chatten.</div>
              ) : miniChatMessages.length === 0 ? (
                <div className="gsn-rail-empty">Noch keine Nachrichten mit {activeChatContact.displayName || activeChatContact.gaiaID}.</div>
              ) : (
                miniChatMessages.map(msg => {
                  const outgoing = msg.sender === activeIdentity?.GaiaID;
                  return (
                    <div key={msg.id || msg.createdAt} className={`gsn-mini-message ${outgoing ? 'outgoing' : 'incoming'}`}>
                      {msg.body || 'Datei / Anhang'}
                    </div>
                  );
                })
              )}
            </div>

            <form className="gsn-mini-chat-form" onSubmit={handleMiniChatSubmit}>
              <input
                type="text"
                value={chatInputText}
                onChange={event => setChatInputText && setChatInputText(event.target.value)}
                placeholder={activeChatContact ? 'Verschluesselte Nachricht...' : 'Kontakt waehlen...'}
                disabled={!activeChatContact}
              />
              <button type="submit" disabled={!activeChatContact || !chatInputText.trim()}>
                Senden
              </button>
            </form>
          </section>
        </aside>
      </div>

      {/* Sliding Profile Drawer */}
      {activeProfile && (
        <div className="gsn-drawer">
          <div className="gsn-drawer-header">
            <h3 className="gsn-drawer-title">👤 {t('gsn_profile') || 'Benutzerprofil'}</h3>
            <button type="button" className="gsn-drawer-close" onClick={() => setActiveProfile(null)}>
              ✕
            </button>
          </div>

          <div className="gsn-drawer-content">
            {loadingProfile ? (
              <div className="gsn-drawer-loading">
                Lade Profil...
              </div>
            ) : (
              <div>
                {!editMode ? (
                  <div className="gsn-profile-view">
                    <section className="gsn-profile-identity-card">
                      <DecryptedAvatar avatarJson={activeProfile.avatar} displayName={activeProfile.displayName} variant="profile" />
                      <div className="gsn-profile-identity-copy">
                        <h3>{activeProfile.displayName || activeProfile.gaiaId}</h3>
                        {activeProfile.realName && (
                          <div className="gsn-profile-realname">
                            {activeProfile.realName}
                          </div>
                        )}
                        <span>{activeProfile.gaiaId}</span>
                      </div>
                      <div className="gsn-badges gsn-profile-badges">
                        {activeProfile.isVerifiedOperator && (
                          <span className="gsn-badge gsn-badge-op">⭐ Node Operator</span>
                        )}
                        {activeProfile.isVerifiedGovernance && (
                          <span className="gsn-badge gsn-badge-gov">🛡️ Gov</span>
                        )}
                        {activeProfile.isVerifiedPassport && (
                          <span className="gsn-badge gsn-badge-pass">💎 Passport</span>
                        )}
                      </div>
                    </section>

                    <GaiaPassportCard
                      profile={activeProfile}
                      trustSummary={activeTrustSummary}
                      humanProof={activeHumanProof}
                      isOwnProfile={isOwnActiveProfile}
                      onStartHumanProof={() => setShowHumanProofDialog(true)}
                    />

                    <div className="gsn-profile-stats">
                      <div className="gsn-profile-stat">
                        <span className="gsn-profile-stat-val">{activeProfile.followersCount || 0}</span>
                        <span className="gsn-profile-stat-lbl">{t('gsn_followers') || 'Follower'}</span>
                      </div>
                      <div className="gsn-profile-stat">
                        <span className="gsn-profile-stat-val">{activeProfile.followingCount || 0}</span>
                        <span className="gsn-profile-stat-lbl">{t('gsn_following') || 'Folge ich'}</span>
                      </div>
                    </div>

                    {activeProfile.description && (
                      <section className="gsn-profile-info-panel">
                        <strong>{t('gsn_bio') || 'Beschreibung / Bio:'}</strong>
                        <p>{activeProfile.description}</p>
                      </section>
                    )}

                    {activeProfile.website && (
                      <section className="gsn-profile-info-panel compact">
                        🌐 <strong>Website:</strong>{' '}
                        <a href={activeProfile.website.startsWith('http') ? activeProfile.website : `https://${activeProfile.website}`} target="_blank" rel="noopener noreferrer">
                          {activeProfile.website}
                        </a>
                      </section>
                    )}

                    {activeTrustSummary && (
                      <section className="gsn-profile-passport-panel">
                        <strong>💎 Trust Passport Nachweis</strong>
                        <div className="gsn-profile-passport-grid">
                          <span>Abuse Score</span>
                          <b>{activeTrustSummary.abuseScore}</b>
                          <span>Trust Age</span>
                          <b>{activeTrustSummary.trustAgeDays} Tage</b>
                          <span>Rollen</span>
                          <b>{activeTrustSummary.roles.length > 0 ? activeTrustSummary.roles.join(', ') : 'Keine'}</b>
                        </div>
                      </section>
                    )}

                    <div className="gsn-profile-action-row">
                      {activeIdentity && activeProfile.gaiaId.toLowerCase() !== activeIdentity.GaiaID.toLowerCase() ? (
                        <>
                          {activeProfile.isFollowing ? (
                            <button
                              type="button"
                              className="btn-primary gsn-profile-action-btn muted"
                              onClick={() => unfollowUser(activeProfile.gaiaId)}
                            >
                              🤝 {t('gsn_unfollow') || 'Entfolgen'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary gsn-profile-action-btn"
                              onClick={() => followUser(activeProfile.gaiaId)}
                            >
                              ➕ {t('gsn_follow') || 'Folgen'}
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn-secondary gsn-profile-action-btn danger"
                            onClick={() => handleOpenReportModal('user', activeProfile.gaiaId)}
                          >
                            🚩 {t('gsn_report') || 'Melden'}
                          </button>
                        </>
                      ) : activeIdentity && (
                        <button
                          type="button"
                          className="btn-primary gsn-profile-action-btn"
                          onClick={openEditProfile}
                        >
                          ⚙️ {t('gsn_edit_profile') || 'Profil bearbeiten'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <GsnProfileEditor
                    editRealName={editRealName}
                    setEditRealName={setEditRealName}
                    editDisplayName={editDisplayName}
                    setEditDisplayName={setEditDisplayName}
                    editAvatar={editAvatar}
                    setEditAvatar={setEditAvatar}
                    editBio={editBio}
                    setEditBio={setEditBio}
                    editWebsite={editWebsite}
                    setEditWebsite={setEditWebsite}
                    uploadingAvatar={uploadingAvatar}
                    avatarUploadProgress={avatarUploadProgress}
                    handleAvatarImageUpload={handleAvatarImageUpload}
                    handleSaveProfile={handleSaveProfile}
                    setEditMode={setEditMode}
                    t={t}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Abuse Report Modal Overlay */}
      {reportModalTarget && (
        <div className="gsn-report-overlay">
          <div className="glass-panel gsn-report-dialog">
            <h3 className="gsn-report-title">🚩 {t('gsn_report_title') || 'Verstoß melden'}</h3>
            
            <div className="gsn-report-form">
              <div>
                <label className="gsn-report-label">
                  {t('gsn_report_category') || 'Kategorie'}
                </label>
                <select
                  className="gsn-report-input"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                >
                  <option value="spam">{t('gsn_report_spam') || 'Spam / Werbung'}</option>
                  <option value="harassment">{t('gsn_report_harassment') || 'Belästigung / Hassrede'}</option>
                  <option value="phishing">Phishing / Identitätsdiebstahl</option>
                  <option value="malware">Malware / Schadcode</option>
                  <option value="illegal_content">{t('gsn_report_illegal') || 'Illegale Inhalte'}</option>
                  <option value="threat">Konkrete Bedrohung</option>
                  <option value="other">{t('gsn_report_abuse') || 'Sonstiger Missbrauch'}</option>
                </select>
              </div>

              <div>
                <label className="gsn-report-label">
                  {t('gsn_report_severity') || 'Dringlichkeit'}
                </label>
                <select
                  className="gsn-report-input"
                  value={reportSeverity}
                  onChange={(e) => setReportSeverity(e.target.value)}
                >
                  <option value="low">{t('gsn_report_low') || 'Niedrig'}</option>
                  <option value="medium">{t('gsn_report_medium') || 'Mittel'}</option>
                  <option value="high">{t('gsn_report_high') || 'Hoch'}</option>
                  <option value="critical">Kritisch</option>
                </select>
              </div>

              <div>
                <label className="gsn-report-label">
                  {t('gsn_report_comment') || 'Zusätzlicher Kommentar'}
                </label>
                <textarea
                  className="gsn-report-input gsn-report-textarea"
                  placeholder="Warum meldest du diesen Inhalt?"
                  value={reportComment}
                  maxLength={REPORT_COMMENT_LIMIT + 500}
                  onChange={(e) => setReportComment(e.target.value)}
                />
                <div className={`gsn-report-count ${reportComment.length > REPORT_COMMENT_LIMIT ? 'over' : ''}`}>
                  {reportComment.length}/{REPORT_COMMENT_LIMIT}
                </div>
              </div>

              <div className="gsn-report-actions">
                <button
                  type="button"
                  className="btn-secondary gsn-report-action-btn"
                  onClick={() => setReportModalTarget(null)}
                  disabled={submittingReport}
                >
                  {t('cancel') || 'Abbrechen'}
                </button>
                <button
                  type="button"
                  className="btn-primary gsn-report-action-btn danger"
                  onClick={handleSubmitReport}
                  disabled={submittingReport || reportComment.length > REPORT_COMMENT_LIMIT}
                >
                  {submittingReport ? 'Sendet...' : (t('gsn_report_submit') || 'Melden')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <HumanProofDialog
        show={showHumanProofDialog}
        onClose={() => setShowHumanProofDialog(false)}
        activeIdentity={activeIdentity}
        derivedKeys={derivedKeys}
        profile={activeProfile}
        triggerAlert={triggerAlert}
        onVerified={(proof) => {
          if (proof) setActiveHumanProof(proof);
          setHumanProofRefresh(value => value + 1);
          setShowHumanProofDialog(false);
        }}
      />
    </div>
  );
}
