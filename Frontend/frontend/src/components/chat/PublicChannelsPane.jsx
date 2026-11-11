import React, { useState } from 'react';
import { useTranslation } from '../../utils/i18n';
import { channelTranslations } from '../../utils/channelsTranslations';
import Icon from '../ui/Icon';
import ChannelsDiscovery from './channels/ChannelsDiscovery';
import ChannelEditor from './channels/ChannelEditor';
import ChannelHeader from './channels/ChannelHeader';
import ChannelPostCard from './channels/ChannelPostCard';
import ChannelComposer from './channels/ChannelComposer';
import { ChannelActionsSheet, ChannelCategorySheet, ChannelReportDialog } from './channels/ChannelSheets';
import useChannelsPane from './channels/useChannelsPane';
import useChannelVerification from './channels/useChannelVerification';
import { displayGaiaID } from '../../utils/gaiaAddress';

/**
 * Public Channels workspace (view layer).
 *
 * State, effects and mutations live in `channels/useChannelsPane`; this module
 * only composes the sub-views. Props/callbacks are the pre-redesign contract.
 */
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
  const { verification, refreshVerification } = useChannelVerification({
    enabled: Boolean(activeIdentity && activePublicChannel && activePublicChannel.isVerified)
  });
  const ct = key => {
    const dict = channelTranslations[language] || channelTranslations.de;
    return dict[key] || channelTranslations.de[key] || key;
  };
  const categoryLabel = category => ct(`category_${String(category).toLowerCase()}`);

  const pane = useChannelsPane({
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
    handleDeleteComment,
    handleModerateComment,
    publicChannelPosts,
    onVerificationRefresh: refreshVerification,
    ct,
    categoryLabel
  });

  const [channelSearchOpen, setChannelSearchOpen] = useState(false);

  if (!activeIdentity) {
    return (
      <div className="chat-container vgt-ch vgt-ch--empty">
        <button type="button" className="mobile-floating-menu mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
          {ct('menu')}
        </button>
        <div className="vgt-empty">
          <Icon name="globe" size={28} />
          <strong>{ct('create_header')}</strong>
          <span className="vgt-body vgt-body--sm">{ct('create_identity_msg')}</span>
        </div>
      </div>
    );
  }

  const showForm = pane.mode === 'create' || pane.mode === 'edit';
  const channel = pane.displayChannel || activePublicChannel;

  return (
    <div className={`chat-container vgt-ch${activePublicChannel ? ' has-channel vgt-ch--detail' : ''}`}>
      <div className="detail-mobile-actions vgt-pane-mobile">
        <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
          {ct('menu')}
        </button>
        {activePublicChannel && (
          <button type="button" className="mobile-back-btn" onClick={pane.handleReturnToChannelOverview}>
            {ct('overview')}
          </button>
        )}
        {!activePublicChannel && !showForm && (
          <button type="button" className="mobile-back-btn" onClick={() => pane.setMobileCategoryOpen(true)}>
            {ct('category')}: {categoryLabel(pane.discoverCategory)}
          </button>
        )}
      </div>

      {publicChannelsError && (
        <div className="vgt-notice vgt-notice--warn" role="status">
          <Icon name="alertTriangle" size={16} />
          <div>
            <strong>{ct('channels_backend_unavailable')}</strong>
            <span>
              {publicChannelsError}. {ct('channels_backend_unavailable_desc')}
            </span>
          </div>
        </div>
      )}

      {showForm ? (
        <ChannelEditor
          mode={pane.mode}
          ct={ct}
          categoryLabel={categoryLabel}
          nameInput={pane.nameInput}
          setNameInput={pane.setNameInput}
          descriptionInput={pane.descriptionInput}
          setDescriptionInput={pane.setDescriptionInput}
          categoryInput={pane.categoryInput}
          setCategoryInput={pane.setCategoryInput}
          avatarEnvelope={pane.avatarEnvelope}
          handleAvatarFile={pane.handleAvatarFile}
          submitChannel={pane.submitChannel}
          cancel={() => {
            if (setCreatorOpen) setCreatorOpen(false);
            pane.setMode('view');
          }}
          busy={pane.busy}
          error={pane.error}
        />
      ) : channel ? (
        <>
          <ChannelHeader
            channel={channel}
            ct={ct}
            categoryLabel={categoryLabel}
            isOperator={pane.isOperator}
            busy={pane.busy}
            ownerDisplayName={pane.ownerDisplayName}
            verification={verification}
            displayGaiaID={displayGaiaID}
            onToggleSubscription={toggleSubscription}
            onOpenActions={() => pane.setChannelActionsOpen(true)}
            onToggleSearch={() => setChannelSearchOpen(prev => !prev)}
            isSearchOpen={channelSearchOpen || Boolean(pane.postSearchText)}
          />

          {(channelSearchOpen || pane.postSearchText) && (
            <div className="vgt-ch-toolbar">
              <div className="vgt-ch-search">
                <Icon name="search" size={16} />
                <label className="vgt-sr-only" htmlFor="channel-post-search">
                  {ct('search_posts')}
                </label>
                <input
                  id="channel-post-search"
                  type="search"
                  className="vgt-ch-search-input"
                  placeholder={ct('search_posts')}
                  value={pane.postSearchText}
                  onChange={event => pane.setPostSearchText(event.target.value)}
                  autoFocus
                />
                {pane.postSearchText && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => pane.setPostSearchText('')}
                    title="Zurücksetzen"
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
              <span className="vgt-caption">
                <span className="vgt-numeric">{pane.postSearchText ? pane.filteredCount : publicChannelPosts.length}</span> Beiträge
              </span>
            </div>
          )}

          <section ref={pane.postsScrollRef} className="vgt-ch-posts vgt-scroll-page" aria-label="Beiträge">
            {publicChannelPostsLoading ? (
              <div className="vgt-state" role="status">
                <Icon name="spinner" size={18} />
                <span>{ct('searching')}</span>
              </div>
            ) : pane.visiblePosts.length === 0 ? (
              <div className="vgt-empty">
                <Icon name="megaphone" size={26} />
                <strong>{ct('no_posts')}</strong>
                <span className="vgt-body vgt-body--sm">{ct('no_description')}</span>
              </div>
            ) : (
              pane.visiblePosts.map(post => (
                <ChannelPostCard
                  key={post.id}
                  post={post}
                  channelName={channel.name}
                  channelAvatar={channel.avatar}
                  locale={language}
                  activeIdentity={activeIdentity}
                  ct={ct}
                  isAdmin={!!channel.isAdmin}
                  commentsDisabled={channel.commentsEnabled === false}
                  commentsExpanded={!!pane.expandedCommentPostIds[post.id]}
                  onToggleComments={postId =>
                    pane.setExpandedCommentPostIds(prev => ({ ...prev, [postId]: !prev[postId] }))
                  }
                  commentText={pane.commentInputTexts[post.id] || ''}
                  onCommentTextChange={(postId, value) =>
                    pane.setCommentInputTexts(prev => ({ ...prev, [postId]: value }))
                  }
                  onSubmitComment={pane.handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onModerateComment={handleModerateComment}
                  onTogglePin={pane.handleTogglePinPost}
                  onReact={pane.handleReactToPost}
                />
              ))
            )}
          </section>

          {channel.isAdmin && !channel.isSuspended && (
            <ChannelComposer
              ct={ct}
              postBody={pane.postBody}
              handlePostBodyChange={pane.handlePostBodyChange}
              postAttachments={pane.postAttachments}
              scheduledForInput={pane.scheduledForInput}
              setScheduledForInput={pane.setScheduledForInput}
              busy={pane.busy}
              error={pane.error}
              submitPost={pane.submitPost}
              wrapSelection={pane.wrapSelection}
              handlePostImage={pane.handlePostImage}
              postRef={pane.postRef}
            />
          )}
        </>
      ) : (
        <ChannelsDiscovery
          ct={ct}
          categoryLabel={categoryLabel}
          activeTab={pane.activeTab}
          setActiveTab={pane.setActiveTab}
          setMode={pane.setMode}
          discoverQuery={pane.discoverQuery}
          setDiscoverQuery={pane.setDiscoverQuery}
          discoverCategory={pane.discoverCategory}
          handleDiscoverCategory={pane.handleDiscoverCategory}
          handleDiscoverChannels={handleDiscoverChannels}
          discoverLoading={discoverLoading}
          discoverResults={discoverResults}
          toggleSubscription={toggleSubscription}
          handleBlockChannel={handleBlockChannel}
          onOpenChannel={(channel) => setActivePublicChannel(channel)}
        />
      )}

      {pane.mobileCategoryOpen && (
        <ChannelCategorySheet
          ct={ct}
          categoryLabel={categoryLabel}
          discoverCategory={pane.discoverCategory}
          handleDiscoverCategory={pane.handleDiscoverCategory}
          onClose={() => pane.setMobileCategoryOpen(false)}
        />
      )}

      {pane.reportModalOpen && channel && (
        <ChannelReportDialog
          ct={ct}
          channel={channel}
          reportCategory={pane.reportCategory}
          setReportCategory={pane.setReportCategory}
          reportSeverity={pane.reportSeverity}
          setReportSeverity={pane.setReportSeverity}
          reportComment={pane.reportComment}
          setReportComment={pane.setReportComment}
          onSubmit={pane.submitReportHandler}
          onClose={() => pane.setReportModalOpen(false)}
          busy={pane.busy}
        />
      )}

      {pane.channelActionsOpen && channel && (
        <ChannelActionsSheet
          ct={ct}
          channel={channel}
          isOperator={pane.isOperator}
          busy={pane.busy}
          onToggleSubscription={() => {
            pane.setChannelActionsOpen(false);
            toggleSubscription(channel);
          }}
          onEdit={() => {
            pane.setChannelActionsOpen(false);
            pane.setMode('edit');
          }}
          onToggleComments={() => {
            pane.setChannelActionsOpen(false);
            pane.handleToggleComments();
          }}
          onDelete={() => {
            pane.setChannelActionsOpen(false);
            pane.handleDeleteChannelClick();
          }}
          onToggleVerification={() => {
            pane.setChannelActionsOpen(false);
            pane.handleToggleVerification();
          }}
          onBlock={() => {
            pane.setChannelActionsOpen(false);
            handleBlockChannel(channel.id);
          }}
          onReport={() => {
            pane.setChannelActionsOpen(false);
            pane.setReportModalOpen(true);
          }}
          onClose={() => pane.setChannelActionsOpen(false)}
        />
      )}
    </div>
  );
};

export default PublicChannelsPane;
