import React, { useMemo, useState } from 'react';
import Icon from '../../ui/Icon';
import GsnPostCard from './GsnPostCard';
import GsnPostComposer from './GsnPostComposer';

function engagementOf(post) {
  const reactions = Object.values(post?.reactions || {}).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );
  return reactions + (Number(post?.commentCount) || 0) * 2;
}

function ageHoursOf(post) {
  const timestamp = Date.parse(post?.timestamp || '');
  if (!Number.isFinite(timestamp)) return 168;
  return Math.max(0, (Date.now() - timestamp) / 3600000);
}

/* Real "Für dich" ranking: proven engagement (reactions + comments, comments
   weighted higher) decayed by the post's real age. No synthetic scores. */
function forYouScore(post) {
  return (engagementOf(post) + 1) / Math.pow(ageHoursOf(post) + 2, 0.6);
}

function byNewest(left, right) {
  return String(right?.timestamp || '').localeCompare(String(left?.timestamp || ''));
}

/**
 * GSN feed. The four filters rank the real node feed / following feed; nothing
 * is injected when the network has no posts.
 */
export default function GsnFeed({
  activeIdentity,
  myProfile,
  nodeFeed = [],
  followingFeed = [],
  loadingNodeFeed = false,
  loadingFollowingFeed = false,
  visiblePostsCount,
  onFeedScroll,
  expandedComments,
  toggleComments,
  loadingComments,
  activeComments,
  commentTextMap,
  setCommentTextMap,
  handleOpenProfile,
  handleOpenReportModal,
  handleDeletePost,
  handleDeleteComment,
  handleAddComment,
  reactToPost,
  handleRepost,
  createPost,
  repostOfPostId,
  setRepostOfPostId,
  triggerAlert,
  t,
  locale
}) {
  const [activeFilter, setActiveFilter] = useState('for_you');

  const displayFeed = useMemo(() => {
    const source = activeFilter === 'following' ? followingFeed : nodeFeed;
    const list = Array.isArray(source) ? [...source] : [];
    if (activeFilter === 'latest') list.sort(byNewest);
    else if (activeFilter === 'popular') list.sort((a, b) => engagementOf(b) - engagementOf(a) || byNewest(a, b));
    else if (activeFilter === 'following') list.sort(byNewest);
    else list.sort((a, b) => forYouScore(b) - forYouScore(a) || byNewest(a, b));
    return list;
  }, [activeFilter, nodeFeed, followingFeed]);

  const loading = activeFilter === 'following' ? loadingFollowingFeed : loadingNodeFeed;
  const filters = [
    { id: 'for_you', label: 'Für dich', icon: 'star' },
    { id: 'latest', label: 'Aktuell', icon: 'clock' },
    { id: 'popular', label: 'Beliebt', icon: 'activity' },
    { id: 'following', label: 'Folge ich', icon: 'users' }
  ];

  return (
    <section className="vgt-gsn-feed-v2" aria-label={t('gsn_node_feed') || 'GSN Feed'}>
      <div className="vgt-gsn-feed-v2__scroll" onScroll={onFeedScroll}>
        <div className="vgt-gsn-hero">
          <div className="vgt-gsn-hero__backdrop" aria-hidden="true">
            <img src="/ui/aurora_mountains_cinematic.png" alt="" className="vgt-gsn-hero__img" />
            <div className="vgt-gsn-hero__glow" />
          </div>
          <div className="vgt-gsn-hero__content">
            <h1 className="vgt-gsn-hero__title">GSN Social</h1>
            <p className="vgt-gsn-hero__subtitle">
              Das soziale Netzwerk deiner souveränen GaiaCom-Identität.
            </p>
            <div className="vgt-gsn-hero__badges">
              <span className="vgt-gsn-pill">
                <Icon name="shieldCheck" size={14} />
                <span>Datensouverän</span>
              </span>
              <span className="vgt-gsn-pill">
                <Icon name="globe" size={14} />
                <span>Dezentral</span>
              </span>
              <span className="vgt-gsn-pill">
                <Icon name="lock" size={14} />
                <span>Verschlüsselt</span>
              </span>
            </div>
          </div>
        </div>

        {activeIdentity && (
          <GsnPostComposer
            activeIdentity={activeIdentity}
            myProfile={myProfile}
            createPost={createPost}
            repostOfPostId={repostOfPostId}
            setRepostOfPostId={setRepostOfPostId}
            triggerAlert={triggerAlert}
            t={t}
          />
        )}

        <div className="vgt-gsn-filter-bar" role="group" aria-label="Feed filtern">
          <div className="vgt-gsn-filter-tabs">
            {filters.map(filter => (
              <button
                key={filter.id}
                type="button"
                className={`vgt-gsn-filter-pill${activeFilter === filter.id ? ' is-active' : ''}`}
                aria-pressed={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              >
                <Icon name={filter.icon} size={14} />
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="vgt-gsn-feed-v2__stream">
          {loading && displayFeed.length === 0 ? (
            <div className="vgt-gsn-section__state" role="status">
              <Icon name="spinner" size={18} />
              <span>Beiträge werden geladen…</span>
            </div>
          ) : displayFeed.length === 0 ? (
            <div className="vgt-gsn-feed-empty">
              <Icon name="inbox" size={26} />
              <strong>
                {activeFilter === 'following' ? 'Noch keine Beiträge von Kontakten' : 'Noch keine Beiträge im Netzwerk'}
              </strong>
              <span>
                {activeFilter === 'following'
                  ? 'Folge Identitäten im Netzwerk, um hier ihre Beiträge zu sehen.'
                  : 'Teile den ersten echten Beitrag – Trends und Reichweite entstehen aus echten Inhalten.'}
              </span>
            </div>
          ) : (
            displayFeed.slice(0, visiblePostsCount).map(post => (
              <GsnPostCard
                key={post.id}
                post={post}
                activeIdentity={activeIdentity}
                myProfile={myProfile}
                currentFeed={displayFeed}
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
                locale={locale}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
