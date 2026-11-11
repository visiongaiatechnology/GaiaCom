import React from 'react';
import Icon from '../../ui/Icon';
import { ChannelAvatar } from './channelMedia';

const EDITABLE_CATEGORIES = ['General', 'Tech', 'News', 'Sports', 'Entertainment'];

/**
 * Channel create/edit form. Field behaviour, validation and the `@handle`
 * normalisation are unchanged; only the composition and control classes are new.
 */
export default function ChannelEditor({
  mode,
  ct,
  categoryLabel,
  nameInput,
  setNameInput,
  descriptionInput,
  setDescriptionInput,
  categoryInput,
  setCategoryInput,
  avatarEnvelope,
  handleAvatarFile,
  submitChannel,
  cancel,
  busy,
  error
}) {
  const isEdit = mode === 'edit';

  return (
    <section className="vgt-ch-editor" aria-labelledby="channel-editor-title">
      <header className="vgt-pane-head">
        <div>
          <p className="vgt-eyebrow">{ct('public_channel')}</p>
          <h1 className="vgt-h2" id="channel-editor-title">
            {isEdit ? ct('edit_header') : ct('create_header')}
          </h1>
        </div>
      </header>

      <form className="vgt-ch-editor__form" onSubmit={submitChannel}>
        <div className="vgt-ch-editor__identity">
          <ChannelAvatar avatar={avatarEnvelope} name={nameInput} size="lg" />
          <div className="vgt-ch-editor__identity-copy">
            <span className="vgt-label">{ct('set_image')}</span>
            <label className="btn-secondary vgt-file-button">
              <Icon name="image" size={16} />
              {ct('set_image')}
              <input type="file" accept="image/*" onChange={handleAvatarFile} />
            </label>
            <span className="vgt-caption">Verschlüsselt als AES-256-GCM-Umschlag gespeichert.</span>
          </div>
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="channel-name-input">
            {ct('channel_name')}
          </label>
          <div className="vgt-ch-handle">
            <span aria-hidden="true">@</span>
            <input
              id="channel-name-input"
              className="input-field"
              value={nameInput.startsWith('@') ? nameInput.slice(1) : nameInput}
              maxLength={80}
              onChange={event => {
                const value = event.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                setNameInput(`@${value.toLowerCase()}`);
              }}
              placeholder="channelhandle"
              required
            />
          </div>
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="channel-category-input">
            {ct('category')}
          </label>
          <select
            id="channel-category-input"
            className="input-field"
            value={categoryInput}
            onChange={event => setCategoryInput(event.target.value)}
          >
            {EDITABLE_CATEGORIES.map(category => (
              <option key={category} value={categoryLabel(category)}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="channel-description-input">
            {ct('description')}
          </label>
          <textarea
            id="channel-description-input"
            className="input-field"
            value={descriptionInput}
            maxLength={600}
            onChange={event => setDescriptionInput(event.target.value)}
          />
          <span className="vgt-caption">{descriptionInput.length}/600</span>
        </div>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <div className="vgt-ch-editor__actions">
          <button type="button" className="btn-secondary" onClick={cancel}>
            {ct('cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? ct('saving') : ct('save_channel')}
          </button>
        </div>
      </form>
    </section>
  );
}
