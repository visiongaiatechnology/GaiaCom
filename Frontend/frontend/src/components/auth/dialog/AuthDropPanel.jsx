import React from 'react';
import Icon from '../../ui/Icon';

export default function AuthDropPanel({
  t,
  dropTargetInput,
  dropSenderInput,
  dropMessageInput,
  dropStatus,
  dropError,
  onDropTargetChange,
  onDropSenderChange,
  onDropMessageChange,
  onSubmitGaiaDrop
}) {
  return (
    <form className="vgt-auth-form" onSubmit={onSubmitGaiaDrop}>
      <p className="vgt-body vgt-body--sm">
        {t('public_drop_desc') || 'Sende eine verschlüsselte Nachricht an eine GaiaID, ohne ein Konto zu erstellen.'}
      </p>

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-dialog-drop-target">{t('public_drop_target') || 'Empfänger'}</label>
        <input
          id="vgt-dialog-drop-target"
          type="text"
          className="input-field"
          placeholder="name@gaiacom.de"
          value={dropTargetInput}
          onChange={(event) => onDropTargetChange(event.target.value)}
          autoComplete="off"
          required
        />
      </div>

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-dialog-drop-sender">{t('public_drop_sender') || 'Absender'}</label>
        <input
          id="vgt-dialog-drop-sender"
          type="text"
          className="input-field"
          placeholder={t('public_drop_sender_placeholder') || 'Name / Alias (optional)'}
          value={dropSenderInput}
          onChange={(event) => onDropSenderChange(event.target.value)}
          autoComplete="off"
          maxLength={80}
        />
      </div>

      <div className="vgt-field">
        <label className="input-label" htmlFor="vgt-dialog-drop-message">{t('public_drop_message') || 'Nachricht'}</label>
        <textarea
          id="vgt-dialog-drop-message"
          className="input-field"
          placeholder={t('public_drop_message_placeholder') || 'Schreibe eine sichere Nachricht…'}
          value={dropMessageInput}
          onChange={(event) => onDropMessageChange(event.target.value)}
          maxLength={5000}
          rows={4}
          required
        />
      </div>

      {dropError && <p className="field-error" role="alert">{dropError}</p>}
      {dropStatus && <p className="vgt-drop__success" role="status">{dropStatus}</p>}

      <button type="submit" className="btn-primary vgt-auth-form__submit">
        <Icon name="send" size={16} />
        {t('public_drop_send') || 'Sicher senden'}
      </button>
    </form>
  );
}
