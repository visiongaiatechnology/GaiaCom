import React from 'react';
import Icon from '../../ui/Icon';
import { ReplyComposerPreview, ScrollToLatestButton } from '../MessageActions';
import { formatClock } from '../shared/formatTime';
import { COMPOSER_EMOJIS } from '../shared/emojiSet';

/**
 * Composer of the 1:1 conversation (Z2 dock above the safe area).
 * Chrome uses the Icon system; the emoji set stays message *content*.
 * Enter sends, Shift+Enter inserts a line break, Escape closes popovers.
 */
export default function DirectComposer({
  inputRef,
  fileInputRef,
  chatInputText,
  onInputChange,
  onComposerKeyDown,
  isBlocked,
  isRecording,
  recordingTime,
  onStartRecording,
  onStopRecording,
  uploadProgress,
  uploading,
  stagedAttachments,
  onRemoveStaged,
  showEmojiPicker,
  onToggleEmojiPicker,
  onAppendEmoji,
  onFileSelect,
  drivePickerOpen,
  onToggleDrivePicker,
  shareableDriveRecords,
  onAttachDrive,
  mentionOpen,
  mentionCandidates,
  onInsertMention,
  replyTarget,
  onClearReply,
  pendingMessageCount,
  onScrollToLatest,
  onSend,
  t
}) {
  const canSend = !isBlocked && (isRecording || chatInputText.trim().length > 0 || stagedAttachments.length > 0);
  const placeholder = isBlocked ? 'Chat blockiert' : 'Nachricht eingeben…';

  return (
    <div className="vgt-chat-composer">
      <ScrollToLatestButton count={pendingMessageCount} onClick={onScrollToLatest} />

      {mentionOpen && mentionCandidates.length > 0 ? (
        <div className="vgt-chat-mentions vgt-glass vgt-glass--floating" role="listbox" aria-label="Erwähnungen">
          {mentionCandidates.map((candidate, index) => (
            <button
              type="button"
              key={`${candidate.id || candidate.name}-${index}`}
              role="option"
              aria-selected="false"
              className="vgt-chat-mentions__option"
              onClick={() => onInsertMention(candidate.name || candidate.id)}
            >
              <span className="vgt-chat-mentions__handle">@{candidate.name || candidate.id}</span>
              {candidate.name && candidate.id ? <span className="vgt-chat-mentions__id vgt-mono">{candidate.id}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      <ReplyComposerPreview replyTarget={replyTarget} onClear={onClearReply} t={t} />

      {stagedAttachments.length > 0 ? (
        <ul className="vgt-chat-staged" aria-label="Anhänge bereit zum Senden">
          {stagedAttachments.map((attachment, index) => (
            <li key={`${attachment.fileId || attachment.fileName}-${index}`} className="vgt-chat-staged__item">
              <Icon name="paperclip" size={13} />
              <span className="vgt-chat-staged__name">{attachment.fileName || (t('sc_file') || 'Datei')}</span>
              <button
                type="button"
                className="btn-icon vgt-chat-staged__remove"
                onClick={() => onRemoveStaged(index)}
                aria-label={`Anhang entfernen: ${attachment.fileName || (t('sc_file') || 'Datei')}`}
              >
                <Icon name="close" size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {uploadProgress > 0 && uploadProgress < 100 ? (
        <div className="vgt-chat-upload" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}>
          <span className="vgt-chat-upload__bar" aria-hidden="true">
            <span className="vgt-chat-upload__fill" style={{ width: `${uploadProgress}%` }} />
          </span>
          <span className="vgt-chat-upload__text vgt-numeric">Upload {uploadProgress}%</span>
        </div>
      ) : null}

      <form className="vgt-chat-composer__form" onSubmit={onSend}>
        {isRecording ? (
          <div className="vgt-chat-rec" role="status" aria-live="polite">
            <span className="vgt-chat-rec__dot" aria-hidden="true" />
            <span className="vgt-chat-rec__label">
              Aufnahme <span className="vgt-numeric">{formatClock(recordingTime)}</span>
            </span>
            <div className="vgt-chat-rec__actions">
              <button type="button" className="btn-secondary" onClick={() => onStopRecording(true)}>
                Verwerfen
              </button>
              <button type="submit" className="btn-primary">
                <Icon name="send" size={16} />
                <span>Senden</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="vgt-chat-composer__tools">
              <div className="vgt-chat-anchor">
                <button
                  type="button"
                  className="btn-action vgt-chat-composer__tool"
                  onClick={onToggleEmojiPicker}
                  disabled={isBlocked}
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

              <button
                type="button"
                className="btn-icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBlocked || uploading}
                aria-label="Datei anhängen"
                title="Datei anhängen"
              >
                <Icon name="paperclip" size={18} />
              </button>

              <div className="vgt-chat-anchor">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={onToggleDrivePicker}
                  disabled={isBlocked || uploading || shareableDriveRecords.length === 0}
                  aria-label="GaiaDrive-Datei für 12 Stunden freigeben"
                  title="GaiaDrive-Datei für 12 Stunden freigeben"
                  aria-expanded={drivePickerOpen}
                  aria-haspopup="menu"
                >
                  <Icon name="drive" size={18} />
                </button>
                {drivePickerOpen ? (
                  <div className="vgt-chat-drive vgt-glass vgt-glass--floating" role="menu" aria-label="GaiaDrive-Freigabe (12 h)">
                    <p className="vgt-chat-drive__title">GaiaDrive-Freigabe · 12 h</p>
                    <div className="vgt-chat-drive__list">
                      {shareableDriveRecords.map(record => (
                        <button
                          type="button"
                          key={record.id}
                          role="menuitem"
                          className="vgt-chat-drive__item"
                          onClick={() => onAttachDrive(record)}
                        >
                          <span className="vgt-chat-drive__name">{record.fileName || record.title}</span>
                          <small>
                            {record.cloudFileId
                              ? `${record.sizeBytes ? `${(record.sizeBytes / 1024).toFixed(1)} KB · ` : ''}bereit`
                              : `${record.sizeBytes ? `${(record.sizeBytes / 1024).toFixed(1)} KB · ` : ''}wird vorbereitet`}
                          </small>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="btn-action vgt-chat-composer__tool"
                onClick={onStartRecording}
                disabled={isBlocked}
                aria-label="Sprachnachricht aufnehmen"
                title="Sprachnachricht aufnehmen"
              >
                <Icon name="mic" size={17} />
              </button>
            </div>

            <input type="file" ref={fileInputRef} onChange={onFileSelect} className="vgt-sr-only" tabIndex={-1} aria-hidden="true" />

            <label className="vgt-sr-only" htmlFor="vgt-chat-input">Nachricht schreiben</label>
            <textarea
              id="vgt-chat-input"
              ref={inputRef}
              className="input-field vgt-chat-composer__input"
              placeholder={placeholder}
              value={chatInputText}
              onChange={onInputChange}
              onKeyDown={onComposerKeyDown}
              disabled={isBlocked}
              rows={1}
              autoComplete="off"
            />

            <button
              type="submit"
              className="btn-primary vgt-chat-composer__send"
              disabled={!canSend}
              aria-label={t('senden') || (t('senden') || 'Senden')}
            >
              <Icon name="send" size={16} />
              <span>{t('senden') || (t('senden') || 'Senden')}</span>
            </button>
          </>
        )}
      </form>
    </div>
  );
}
