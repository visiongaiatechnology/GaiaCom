import React from 'react';
import Icon from '../../ui/Icon';
import { ReplyComposerPreview, ScrollToLatestButton } from '../MessageActions';
import { COMPOSER_EMOJIS } from '../shared/emojiSet';

/**
 * Composer of a group channel. Read-only mode and slow mode disable sending;
 * both are real room rules, not decoration.
 */
export default function GroupComposer({
  channelName,
  inputRef,
  chatInputText,
  onInputChange,
  onKeyDown,
  disabled,
  placeholder,
  isReadOnly,
  slowModeSeconds,
  showEmojiPicker,
  onToggleEmojiPicker,
  onAppendEmoji,
  mentionMenuOpen,
  mentionSuggestions,
  selectedMentionIndex,
  onApplyMention,
  replyTarget,
  onClearReply,
  pendingMessageCount,
  onScrollToLatest,
  onSend,
  t
}) {
  const canSend = !disabled && chatInputText.trim().length > 0;

  return (
    <div className="vgt-chat-composer">
      <ScrollToLatestButton count={pendingMessageCount} onClick={onScrollToLatest} />

      <ReplyComposerPreview replyTarget={replyTarget} onClear={onClearReply} t={t} />

      {isReadOnly ? (
        <p className="vgt-group__composer-note">
          <Icon name="lock" size={13} />
          <span>Nur Owner und Admins können in diesem Kanal schreiben.</span>
        </p>
      ) : null}

      <form className="vgt-chat-composer__form" onSubmit={onSend}>
        <div className="vgt-chat-composer__tools">
          <div className="vgt-chat-anchor">
            <button
              type="button"
              className="btn-action vgt-chat-composer__tool"
              onClick={onToggleEmojiPicker}
              disabled={disabled}
              aria-label="Emoji-Auswahl öffnen"
              aria-expanded={showEmojiPicker}
              aria-haspopup="listbox"
              title="Emoji"
            >
              <Icon name="smile" size={17} />
            </button>
            {showEmojiPicker ? (
              <div className="vgt-chat-emojis vgt-glass vgt-glass--floating" role="listbox" aria-label="Emoji Auswahl">
                {COMPOSER_EMOJIS.map(emoji => (
                  <button
                    type="button"
                    key={emoji}
                    role="option"
                    aria-selected="false"
                    className="vgt-chat-emojis__option"
                    aria-label={emoji}
                    onClick={() => onAppendEmoji(emoji)}
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <label className="vgt-sr-only" htmlFor="vgt-group-composer-input">
          Nachricht an #{channelName || 'Kanal'} schreiben
        </label>
        <textarea
          id="vgt-group-composer-input"
          ref={inputRef}
          className="input-field vgt-chat-composer__input"
          placeholder={placeholder}
          value={chatInputText}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          autoComplete="off"
          required={!disabled}
        />

        {mentionMenuOpen ? (
          <div className="vgt-chat-mentions vgt-glass vgt-glass--floating" role="listbox" aria-label="Erwähnungen">
            {mentionSuggestions.map((suggestion, index) => (
              <button
                type="button"
                key={`${suggestion.handle}-${suggestion.identityID}`}
                role="option"
                aria-selected={index === selectedMentionIndex}
                className={`vgt-chat-mentions__option ${index === selectedMentionIndex ? 'is-active' : ''}`}
                onMouseDown={event => {
                  event.preventDefault();
                  onApplyMention(suggestion);
                }}
              >
                <span className="vgt-chat-mentions__handle">@{suggestion.handle}</span>
                <span className="vgt-chat-mentions__id">{suggestion.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-primary vgt-chat-composer__send"
          disabled={!canSend}
          aria-label={slowModeSeconds > 0 ? `Senden gesperrt, noch ${slowModeSeconds} Sekunden` : (t('senden') || 'Senden')}
        >
          <Icon name="send" size={16} />
          <span>{slowModeSeconds > 0 ? `Warten ${slowModeSeconds}s` : (t('senden') || 'Senden')}</span>
        </button>
      </form>
    </div>
  );
}
