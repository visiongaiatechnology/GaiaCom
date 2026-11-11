import React from 'react';
import Icon from '../../ui/Icon';
import DecryptedAvatar from './DecryptedAvatar';
import DecryptedGsnImage from './DecryptedGsnImage';
import ReactionControl from '../../common/ReactionControl';
import { GSN_REACTION_TOKENS, formatGsnTime } from './gsnProtocol';

/**
 * One GSN post: author provenance, verification badges, encrypted media,
 * repost context, reaction row and the collapsible comment thread.
 * Decryption components keep their existing props and boundaries unchanged.
 */
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
  t,
  locale
}) {
  const isMyPost =
    activeIdentity &&
    activeIdentity.GaiaID &&
    post.gaiaId &&
    post.gaiaId.toLowerCase() === activeIdentity.GaiaID.toLowerCase();
  const isOperator = myProfile?.isVerifiedOperator === true;
  const hasImage = !!post.imageAttachment;
  const referencedPost = post.repostOfPostId ? currentFeed.find(item => item.id === post.repostOfPostId) : null;
  const comments = activeComments[post.id] || [];
  const isExpanded = !!expandedComments[post.id];

  return (
    <article className={`vgt-gsn-post${hasImage ? ' has-media' : ''}`}>
      <header className="vgt-gsn-post__head">
        <button type="button" className="vgt-gsn-post__avatar" onClick={() => handleOpenProfile(post.gaiaId)} aria-label={post.displayName || post.gaiaId}>
          <DecryptedAvatar avatarJson={post.avatar} displayName={post.displayName} />
        </button>

        <div className="vgt-gsn-post__meta">
          <div className="vgt-gsn-post__author-row">
            <button type="button" className="vgt-gsn-post__author" onClick={() => handleOpenProfile(post.gaiaId)}>
              {post.displayName || post.gaiaId}
            </button>
            <span className="vgt-gsn-post__badges">
              {post.isVerifiedOperator && (
                <span className="vgt-badge vgt-badge--seal" title={t('ac_tab_operator') || 'Node Operator'}>
                  <Icon name="verified" size={12} />
                  Operator
                </span>
              )}
              {post.isVerifiedGovernance && (
                <span className="vgt-badge" title="Governance Board">
                  <Icon name="shieldCheck" size={12} />
                  Governance
                </span>
              )}
              {post.isVerifiedPassport && (
                <span className="vgt-badge" title="Verifizierter Passport">
                  <Icon name="seal" size={12} />
                  Passport
                </span>
              )}
            </span>
          </div>
          <button type="button" className="vgt-gsn-post__gaia" onClick={() => handleOpenProfile(post.gaiaId)}>
            {post.gaiaId}
          </button>
        </div>

        <time className="vgt-gsn-post__time" dateTime={post.timestamp || undefined}>
          {formatGsnTime(post.timestamp, locale)}
        </time>

        <div className="vgt-gsn-post__tools">
          <button
            type="button"
            className="btn-icon"
            title={t('gsn_report_post') || 'Beitrag melden'}
            aria-label={t('gsn_report_post') || 'Beitrag melden'}
            onClick={() => handleOpenReportModal('post', post.id)}
          >
            <Icon name="alertTriangle" size={15} />
          </button>
          {(isMyPost || isOperator) && (
            <button
              type="button"
              className="btn-icon vgt-danger-text"
              title={t('delete') || 'Löschen'}
              aria-label={t('delete') || 'Löschen'}
              onClick={() => handleDeletePost(post.id)}
            >
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>
      </header>

      {post.body && <div className="vgt-gsn-post__body">{post.body}</div>}

      {hasImage && <DecryptedGsnImage attachmentJson={post.imageAttachment} />}

      {post.repostOfPostId && (
        <div className="vgt-gsn-repost">
          {referencedPost ? (
            <>
              <div className="vgt-gsn-repost__meta">
                <span>{referencedPost.displayName}</span>
                <span className="vgt-id">{referencedPost.gaiaId}</span>
              </div>
              <div className="vgt-gsn-repost__body">{referencedPost.body}</div>
            </>
          ) : (
            <div className="vgt-gsn-repost__missing">
              <Icon name="sync" size={14} />
              Geteilter Beitrag <code className="vgt-id">{String(post.repostOfPostId).slice(0, 8)}…</code>
            </div>
          )}
        </div>
      )}

      <div className="vgt-gsn-post__actions">
        <ReactionControl
          options={GSN_REACTION_TOKENS}
          reactions={post.reactions || {}}
          reactedByMe={post.reactedByMe || {}}
          onReact={token => reactToPost(post.id, token)}
          label={t('message_reactions') || 'Reaktionen'}
        />

        <div className="vgt-gsn-post__tools">
          <button
            type="button"
            className="btn-ghost"
            aria-expanded={isExpanded}
            aria-controls={`gsn-comments-${post.id}`}
            onClick={() => toggleComments(post.id)}
          >
            <Icon name="chat" size={14} />
            <span className="vgt-numeric">{post.commentCount || 0}</span>
          </button>
          <button type="button" className="btn-ghost" onClick={() => handleRepost(post)} title={t('gsn_repost') || 'Teilen / Reposten'}>
            <Icon name="sync" size={14} />
            <span>{t('gsn_repost') || 'Teilen'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <section className="vgt-gsn-comments" id={`gsn-comments-${post.id}`} aria-label="Kommentare">
          {loadingComments && comments.length === 0 ? (
            <div className="vgt-state" role="status">
              <Icon name="spinner" size={16} />
              <span>Lade Kommentare…</span>
            </div>
          ) : comments.length === 0 ? (
            <p className="vgt-caption">Noch keine Kommentare.</p>
          ) : (
            <ul className="vgt-gsn-comments__list">
              {comments.map(comment => {
                const isMyComment =
                  activeIdentity && activeIdentity.GaiaID && comment.gaiaId
                    ? comment.gaiaId.toLowerCase() === activeIdentity.GaiaID.toLowerCase()
                    : false;
                return (
                  <li key={comment.id} className="vgt-gsn-comment">
                    <DecryptedAvatar avatarJson={comment.avatar} displayName={comment.displayName} />
                    <div className="vgt-gsn-comment__body">
                      <div className="vgt-gsn-comment__head">
                        <strong>{comment.displayName || comment.gaiaId}</strong>
                        <time>{formatGsnTime(comment.timestamp, locale)}</time>
                      </div>
                      <span>{comment.body}</span>
                    </div>
                    {(isMyComment || isMyPost || isOperator) && (
                      <button
                        type="button"
                        className="btn-icon vgt-danger-text"
                        title={t('delete') || 'Löschen'}
                        aria-label={t('delete') || 'Löschen'}
                        onClick={() => handleDeleteComment(post.id, comment.id)}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {activeIdentity && (
            <form
              className="vgt-gsn-comment-form"
              onSubmit={event => {
                event.preventDefault();
                handleAddComment(post.id);
              }}
            >
              <label className="vgt-sr-only" htmlFor={`gsn-comment-input-${post.id}`}>
                {t('gsn_comment_placeholder') || 'Schreibe einen Kommentar…'}
              </label>
              <input
                id={`gsn-comment-input-${post.id}`}
                type="text"
                className="input-field"
                placeholder={t('gsn_comment_placeholder') || 'Schreibe einen Kommentar…'}
                value={commentTextMap[post.id] || ''}
                onChange={event => {
                  const value = event.target.value;
                  setCommentTextMap(prev => ({ ...prev, [post.id]: value }));
                }}
              />
              <button type="submit" className="btn-primary" aria-label={t('gsn_comment_send') || 'Kommentar senden'}>
                <Icon name="send" size={15} />
              </button>
            </form>
          )}
        </section>
      )}
    </article>
  );
}
