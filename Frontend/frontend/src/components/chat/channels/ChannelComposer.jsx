import React from 'react';
import Icon from '../../ui/Icon';
import { MAX_POST_CHARS } from './channelMedia';

/**
 * Admin composer for channel posts: markdown-lite formatting, one encrypted
 * image attachment and optional scheduled publication. All state lives in the
 * pane; this component only renders controls and forwards the existing events.
 */
export default function ChannelComposer({
  ct,
  postBody,
  handlePostBodyChange,
  postAttachments,
  scheduledForInput,
  setScheduledForInput,
  busy,
  error,
  submitPost,
  wrapSelection,
  handlePostImage,
  postRef
}) {
  const [showSchedule, setShowSchedule] = React.useState(false);

  return (
    <form className="vgt-ch-composer" onSubmit={submitPost}>
      {showSchedule && (
        <div className="vgt-ch-composer__schedule-bar">
          <label className="vgt-label" htmlFor="channel-schedule-input">
            <Icon name="clock" size={14} /> {ct('plan_label')}
          </label>
          <input
            id="channel-schedule-input"
            type="datetime-local"
            className="input-field vgt-input--compact"
            value={scheduledForInput}
            onChange={event => setScheduledForInput(event.target.value)}
          />
          {scheduledForInput && (
            <button type="button" className="btn-ghost" onClick={() => setScheduledForInput('')}>
              {ct('reset')}
            </button>
          )}
          <button type="button" className="btn-icon" onClick={() => setShowSchedule(false)} title="Schließen">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <div className="vgt-ch-composer__dock">
        <div className="vgt-ch-composer__tools">
          <button type="button" className="btn-icon" title={ct('format_bold')} aria-label={ct('format_bold')} onClick={() => wrapSelection('**')}>
            <strong>B</strong>
          </button>
          <button type="button" className="btn-icon" title={ct('format_italic')} aria-label={ct('format_italic')} onClick={() => wrapSelection('*')}>
            <em>I</em>
          </button>
          <label className="btn-icon vgt-file-button" title={ct('attached_image')}>
            <Icon name="image" size={16} />
            <input type="file" accept="image/*" onChange={handlePostImage} className="vgt-sr-only" tabIndex={-1} aria-hidden="true" />
          </label>
          <button
            type="button"
            className={`btn-icon${scheduledForInput || showSchedule ? ' is-active' : ''}`}
            title={ct('plan_post')}
            onClick={() => setShowSchedule(prev => !prev)}
          >
            <Icon name="clock" size={16} />
          </button>
        </div>

        <textarea
          id="channel-post-body"
          ref={postRef}
          className="vgt-ch-composer__input"
          value={postBody}
          maxLength={MAX_POST_CHARS}
          onChange={event => handlePostBodyChange(event.target.value)}
          placeholder={ct('post_placeholder') || 'Teile ein verschlüsseltes Update...'}
          rows={1}
        />

        <div className="vgt-ch-composer__end">
          {postAttachments.length > 0 && (
            <span className="vgt-badge" title="Bild angehängt">
              <Icon name="image" size={12} />
            </span>
          )}
          <button
            type="submit"
            className="btn-primary vgt-ch-composer__submit"
            disabled={busy || (!postBody.trim() && postAttachments.length === 0)}
          >
            <Icon name="send" size={15} />
            <span>{busy ? ct('publishing') : scheduledForInput ? ct('plan_post') : ct('publish')}</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
