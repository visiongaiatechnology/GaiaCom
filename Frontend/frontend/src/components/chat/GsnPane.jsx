import React, { useState, useEffect, useMemo, useRef } from 'react';
import useGsn from '../../hooks/useGsn';
import useGsnActions from '../../hooks/useGsnActions';
import * as api from '../../api';
import { getHumanProof, saveHumanProof } from '../../utils/humanProof';
import { safeJsonParse } from '../../utils/safeJson';
import { useTranslation } from '../../utils/i18n';
import HumanProofDialog from '../common/HumanProofDialog';
import GsnNavRail from './gsn/GsnNavRail';
import GsnFeed from './gsn/GsnFeed';
import GsnRail from './gsn/GsnRail';
import GsnExploreSection from './gsn/GsnExploreSection';
import GsnNetworkSection from './gsn/GsnNetworkSection';
import GsnNotificationsSection from './gsn/GsnNotificationsSection';
import GsnGroupsSection from './gsn/GsnGroupsSection';
import GsnChannelsSection from './gsn/GsnChannelsSection';
import GsnChatDock from './gsn/GsnChatDock';
import GsnProfileDrawer from './gsn/GsnProfileDrawer';
import GsnReportDialog from './gsn/GsnReportDialog';
import { GSN_REPORT_MAX_COMMENT } from './gsn/gsnProtocol';

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

/**
 * GSN (GaiaSocialNetwork) workspace.
 *
 * Everything rendered here is either a real value from the GSN/GaiaCom backend
 * or a real item from another GaiaCom area (chat contacts, group rooms, public
 * channels, GaiaDrive). There are no placeholder posts, metrics or contacts:
 * empty states stay empty.
 */
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
  const { language } = useTranslation();
  const {
    nodeFeed,
    followingFeed,
    loadingNodeFeed,
    loadingFollowingFeed,
    fetchNodeFeed,
    fetchFollowingFeed,
    activeProfile,
    loadingProfile,
    activeComments,
    loadingComments,
    myProfile,
    createPost,
    deletePost,
    reactToPost,
    addComment,
    deleteComment,
    fetchComments,
    followUser,
    unfollowUser,
    fetchProfile,
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
  } = useGsn({ activeIdentity, derivedKeys, triggerAlert });

  const [activeSection, setActiveSection] = useState('home');
  const [expanded, setExpanded] = useState(false);
  const [chatDockOpen, setChatDockOpen] = useState(false);
  const [visiblePostsCount, setVisiblePostsCount] = useState(15);
  const [followPending, setFollowPending] = useState({});
  const [markingRead, setMarkingRead] = useState(false);
  const [showHumanProofDialog, setShowHumanProofDialog] = useState(false);
  const [humanProofRefresh, setHumanProofRefresh] = useState(0);
  const [activeHumanProof, setActiveHumanProof] = useState(null);
  const containerRef = useRef(null);

  const {
    expandedComments,
    commentTextMap,
    setCommentTextMap,
    toggleComments,
    handleAddComment,
    handleDeletePost,
    handleDeleteComment,
    repostOfPostId,
    setRepostOfPostId,
    handleRepost,
    reportModalTarget,
    setReportModalTarget,
    reportCategory,
    setReportCategory,
    reportSeverity,
    setReportSeverity,
    reportComment,
    setReportComment,
    submittingReport,
    handleOpenReportModal,
    handleSubmitReport
  } = useGsnActions({
    activeIdentity,
    addComment,
    deletePost,
    deleteComment,
    fetchComments,
    showConfirm,
    triggerAlert,
    t
  });

  const openOwnProfile = async () => {
    if (!activeIdentity?.GaiaID) return;
    await fetchProfile(activeIdentity.GaiaID);
  };

  const openProfile = async gaiaId => {
    if (!gaiaId) return;
    await fetchProfile(gaiaId);
  };

  const openRoom = room => {
    setActiveRoom?.(room);
    setCurrentMenu?.('groups');
  };

  const openChannel = channel => {
    setActivePublicChannel?.(channel);
    setCurrentMenu?.('public_channels');
  };

  const refreshDiscovery = () => {
    fetchTrends();
    fetchSuggestions();
  };

  const handleFollowSuggestion = async gaiaId => {
    if (!gaiaId || followPending[gaiaId]) return;
    setFollowPending(previous => ({ ...previous, [gaiaId]: true }));
    try {
      await followUser(gaiaId);
      await Promise.all([fetchSuggestions(), fetchMyProfile(), fetchNetwork()]);
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    } finally {
      setFollowPending(previous => {
        const next = { ...previous };
        delete next[gaiaId];
        return next;
      });
    }
  };

  const handleUnfollow = async gaiaId => {
    if (!gaiaId || followPending[gaiaId]) return;
    setFollowPending(previous => ({ ...previous, [gaiaId]: true }));
    try {
      await unfollowUser(gaiaId);
      await Promise.all([fetchNetwork(), fetchSuggestions(), fetchMyProfile()]);
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    } finally {
      setFollowPending(previous => {
        const next = { ...previous };
        delete next[gaiaId];
        return next;
      });
    }
  };

  useEffect(() => {
    fetchNodeFeed();
    fetchFollowingFeed();
    fetchTrends();
    fetchSuggestions();
    fetchNotifications();
  }, [fetchNodeFeed, fetchFollowingFeed, fetchTrends, fetchSuggestions, fetchNotifications]);

  useEffect(() => {
    if (activeSection === 'network') fetchNetwork();
    if (activeSection === 'notifications') {
      fetchNotifications();
    }
  }, [activeSection, fetchNetwork, fetchNotifications]);

  useEffect(() => {
    if (activeSection !== 'notifications' || unreadNotifications === 0 || markingRead) return;
    let cancelled = false;
    setMarkingRead(true);
    markAllNotificationsRead()
      .then(() => {
        if (!cancelled) fetchNotifications();
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMarkingRead(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSection, unreadNotifications, markingRead, markAllNotificationsRead, fetchNotifications]);

  useEffect(() => {
    const container = containerRef.current?.closest('.app-container');
    if (!container) return undefined;
    container.classList.toggle('gsn-expanded', expanded);
    return () => {
      container.classList.remove('gsn-expanded');
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = event => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const handleFeedScroll = event => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      const total = nodeFeed.length + followingFeed.length;
      setVisiblePostsCount(previous => Math.min(previous + 15, Math.max(total, 15)));
    }
  };

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

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await markAllNotificationsRead();
      await fetchNotifications();
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    } finally {
      setMarkingRead(false);
    }
  };

  const handleCreatePost = async (...args) => {
    const created = await createPost(...args);
    fetchMyProfile();
    fetchTrends();
    fetchSuggestions();
    return created;
  };

  const feedSection = (
    <GsnFeed
      activeIdentity={activeIdentity}
      myProfile={myProfile}
      nodeFeed={nodeFeed}
      followingFeed={followingFeed}
      loadingNodeFeed={loadingNodeFeed}
      loadingFollowingFeed={loadingFollowingFeed}
      visiblePostsCount={visiblePostsCount}
      onFeedScroll={handleFeedScroll}
      expandedComments={expandedComments}
      toggleComments={toggleComments}
      loadingComments={loadingComments}
      activeComments={activeComments}
      commentTextMap={commentTextMap}
      setCommentTextMap={setCommentTextMap}
      handleOpenProfile={openProfile}
      handleOpenReportModal={handleOpenReportModal}
      handleDeletePost={handleDeletePost}
      handleDeleteComment={handleDeleteComment}
      handleAddComment={handleAddComment}
      reactToPost={reactToPost}
      handleRepost={handleRepost}
      createPost={handleCreatePost}
      repostOfPostId={repostOfPostId}
      setRepostOfPostId={setRepostOfPostId}
      triggerAlert={triggerAlert}
      t={t}
      locale={language}
    />
  );

  return (
    <div className="chat-container vgt-gsn" ref={containerRef}>
      <div className={`vgt-gsn__layout${expanded ? ' is-expanded' : ''}${activeSection !== 'home' ? ' has-no-rail' : ''}`}>
        <GsnNavRail
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          onOpenMessages={() => setChatDockOpen(open => !open)}
          messagesOpen={chatDockOpen}
          notificationCount={unreadNotifications}
          expanded={expanded}
          onToggleExpanded={() => setExpanded(value => !value)}
          onOpenCloud={() => setCurrentMenu?.('vault')}
          myProfile={myProfile}
          activeIdentity={activeIdentity}
          onOpenOwnProfile={openOwnProfile}
        />

        <div className="vgt-gsn-main" id="gsn-main">
          {activeSection === 'home' && feedSection}
          {activeSection === 'explore' && (
            <GsnExploreSection
              trends={trends}
              loadingTrends={loadingTrends}
              trendsError={trendsError}
              suggestions={suggestions}
              loadingSuggestions={loadingSuggestions}
              suggestionsError={suggestionsError}
              onRetry={refreshDiscovery}
              onFollowSuggestion={handleFollowSuggestion}
              followPending={followPending}
              onOpenProfile={openProfile}
            />
          )}
          {activeSection === 'network' && (
            <GsnNetworkSection
              network={network}
              loadingNetwork={loadingNetwork}
              networkError={networkError}
              onRetry={fetchNetwork}
              onFollow={handleFollowSuggestion}
              onUnfollow={handleUnfollow}
              followPending={followPending}
              onOpenProfile={openProfile}
            />
          )}
          {activeSection === 'notifications' && (
            <GsnNotificationsSection
              notifications={notifications}
              unreadCount={unreadNotifications}
              loadingNotifications={loadingNotifications}
              notificationsError={notificationsError}
              markingRead={markingRead}
              onMarkAllRead={handleMarkAllRead}
              onOpenProfile={openProfile}
              onRetry={fetchNotifications}
            />
          )}
          {activeSection === 'groups' && (
            <GsnGroupsSection
              rooms={rooms}
              onOpenRoom={openRoom}
              onOpenGroupMenu={() => setCurrentMenu?.('groups')}
            />
          )}
          {activeSection === 'channels' && (
            <GsnChannelsSection
              channels={publicChannels}
              onOpenChannel={openChannel}
              onOpenChannelsMenu={() => setCurrentMenu?.('public_channels')}
            />
          )}
        </div>

        {activeSection === 'home' && (
          <GsnRail
            myProfile={myProfile}
            activeIdentity={activeIdentity}
            onOpenOwnProfile={openOwnProfile}
            onEditProfile={() => {
              setActiveProfile(null);
              setCurrentMenu?.('profile');
            }}
            trends={trends}
            loadingTrends={loadingTrends}
            trendsError={trendsError}
            suggestions={suggestions}
            loadingSuggestions={loadingSuggestions}
            suggestionsError={suggestionsError}
            onFollowSuggestion={handleFollowSuggestion}
            onOpenProfile={openProfile}
            followPending={followPending}
          />
        )}
      </div>
      <GsnChatDock
        open={chatDockOpen}
        onClose={() => setChatDockOpen(false)}
        contacts={contacts}
        chatMessages={chatMessages}
        activeIdentity={activeIdentity}
        activeChatContact={activeChatContact}
        setActiveChatContact={setActiveChatContact}
        chatInputText={chatInputText}
        setChatInputText={setChatInputText}
        handleSendChatMessage={handleSendChatMessage}
        onOpenFullChat={() => {
          setChatDockOpen(false);
          setCurrentMenu?.('chat');
        }}
        t={t}
      />

      {activeProfile && (
        <GsnProfileDrawer
          activeProfile={activeProfile}
          loadingProfile={loadingProfile}
          activeTrustSummary={activeTrustSummary}
          activeHumanProof={activeHumanProof}
          isOwnActiveProfile={isOwnActiveProfile}
          setActiveProfile={setActiveProfile}
          setShowHumanProofDialog={setShowHumanProofDialog}
          followUser={followUser}
          unfollowUser={unfollowUser}
          handleOpenReportModal={handleOpenReportModal}
          onEditProfile={() => {
            setActiveProfile(null);
            setCurrentMenu?.('profile');
          }}
          t={t}
        />
      )}
      {reportModalTarget && (
        <GsnReportDialog
          t={t}
          reportCategory={reportCategory}
          setReportCategory={setReportCategory}
          reportSeverity={reportSeverity}
          setReportSeverity={setReportSeverity}
          reportComment={reportComment}
          setReportComment={setReportComment}
          submittingReport={submittingReport}
          onSubmit={handleSubmitReport}
          onClose={() => setReportModalTarget(null)}
        />
      )}
      <HumanProofDialog
        show={showHumanProofDialog}
        onClose={() => setShowHumanProofDialog(false)}
        activeIdentity={activeIdentity}
        derivedKeys={derivedKeys}
        profile={activeProfile}
        triggerAlert={triggerAlert}
        onVerified={proof => {
          if (proof) setActiveHumanProof(proof);
          setHumanProofRefresh(value => value + 1);
          setShowHumanProofDialog(false);
        }}
      />
    </div>
  );
}
