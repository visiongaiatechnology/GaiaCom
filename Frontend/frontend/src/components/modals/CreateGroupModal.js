import React from 'react';

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
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '440px', textAlign: 'left' }}>
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
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', marginBottom: '15px' }}>
            <input 
              type="checkbox" 
              id="createIsCrisis"
              checked={isCrisisRoomInput}
              onChange={e => setIsCrisisRoomInput(e.target.checked)}
              style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
            />
            <label htmlFor="createIsCrisis" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {t('create_group_is_crisis') || 'Als Krisenraum markieren (aktiviert erweiterte Richtlinien & Notizen)'}
            </label>
          </div>
          <div className="form-group">
            <label>{t('group_icon_label') || 'Gruppen-Icon / Avatar'}</label>
            <div className="avatar-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
              {['👥', '🔒', '🛡️', '⚡', '🚀', '🧠', '💻', '🌌', '🧬', '🔥', '✨', '🌍'].map(emoji => (
                <div 
                  key={emoji} 
                  className={`avatar-item ${groupAvatarInput === emoji ? 'active' : ''}`}
                  onClick={() => setGroupAvatarInput(emoji)}
                  style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
                >
                  {emoji}
                </div>
              ))}
            </div>
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

export default CreateGroupModal;
