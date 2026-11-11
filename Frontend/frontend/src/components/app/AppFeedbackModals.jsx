import React from 'react';
import AppModal from '../common/AppModal';

const TONE_BY_TYPE = {
  danger: 'danger',
  warning: 'warning',
  success: 'success',
  info: 'info'
};

/**
 * VGT GLASS 2100 — application feedback layer (alert + confirm).
 *
 * Presentation only: the public contract from App.jsx is unchanged
 * (`alertConfig {title,text,type}`, `confirmConfig {title,text,onConfirm,
 * onCancel,confirmText,cancelText,danger,showThreeButtons,
 * onConfirmAlternative,confirmAlternativeText}`).
 *
 * Callback order is intentionally identical to the previous implementation:
 * the handler runs first, then the dialog is cleared. Destructive confirms use
 * a distinct danger control, and Escape follows the cancel path.
 */
export default function AppFeedbackModals({
  alertConfig,
  setAlertConfig,
  confirmConfig,
  setConfirmConfig,
  t
}) {
  const closeAlert = React.useCallback(() => {
    setAlertConfig(null);
  }, [setAlertConfig]);

  const closeConfirm = React.useCallback(() => {
    if (confirmConfig?.onCancel) confirmConfig.onCancel();
    setConfirmConfig(null);
  }, [confirmConfig, setConfirmConfig]);

  const runConfirm = React.useCallback(() => {
    confirmConfig?.onConfirm?.();
    setConfirmConfig(null);
  }, [confirmConfig, setConfirmConfig]);

  const runAlternative = React.useCallback(() => {
    confirmConfig?.onConfirmAlternative?.();
    setConfirmConfig(null);
  }, [confirmConfig, setConfirmConfig]);

  const alertTone = TONE_BY_TYPE[alertConfig?.type] || 'info';
  const confirmTone = confirmConfig?.danger ? 'danger' : (TONE_BY_TYPE[confirmConfig?.type] || 'info');

  return (
    <>
      {alertConfig ? (
        <AppModal
          title={alertConfig.title}
          tone={alertTone}
          onClose={closeAlert}
          actions={(
            <button type="button" className="btn-primary" onClick={closeAlert}>
              {t('close') || 'Schließen'}
            </button>
          )}
        >
          <p className="vgt-body vgt-body--sm vgt-modal__text">{alertConfig.text}</p>
        </AppModal>
      ) : null}

      {confirmConfig ? (
        <AppModal
          title={confirmConfig.title}
          tone={confirmTone}
          onClose={closeConfirm}
          actions={confirmConfig.showThreeButtons ? (
            <>
              <button type="button" className="btn-primary" onClick={runConfirm}>
                {confirmConfig.confirmText}
              </button>
              <button type="button" className="btn-secondary" onClick={runAlternative}>
                {confirmConfig.confirmAlternativeText}
              </button>
              <button type="button" className="btn-secondary" onClick={closeConfirm}>
                {confirmConfig.cancelText}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={closeConfirm}>
                {confirmConfig.cancelText}
              </button>
              <button
                type="button"
                className={confirmConfig.danger ? 'btn-danger' : 'btn-primary'}
                onClick={runConfirm}
              >
                {confirmConfig.confirmText}
              </button>
            </>
          )}
        >
          <p className="vgt-body vgt-body--sm vgt-modal__text vgt-modal__text--prewrap">
            {confirmConfig.text}
          </p>
        </AppModal>
      ) : null}
    </>
  );
}
