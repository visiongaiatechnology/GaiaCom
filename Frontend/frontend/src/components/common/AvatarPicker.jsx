import React from 'react';
import Icon from '../ui/Icon';
import { useTranslation } from '../../utils/i18n';

/**
 * VGT GLASS 2100 — avatar picker.
 *
 * Public API kept: `value`, `options`, `onChange`, `onFileChange`,
 * `allowUpload`. Optional `disabled` (already passed by GroupSettingsModal)
 * now actually disables the controls instead of being ignored.
 *
 * Avatar values are caller-provided (data URL or a stored glyph); this
 * component does not invent new avatar presets and adds no emoji of its own.
 */
export default function AvatarPicker({ value, options = [], onChange, onFileChange, allowUpload = false, disabled = false }) {
  const { t } = useTranslation();
  const current = String(value || '');
  const isImage = current.startsWith('data:image/');

  return (
    <div className={`vgt-avatar${disabled ? ' is-disabled' : ''}`}>
      {allowUpload ? (
        <div className="vgt-avatar__upload">
          <div className="vgt-avatar__preview" aria-hidden="true">
            {isImage ? <img src={current} alt="" /> : <span>{current || '?'}</span>}
          </div>
          <label className="btn-secondary vgt-avatar__upload-btn">
            <Icon name="upload" size={16} />
            {t('upload_avatar_btn') || 'Bild hochladen'}
            <input
              type="file"
              accept="image/*"
              className="vgt-sr-only"
              onChange={onFileChange}
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {options.length ? (
        <div className="vgt-avatar__grid" role="group" aria-label={t('onboarding_select_avatar') || 'Avatar auswählen'}>
          {options.map(option => (
            <button
              type="button"
              key={option}
              className={`vgt-avatar__option${current === option ? ' is-active' : ''}`}
              aria-pressed={current === option}
              onClick={() => onChange(option)}
              disabled={disabled}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
