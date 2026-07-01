// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
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
      <div className="popup-card glass-panel modal-card-compact">
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
          <div className="modal-actions modal-actions-spaced">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t('abbrechen') || 'Abbrechen'}
            </button>
            <button type="submit" className="btn-primary modal-submit-btn">
              {t('gruppe_beitreten') || 'Beitreten'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinGroupModal;
