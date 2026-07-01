// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import DecryptedAvatar from './DecryptedAvatar';
import DecryptedGsnImage from './DecryptedGsnImage';

export default function GsnPostCard({
  post,
  activeIdentity,
  myProfile,
  currentFeed,
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
  t
}) {
  const isMyPost = activeIdentity && activeIdentity.GaiaID && post.gaiaId && post.gaiaId.toLowerCase() === activeIdentity.GaiaID.toLowerCase();
  const isOperator = myProfile?.isVerifiedOperator === true;
  const hasImage = !!post.imageAttachment;
  const referencedPost = post.repostOfPostId ? currentFeed.find(p => p.id === post.repostOfPostId) : null;

  return (
    <div className={`gsn-post-card nebula-social-card ${hasImage ? 'has-media' : ''}`}>
      <div className="gsn-post-header">
        <button type="button" className="gsn-post-avatar-trigger" onClick={() => handleOpenProfile(post.gaiaId)}>
          <DecryptedAvatar avatarJson={post.avatar} displayName={post.displayName} />
        </button>
        <div className="gsn-post-meta">
          <div className="gsn-post-author-row">
            <span className="gsn-post-author" onClick={() => handleOpenProfile(post.gaiaId)}>
              {post.displayName || post.gaiaId}
            </span>
            <div className="gsn-badges">
              {post.isVerifiedOperator && (
                <span className="gsn-badge gsn-badge-op" title="Node Operator">⭐ Operator</span>
              )}
              {post.isVerifiedGovernance && (
                <span className="gsn-badge gsn-badge-gov" title="Governance Board">🛡️ Gov</span>
              )}
              {post.isVerifiedPassport && (
                <span className="gsn-badge gsn-badge-pass" title="Verifizierter Passport">💎 Passport</span>
              )}
            </div>
          </div>
          <span className="gsn-post-gaiaid" onClick={() => handleOpenProfile(post.gaiaId)}>
            {post.gaiaId}
          </span>
        </div>
        <div className="gsn-post-time">
          {new Date(post.timestamp).toLocaleString()}
        </div>
        <div className="gsn-post-admin-actions">
          <button
            type="button"
            className="btn-action gsn-post-admin-btn"
            title={t('gsn_report_post') || 'Beitrag melden'}
            onClick={() => handleOpenReportModal('post', post.id)}
          >
            🚩
          </button>
          {(isMyPost || isOperator) && (
            <button
              type="button"
              className="btn-action gsn-post-admin-btn danger"
              title={t('delete') || 'Löschen'}
              onClick={() => handleDeletePost(post.id)}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="gsn-post-body">
        {post.body}
      </div>

      {/* Render Encrypted Image */}
      {hasImage && (
        <DecryptedGsnImage attachmentJson={post.imageAttachment} />
      )}

      {/* Repost content */}
      {post.repostOfPostId && (
        <div className="gsn-repost-card">
          {referencedPost ? (
            <div>
              <div className="gsn-repost-meta">
                <span className="gsn-repost-author">{referencedPost.displayName}</span>
                <span className="gsn-repost-gaiaid">{referencedPost.gaiaId}</span>
              </div>
              <div className="gsn-repost-body">{referencedPost.body}</div>
            </div>
          ) : (
            <div className="gsn-repost-missing">
              🔄 Shared post: <code>{post.repostOfPostId.slice(0, 8)}...</code>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="gsn-reactions-row">
        {['👍', '❤️', '🔥', '👀'].map(emoji => {
          const reactionCount = (post.reactions && post.reactions[emoji]) || 0;
          const didIReact = post.reactedByMe && post.reactedByMe[emoji] === true;
          return (
            <button
              key={emoji}
              type="button"
              className={`gsn-action-btn ${didIReact ? 'active' : ''}`}
              onClick={() => reactToPost(post.id, emoji)}
            >
              <span>{emoji}</span>
              <span>{reactionCount}</span>
            </button>
          );
        })}

        <button
          type="button"
          className={`gsn-action-btn ${expandedComments[post.id] ? 'active' : ''}`}
          onClick={() => toggleComments(post.id)}
        >
          💬 {post.commentCount || 0}
        </button>

        <button
          type="button"
          className="gsn-action-btn"
          onClick={() => handleRepost(post)}
          title={t('gsn_repost') || 'Teilen / Reposten'}
        >
          🔄
        </button>
      </div>

      {/* Collapsible Comments Section */}
      {expandedComments[post.id] && (
        <div className="gsn-comments-section">
          {loadingComments && !activeComments[post.id] ? (
            <div className="gsn-comments-state">
              Lade Kommentare...
            </div>
          ) : (activeComments[post.id] || []).length === 0 ? (
            <div className="gsn-comments-state">
              Noch keine Kommentare. Schreib den ersten!
            </div>
          ) : (
            (activeComments[post.id] || []).map(comment => {
              const isMyComment = activeIdentity && activeIdentity.GaiaID && comment.gaiaId && comment.gaiaId.toLowerCase() === activeIdentity.GaiaID.toLowerCase();
              return (
                <div key={comment.id} className="gsn-comment-item">
                  <DecryptedAvatar avatarJson={comment.avatar} displayName={comment.displayName} />
                  <div className="gsn-comment-meta">
                    <div className="gsn-comment-header">
                      <span className="gsn-comment-author">{comment.displayName || comment.gaiaId}</span>
                      <div className="gsn-comment-side-actions">
                        <span className="gsn-comment-time">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                        {(isMyComment || isMyPost || isOperator) && (
                          <button
                            type="button"
                            className="btn-action gsn-comment-delete-btn"
                            title={t('delete') || 'Löschen'}
                            onClick={() => handleDeleteComment(post.id, comment.id)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="gsn-comment-body">{comment.body}</div>
                  </div>
                </div>
              );
            })
          )}

          {activeIdentity && (
            <div className="gsn-comment-composer">
              <input
                type="text"
                className="gsn-comment-input"
                placeholder={t('gsn_comment_placeholder') || 'Schreibe einen Kommentar...'}
                value={commentTextMap[post.id] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCommentTextMap(prev => ({ ...prev, [post.id]: val }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddComment(post.id);
                }}
              />
              <button
                type="button"
                className="btn-primary gsn-comment-submit-btn"
                onClick={() => handleAddComment(post.id)}
              >
                💬
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
