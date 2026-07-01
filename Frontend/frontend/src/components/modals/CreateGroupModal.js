// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

const GROUP_AVATAR_OPTIONS = ['👥', '🔒', '🛡️', '⚡', '🚀', '🧠', '💻', '🌌', '🧬', '🔥', '✨', '🌍'];

export const CreateGroupModal = ({
  show,
  onClose,
  groupNameInput,
  setGroupNameInput,
  groupDescriptionInput,
  setGroupDescriptionInput,
  groupAvatarInput,
  setGroupAvatarInput,
  handleCreateRoom,
  isCrisisRoomInput,
  setIsCrisisRoomInput,
  t
}) => {
  if (!show) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-card glass-panel modal-card-compact">
        <div className="modal-title">{t('create_group_title') || 'Neue Gruppe erstellen'}</div>
        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label>{t('group_name') || 'Gruppenname'}</label>
            <input
              type="text"
              className="input-field"
              placeholder="Projekt Alpha..."
              value={groupNameInput}
              onChange={e => setGroupNameInput(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('group_description') || 'Beschreibung'}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('quantum_secure_exchange') || 'Quantensicherer Austausch über...'}
              value={groupDescriptionInput}
              onChange={e => setGroupDescriptionInput(e.target.value)}
            />
          </div>
          <div className="form-group modal-checkbox-row">
            <input
              type="checkbox"
              id="createIsCrisis"
              checked={isCrisisRoomInput}
              onChange={e => setIsCrisisRoomInput(e.target.checked)}
              className="modal-checkbox-input"
            />
            <label htmlFor="createIsCrisis" className="modal-checkbox-label">
              {t('create_group_is_crisis') || 'Als Krisenraum markieren (aktiviert erweiterte Richtlinien & Notizen)'}
            </label>
          </div>
          <div className="form-group">
            <label>{t('group_icon_label') || 'Gruppen-Icon / Avatar'}</label>
            <div className="avatar-grid modal-avatar-grid-six">
              {GROUP_AVATAR_OPTIONS.map(emoji => (
                <button
                  type="button"
                  key={emoji}
                  className={`avatar-item modal-avatar-item-sm ${groupAvatarInput === emoji ? 'active' : ''}`}
                  onClick={() => setGroupAvatarInput(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
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

export default CreateGroupModal;
