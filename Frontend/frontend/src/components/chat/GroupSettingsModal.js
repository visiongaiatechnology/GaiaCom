import React from 'react';
import AvatarPicker from '../common/AvatarPicker';
import { GROUP_AVATARS } from '../../utils/avatar';
import { useTranslation } from '../../utils/i18n';

export default function GroupSettingsModal({
  name,
  description,
  avatar,
  isCrisis,
  onIsCrisisChange,
  onNameChange,
  onDescriptionChange,
  onAvatarChange,
  onSubmit,
  onClose,
  onDelete
}) {
  const { t } = useTranslation();

  return (
    <div className="popup-overlay">
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '520px', textAlign: 'left' }}>
        <div className="modal-title">{t('group_settings_title')}</div>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>{t('group_settings_name')}</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={event => onNameChange(event.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('group_settings_desc')}</label>
            <textarea
              className="input-field"
              value={description}
              onChange={event => onDescriptionChange(event.target.value)}
              maxLength={500}
              style={{ minHeight: '90px', resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label>{t('group_settings_avatar')}</label>
            <AvatarPicker value={avatar} options={GROUP_AVATARS} onChange={onAvatarChange} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', marginBottom: '15px' }}>
            <input
              type="checkbox"
              id="settingsIsCrisis"
              checked={isCrisis}
              onChange={event => onIsCrisisChange(event.target.checked)}
              style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
            />
            <label htmlFor="settingsIsCrisis" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {t('group_settings_is_crisis') || 'Als Krisenraum markieren (aktiviert erweiterte Richtlinien & Notizen)'}
            </label>
          </div>
          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {onDelete ? (
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ background: 'var(--danger-glow)', color: 'var(--danger)', borderColor: 'var(--danger)', width: 'auto', padding: '0 16px' }} 
                onClick={onDelete}
              >
                Gruppe löschen
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                {t('abbrechen')}
              </button>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
                {t('speichern')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
