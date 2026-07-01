// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import { useTranslation } from '../../utils/i18n';

export default function AvatarPicker({ value, options, onChange, onFileChange, allowUpload = false }) {
  const { t } = useTranslation();
  return (
    <div className="avatar-picker">
      {allowUpload && (
        <div className="custom-avatar-upload-row">
          <div className="avatar-upload-preview">
            {String(value || '').startsWith('data:image/') ? (
              <img src={value} alt="Avatar" />
            ) : (
              <span>{value}</span>
            )}
          </div>
          <label className="avatar-upload-btn">
            {t('upload_avatar_btn') || 'Bild hochladen'}
            <input type="file" accept="image/*" onChange={onFileChange} className="sr-hidden-field" />
          </label>
        </div>
      )}
      <div className="avatar-grid">
        {options.map(option => (
          <button
            type="button"
            key={option}
            className={`avatar-item ${value === option ? 'active' : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
