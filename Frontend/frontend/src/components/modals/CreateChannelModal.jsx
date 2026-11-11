import React from 'react';
import Icon from '../ui/Icon';
import DialogShell from './DialogShell';

/** Creates a room channel. Same single-field contract as before. */
export const CreateChannelModal = ({ show, onClose, newChannelNameInput, setNewChannelNameInput, handleCreateChannel, t }) => {
  if (!show) return null;

  return (
    <DialogShell
      id="create-channel"
      eyebrow="Raum"
      title={t('create_channel_title') || 'Neuen Kanal erstellen'}
      description="Kanäle gliedern ein Thema innerhalb des Raums."
      onClose={onClose}
      closeLabel={t('abbrechen') || 'Abbrechen'}
      size="sm"
      footer={
        <div className="vgt-dialog__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('abbrechen') || 'Abbrechen'}
          </button>
          <button type="submit" form="create-channel-form" className="btn-primary">
            <Icon name="plus" size={15} />
            {t('create_btn') || 'Erstellen'}
          </button>
        </div>
      }
    >
      <form id="create-channel-form" className="vgt-dialog__form" onSubmit={handleCreateChannel}>
        <div className="vgt-field">
          <label className="vgt-label" htmlFor="create-channel-name">
            {t('channel_name_label') || 'Kanalname'}
          </label>
          <input
            id="create-channel-name"
            type="text"
            className="input-field"
            placeholder="z. B. marketing"
            value={newChannelNameInput}
            onChange={event => setNewChannelNameInput(event.target.value)}
            required
          />
        </div>
      </form>
    </DialogShell>
  );
};

export default CreateChannelModal;
