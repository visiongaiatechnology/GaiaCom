import React from 'react';
import Icon from '../../ui/Icon';
import { renderMarkdown } from '../../../utils/markdown';
import { useTranslation } from '../../../utils/i18n';
import ReactionControl from '../../common/ReactionControl';
import { CHANNEL_REACTIONS, ChannelAvatar, EncryptedImage, formatChannelDate } from './channelMedia';

/**
 * One channel post: channel provenance, markdown body, encrypted media,
 * the shared heart-first reaction control and the collapsible comment drawer.
 * All reactions/comments are server-backed through the existing pane handlers;
 * pinned/scheduled markers are derived from the post payload only.
 */
export default function ChannelPostCard({
  post,
  channelName,
  channelAvatar,
  locale,
  activeIdentity,
  ct,
  isAdmin,
  commentsDisabled = false,
  commentsExpanded,
  onToggleComments,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  onDeleteComment,
  onModerateComment,
  onTogglePin,
  onReact
}) {
  const attachments = Array.isArray(post.attachments) ? post.attachments : [];
  const { t } = useTranslation();
  const reactions = post.reactionState?.reactions || {};
  const reactedByMe = post.reactionState?.reactedByMe || {};
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const isPinned = !!post.isPinned;
  const isScheduled = Boolean(post.scheduledFor) && new Date(post.scheduledFor) > new Date();
  const commentsId = `channel-post-comments-${post.id}`;

  return (
    <article className={`vgt-ch-post${isPinned ? ' is-pinned' : ''}`}>
      <header className="vgt-ch-post__head">
        <ChannelAvatar avatar={channelAvatar} name={channelName} size="sm" />
        <div className="vgt-ch-post__byline">
          <div className="vgt-ch-post__name-row">
            <strong>{channelName}</strong>
            {isPinned && (
              <span className="vgt-ch-post__badge">
                <Icon name="pin" size={11} />
                {ct('pinned')}
              </span>
            )}
            {isScheduled && (
              <span className="vgt-ch-post__badge">
                <Icon name="clock" size={11} />
                {ct('plan_post')}
              </span>
            )}
          </div>
          <time dateTime={post.createdAt || undefined}>{formatChannelDate(post.createdAt, locale)}</time>
        </div>
        {isAdmin && (
          <button
            type="button"
            className={`vgt-ch-post__pin${isPinned ? ' is-active' : ''}`}
            onClick={() => onTogglePin(post)}
            title={isPinned ? ct('unpin') : ct('pin')}
            aria-label={isPinned ? ct('unpin') : ct('pin')}
          >
            <Icon name="pin" size={14} />
          </button>
        )}
      </header>

      {post.body && <div className="vgt-ch-post__body">{renderMarkdown(post.body)}</div>}

      {attachments.map((attachment, index) =>
        attachment?.type === 'encrypted-image' ? (
          <EncryptedImage key={`${post.id}-${index}`} attachment={attachment} />
        ) : null
      )}

      <div className="vgt-ch-post__bar">
        <ReactionControl
          options={CHANNEL_REACTIONS}
          reactions={reactions}
          reactedByMe={reactedByMe}
          onReact={token => onReact(post.id, token)}
          label={t('message_reactions') || 'Reaktionen'}
        />
        <button
          type="button"
          className="vgt-ch-post__action"
          aria-expanded={commentsExpanded}
          aria-controls={commentsId}
          onClick={() => onToggleComments(post.id)}
        >
          <Icon name="chat" size={14} />
          <span>{ct('comments')}</span>
          <span className="vgt-numeric">{comments.length}</span>
        </button>
      </div>

      {commentsExpanded && (
        <section className="vgt-ch-comments" id={commentsId} aria-label={ct('comments')}>
          {comments.length === 0 ? (
            <p className="vgt-ch-comments__empty">{ct('no_comments')}</p>
          ) : (
            <ul className="vgt-ch-comments__list">
              {comments.map(comment => {
                const isAuthor = comment.authorIdentityId === activeIdentity.ID;
                const canModerate = isAdmin || isAuthor;
                const author = comment.authorDisplayName || comment.authorGaiaId || ct('anonymous');
                return (
                  <li key={comment.id} className="vgt-ch-comment">
                    <span className="vgt-ch-comment__avatar" aria-hidden="true">
                      {String(author).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="vgt-ch-comment__body">
                      <strong>{author}</strong>
                      <span>{comment.body}</span>
                    </div>
                    {canModerate && (
                      <button
                        type="button"
                        className="vgt-ch-comment__delete"
                        title={ct('delete_comment')}
                        aria-label={ct('delete_comment')}
                        onClick={() => {
                          if (isAdmin) {
                            onModerateComment(post.id, comment.id, 'deleted');
                          } else {
                            onDeleteComment(post.id, comment.id);
                          }
                        }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {commentsDisabled ? (
            <p className="vgt-ch-comments__empty">{ct('comments_disabled')}</p>
          ) : activeIdentity ? (
            <form
              className="vgt-ch-comment-form"
              onSubmit={event => {
                event.preventDefault();
                onSubmitComment(post.id, event);
              }}
            >
              <label className="vgt-sr-only" htmlFor={`${commentsId}-input`}>
                {ct('comment_placeholder')}
              </label>
              <input
                id={`${commentsId}-input`}
                type="text"
                className="input-field"
                placeholder={ct('comment_placeholder')}
                value={commentText || ''}
                onChange={event => onCommentTextChange(post.id, event.target.value)}
                required
              />
              <button type="submit" className="vgt-ch-comment-form__send" aria-label={ct('send')}>
                <Icon name="send" size={15} />
              </button>
            </form>
          ) : null}
        </section>
      )}
    </article>
  );
}
