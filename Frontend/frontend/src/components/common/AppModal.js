// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import { useTranslation } from '../../utils/i18n';

export default function AppModal({ title, children, tone = 'default', onClose, actions }) {
  const { t } = useTranslation();

  return (
    <div className="popup-overlay">
      <div className={`popup-card glass-panel modal-tone-${tone}`}>
        {title && <div className="modal-title">{title}</div>}
        <div className="modal-content">{children}</div>
        {(actions || onClose) && (
          <div className="modal-actions">
            {actions}
            {onClose && (
              <button type="button" className="btn-secondary" onClick={onClose}>
                {t('close')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
