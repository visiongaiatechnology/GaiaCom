// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

export const CreateChannelModal = ({
  show,
  onClose,
  newChannelNameInput,
  setNewChannelNameInput,
  handleCreateChannel,
  t
}) => {
  if (!show) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-card glass-panel modal-card-compact">
        <div className="modal-title">{t('create_channel_title') || 'Neuen Kanal erstellen'}</div>
        <form onSubmit={handleCreateChannel}>
          <div className="form-group">
            <label>{t('channel_name_label') || 'Kanalname'}</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="z.B. marketing" 
              value={newChannelNameInput}
              onChange={e => setNewChannelNameInput(e.target.value)}
              required 
            />
          </div>
          <div className="modal-actions modal-actions-spaced">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t('abbrechen') || 'Abbrechen'}
            </button>
            <button type="submit" className="btn-primary modal-submit-btn">
              {t('create_btn') || 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
