import React from 'react';

export const JoinGroupModal = ({
  show,
  onClose,
  joinGroupHashInput,
  setJoinGroupHashInput,
  handleJoinRoom,
  t
}) => {
  if (!show) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '440px', textAlign: 'left' }}>
        <div className="modal-title">{t('join_group_title') || 'Gruppe beitreten'}</div>
        <form onSubmit={handleJoinRoom}>
          <div className="form-group">
            <label>{t('invite_code_label') || 'Einladungscode (Secret Hash)'}</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Code (64-stelliger Hex-Hash)..." 
              value={joinGroupHashInput}
              onChange={e => setJoinGroupHashInput(e.target.value)}
              required 
            />
          </div>
          <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t('abbrechen') || 'Abbrechen'}
            </button>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
              {t('gruppe_beitreten') || 'Beitreten'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinGroupModal;
