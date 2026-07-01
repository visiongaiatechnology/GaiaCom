// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

export default function AppFeedbackModals({
  alertConfig,
  setAlertConfig,
  confirmConfig,
  setConfirmConfig,
  t
}) {
  const alertType = alertConfig?.type === 'danger' || alertConfig?.type === 'warning' ? alertConfig.type : 'info';
  const confirmTone = confirmConfig?.danger ? 'danger' : 'info';

  return (
    <>
      {alertConfig && (
        <div className="popup-overlay">
          <div className={`popup-card glass-panel popup-card-${alertType}`}>
            <div className={`popup-icon popup-icon-${alertType}`}>
              {alertType === 'info' ? 'OK' : '!'}
            </div>
            <div className="popup-title">{alertConfig.title}</div>
            <div className="popup-text">{alertConfig.text}</div>
            <button className="btn-primary" onClick={() => setAlertConfig(null)}>{t('close') || 'Schließen'}</button>
          </div>
        </div>
      )}

      {confirmConfig && (
        <div className="popup-overlay">
          <div className={`popup-card glass-panel popup-card-confirm popup-card-${confirmTone}`}>
            <div className={`popup-icon popup-icon-${confirmTone}`}>
              ?
            </div>
            <div className="popup-title">{confirmConfig.title}</div>
            <div className="popup-text popup-text-prewrap">{confirmConfig.text}</div>
            <div className="modal-actions popup-modal-actions">
              {confirmConfig.showThreeButtons ? (
                <>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      confirmConfig.onConfirm();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.confirmText}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      confirmConfig.onConfirmAlternative();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.confirmAlternativeText}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (confirmConfig.onCancel) confirmConfig.onCancel();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.cancelText}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (confirmConfig.onCancel) confirmConfig.onCancel();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.cancelText}
                  </button>
                  <button
                    className={`btn-primary${confirmConfig.danger ? ' btn-danger' : ''}`}
                    onClick={() => {
                      confirmConfig.onConfirm();
                      setConfirmConfig(null);
                    }}
                  >
                    {confirmConfig.confirmText}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
