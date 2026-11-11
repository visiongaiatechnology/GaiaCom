import React, { Suspense, lazy } from 'react';
const PublicChannelsPane = lazy(() => import('../../../chat/PublicChannelsPane'));
import PaneFallback from '../PaneFallback';

/**
 * PaneChannels — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneChannels(props) {
  const {
    activeIdentity,
    activePublicChannel,
    contacts,
    createPublicChannel,
    createPublicChannelPost,
    createPublicChannelPostComment,
    currentMenu,
    deleteChannel,
    discoverLoading,
    discoverResults,
    handleBlockChannel,
    handleDeleteComment,
    handleDiscoverChannels,
    handleModerateComment,
    handleUnblockChannel,
    publicChannelCreatorOpen,
    publicChannelPosts,
    publicChannelPostsLoading,
    publicChannelsError,
    reportChannel,
    setActivePublicChannel,
    setMobileMenuOpen,
    setPublicChannelCreatorOpen,
    showConfirm,
    togglePublicChannelPostPin,
    togglePublicChannelPostReaction,
    togglePublicChannelSubscription,
    triggerAlert,
    updatePublicChannel,
    updatePublicChannelComments,
    verifyChannel,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'public_channels' && (
          <PublicChannelsPane
            activeIdentity={activeIdentity}
            activePublicChannel={activePublicChannel}
            setActivePublicChannel={setActivePublicChannel}
            creatorOpen={publicChannelCreatorOpen}
            setCreatorOpen={setPublicChannelCreatorOpen}
            publicChannelPosts={publicChannelPosts}
            publicChannelsError={publicChannelsError}
            publicChannelPostsLoading={publicChannelPostsLoading}
            createChannel={createPublicChannel}
            updateChannel={updatePublicChannel}
            toggleSubscription={togglePublicChannelSubscription}
            createPost={createPublicChannelPost}
            togglePostReaction={togglePublicChannelPostReaction}
            createPostComment={createPublicChannelPostComment}
            togglePostPin={togglePublicChannelPostPin}
            updateChannelComments={updatePublicChannelComments}
            reportChannel={reportChannel}
            deleteChannel={deleteChannel}
            verifyChannel={verifyChannel}
            discoverResults={discoverResults}
            discoverLoading={discoverLoading}
            handleBlockChannel={handleBlockChannel}
            handleUnblockChannel={handleUnblockChannel}
            handleDiscoverChannels={handleDiscoverChannels}
            handleDeleteComment={handleDeleteComment}
            handleModerateComment={handleModerateComment}
            showConfirm={showConfirm}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
            contacts={contacts}
          />
        )}
        </Suspense>
    </>
  );
}
