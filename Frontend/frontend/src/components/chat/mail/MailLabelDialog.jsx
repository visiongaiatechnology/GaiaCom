import React, { useRef } from 'react';
import Icon from '../../ui/Icon';
import useDialogA11y from '../../common/useDialogA11y';

/**
 * Z4 dialog for creating a mailbox label.
 *
 * The caller keeps the label text in its existing state (`newLabelName`); this
 * component only manages focus. Focus behaviour is the shared `useDialogA11y`
 * contract: initial focus on the label field, Tab/Shift+Tab trapped inside the
 * dialog, Escape closes, focus returns to the element that opened the dialog
 * and the page behind is scroll-locked while the dialog is open.
 */
export default function MailLabelDialog({ open, value, onChange, onCancel, onSave, t }) {
  const inputRef = useRef(null);
  const dialogRef = useDialogA11y(open, {
    onClose: onCancel,
    initialFocusRef: inputRef
  });

  if (!open) return null;

  return (
    <div
      className="vgt-overlay vgt-mail-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="vgt-dialog vgt-mail-label-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vgt-mail-label-title"
        ref={dialogRef}
      >
        <header className="vgt-dialog__head">
          <div>
            <p className="vgt-eyebrow">{t('labels') || 'Labels'}</p>
            <h2 className="vgt-h3" id="vgt-mail-label-title">
              {t('new_label') || 'Neues Label'}
            </h2>
          </div>
          <button type="button" className="btn-icon" onClick={onCancel} aria-label={t('close') || 'Dialog schließen'}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="vgt-mail-field">
          <label className="input-label" htmlFor="vgt-mail-label-name">
            {t('label_name') || 'Label-Name'}
          </label>
          <input
            id="vgt-mail-label-name"
            ref={inputRef}
            className="input-field"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={40}
            autoComplete="off"
          />
          <p className="field-hint">
            {t('label_hint') || 'Labels ordnen Mails lokal in deiner Mailbox.'}
          </p>
        </div>

        <footer className="vgt-dialog__foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('abbrechen') || 'Abbrechen'}
          </button>
          <button type="button" className="btn-primary" onClick={onSave} disabled={!value.trim()}>
            {t('speichern') || 'Speichern'}
          </button>
        </footer>
      </div>
    </div>
  );
}
