import React from 'react';
import Icon from '../../ui/Icon';

export default function LandingDrop({
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
    <section className="vgt-drop" id="gaiadrop" aria-labelledby="vgt-drop-title">
      <div className="vgt-drop__intro">
        <p className="vgt-eyebrow">{t('auth_tab_drop') || 'GaiaDrop'}</p>
        <h2 className="vgt-h2" id="vgt-drop-title">{t('auth_gaiadrop_secure_exchange') || 'Sicherer Austausch ohne Konto.'}</h2>
        <p className="vgt-body">
          Sende eine verschlüsselte Nachricht an eine GaiaID. Der Empfänger entschlüsselt sie lokal
          in seinem Client — dieser Server sieht nur den Envelope.
        </p>
        <ul className="vgt-drop__facts">
          <li><Icon name="lock" size={16} /> {t('auth_gaiadrop_benefit_e2ee') || 'Ende-zu-Ende verschlüsselt'}</li>
          <li><Icon name="user" size={16} /> {t('auth_gaiadrop_benefit_no_login') || 'Kein Login erforderlich'}</li>
          <li><Icon name="inbox" size={16} /> {t('auth_gaiadrop_benefit_inbox') || 'Direkt im Posteingang des Empfängers'}</li>
        </ul>
        <p className="vgt-caption">
          GaiaDrop ersetzt keine Notfallkommunikation. Für vertrauliche Langzeitkommunikation
          nutze einen Client mit lokalem Schlüsseltresor.
        </p>
      </div>

      <form className="vgt-drop__form vgt-glass" onSubmit={onSubmitGaiaDrop} noValidate={false}>
        <div className="vgt-field">
          <label className="input-label" htmlFor="gaiadrop-target">{t('public_drop_target') || 'Empfänger-GaiaID'}</label>
          <input
            id="gaiadrop-target"
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
          <label className="input-label" htmlFor="gaiadrop-sender">{t('public_drop_sender') || 'Absender'}</label>
          <input
            id="gaiadrop-sender"
            type="text"
            className="input-field"
            placeholder={t('public_drop_sender_placeholder') || 'Dein Name / Alias (optional)'}
            value={dropSenderInput}
            onChange={(event) => onDropSenderChange(event.target.value)}
            autoComplete="off"
            maxLength={80}
          />
        </div>

        <div className="vgt-field">
          <label className="input-label" htmlFor="gaiadrop-message">{t('public_drop_message') || 'Nachricht'}</label>
          <textarea
            id="gaiadrop-message"
            className="input-field"
            placeholder={t('public_drop_message_placeholder') || 'Schreibe eine sichere Nachricht…'}
            value={dropMessageInput}
            onChange={(event) => onDropMessageChange(event.target.value)}
            maxLength={5000}
            rows={5}
            required
          />
          <span className="field-hint">{t('lp_drop_caption') || 'Maximal 5000 Zeichen. Inhalt wird im Client versiegelt.'}</span>
        </div>

        {dropError && <p className="field-error" role="alert">{dropError}</p>}
        {dropStatus && <p className="vgt-drop__success" role="status">{dropStatus}</p>}

        <button type="submit" className="btn-primary vgt-drop__submit">
          <Icon name="send" size={16} />
          {t('public_drop_send') || 'Sicher senden'}
        </button>
      </form>
    </section>
  );
}
