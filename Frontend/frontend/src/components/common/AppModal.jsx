import React from 'react';
import { useTranslation } from '../../utils/i18n';
import Icon from '../ui/Icon';
import useDialogA11y from './useDialogA11y';

const TONE_ICON = {
  danger: 'alertOctagon',
  warning: 'alertTriangle',
  success: 'check',
  info: 'info',
  default: 'info'
};

/**
 * VGT GLASS 2100 — shared Z4 dialog primitive.
 *
 * Public API kept: `title`, `children`, `tone`, `onClose`, `actions`.
 * Material: modal glass only here (this is a real overlay), never on dense
 * form content. Keyboard: focus moves into the dialog, Tab is trapped,
 * Escape closes via `onClose`, and focus returns to the opener.
 */
export default function AppModal({ title, children, tone = 'default', onClose, actions }) {
  const { t } = useTranslation();
  const titleId = React.useId();
  const dialogRef = useDialogA11y(true, { onClose });
  const iconName = TONE_ICON[tone] || TONE_ICON.default;

  const handleBackdrop = event => {
    if (event.target === event.currentTarget && onClose) onClose();
  };

  return (
    <div className="vgt-overlay" role="presentation" onMouseDown={handleBackdrop}>
      <div
        ref={dialogRef}
        className={`vgt-dialog vgt-dialog--modal vgt-modal vgt-modal--tone-${tone}`}        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        <header className="vgt-dialog__head vgt-modal__head">
          <div className="vgt-modal__heading">
            <span className={`vgt-modal__tone vgt-modal__tone--${tone}`} aria-hidden="true">
              <Icon name={iconName} size={20} />
            </span>
            {title ? <h2 className="vgt-h3" id={titleId}>{title}</h2> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              aria-label={t('close') || 'Schließen'}
            >
              <Icon name="x" size={18} />
            </button>
          ) : null}
        </header>

        {children ? <div className="vgt-modal__body">{children}</div> : null}

        {actions ? <footer className="vgt-dialog__foot vgt-modal__actions">{actions}</footer> : null}
      </div>
    </div>
  );
}
