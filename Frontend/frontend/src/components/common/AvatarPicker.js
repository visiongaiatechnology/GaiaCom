import React from 'react';

export default function AvatarPicker({ value, options, onChange, onFileChange, allowUpload = false }) {
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
            Bild hochladen
            <input type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
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
