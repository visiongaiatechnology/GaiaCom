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
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '440px', textAlign: 'left' }}>
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
          <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t('abbrechen') || 'Abbrechen'}
            </button>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
              {t('create_btn') || 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
