import React, { useState } from 'react';
import Icon from '../ui/Icon';

function formatDropTime(value, locale, t) {
  if (!value) return (t && t('time_unknown')) || 'Zeitpunkt unbekannt';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return (t && t('time_unknown')) || 'Zeitpunkt unbekannt';
  return date.toLocaleString(locale || []);
}

function dropBody(drop) {
  if (!drop) return '';
  if (typeof drop.decrypted === 'string') return drop.decrypted;
  if (drop.decrypted && typeof drop.decrypted === 'object') return drop.decrypted.body || '';
  return '';
}

/**
 * GaiaDrop — anonymous inbound exchange surface.
 *
 * The pane renders the drops already decrypted by `useGaiaDrop` (the decryption
 * happens in the hook) plus the receiver address and the loading/error states.
 * No counters are invented; the list, status and timestamps come from the drop
 * records themselves.
 */
export const DropPane = ({
  gaiaDropInbox,
  gaiaDropLoading,
  gaiaDropError,
  selectedDrop,
  setSelectedDrop,
  loadGaiaDropInbox,
  activeIdentity,
  displayGaiaID,
  handleDeleteDrop,
  t,
  triggerAlert,
  setMobileMenuOpen
}) => {
  const [copied, setCopied] = useState(false);
  const address = activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : '';
  const drops = Array.isArray(gaiaDropInbox) ? gaiaDropInbox : [];
  const unread = drops.filter(drop => drop.status === 'new').length;

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    triggerAlert(t('kopiert') || 'Kopiert', 'Deine GaiaID wurde in die Zwischenablage kopiert.');
  };

  return (
    <div className="chat-container vgt-drop">
      <div className="detail-mobile-actions vgt-pane-mobile">
        <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
          {t('menu') || 'Menü'}
        </button>
        {selectedDrop && (
          <button type="button" className="mobile-back-btn" onClick={() => setSelectedDrop(null)}>
            {t('drop_title') || 'GaiaDrop Inbox'}
          </button>
        )}
      </div>

      <header className="vgt-pane-head vgt-drop__head">
        <div>
          <p className="vgt-eyebrow">GaiaDrop</p>
          <h1 className="vgt-h2">{t('gaiadrop_inbox_title') || 'GaiaDrop Inbox'}</h1>
          <p className="vgt-caption">Zero-Knowledge-Eingang für externe Zusendungen ohne Konto.</p>
        </div>
        <div className="vgt-pane-head__actions">
          <button type="button" className="btn-secondary" onClick={loadGaiaDropInbox} disabled={gaiaDropLoading}>
            <Icon name="refresh" size={15} />
            {gaiaDropLoading ? t('drop_btn_decrypting') || 'Entschlüssele…' : t('drop_btn_load') || 'Laden / Entschlüsseln'}
          </button>
          <button type="button" className="btn-ghost" onClick={copyAddress} disabled={!address}>
            <Icon name={copied ? 'check' : 'copy'} size={15} />
            {copied ? (t('auth_copied') || 'Kopiert') : (t('copy') || 'Adresse kopieren')}
          </button>
        </div>
      </header>

      {gaiaDropLoading && drops.length === 0 && (
        <div className="vgt-state" role="status">
          <Icon name="spinner" size={18} />
          <span>{t('drop_btn_decrypting') || 'Entschlüssele Posteingang…'}</span>
        </div>
      )}

      {gaiaDropError && (
        <div className="vgt-notice vgt-notice--danger" role="alert">
          <Icon name="alertTriangle" size={16} />
          <div>
            <strong>GaiaDrop konnte nicht geladen werden</strong>
            <span>{gaiaDropError}</span>
          </div>
        </div>
      )}

      <div className="vgt-drop__layout">
        <section className="vgt-drop__list" aria-label="Eingegangene Drops">
          <header className="vgt-drop__list-head">
            <span className="vgt-label">Eingang</span>
            <span className="vgt-caption">
              <span className="vgt-numeric">{drops.length}</span> Drops
              {unread > 0 && (
                <>
                  {' · '}
                  <span className="vgt-numeric">{unread}</span> neu
                </>
              )}
            </span>
          </header>

          {drops.length === 0 ? (
            <div className="vgt-empty">
              <Icon name="inbox" size={24} />
              <strong>Keine Drops im Eingang</strong>
              <span className="vgt-body vgt-body--sm">
                Teile deine GaiaID mit externen Quellen; eingehende Nachrichten erscheinen nach dem Entschlüsseln hier.
              </span>
            </div>
          ) : (
            <ul className="vgt-drop__rows vgt-scroll-page">
              {drops.map(drop => {
                const active = selectedDrop?.id === drop.id;
                return (
                  <li key={drop.id}>
                    <button
                      type="button"
                      className={`vgt-drop__row${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => setSelectedDrop(drop)}
                    >
                      <span className="vgt-drop__row-icon" aria-hidden="true">
                        <Icon name={drop.status === 'new' ? 'inbox' : 'mailOpen'} size={16} />
                      </span>
                      <span className="vgt-drop__row-text">
                        <span className="vgt-drop__row-title">
                          {drop.sender_label || t('anonymous_sender') || 'Anonymer Absender'}
                        </span>
                        <span className="vgt-drop__row-meta">
                          {formatDropTime(drop.created_at, undefined, t)}
                          {drop.status === 'new' && <span className="vgt-badge">{t('new') || 'neu'}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="vgt-drop__detail" aria-label="Drop-Details">
          {selectedDrop ? (
            <>
              <header className="vgt-drop__detail-head">
                <div>
                  <span className="vgt-label">Zero-Knowledge Drop</span>
                  <h2 className="vgt-h3">
                    {selectedDrop.sender_label || t('anonymous_sender') || 'Anonymer Absender'}
                  </h2>
                  <p className="vgt-caption">
                    <Icon name="clock" size={12} /> {formatDropTime(selectedDrop.created_at, undefined, t)}
                  </p>
                </div>
                <div className="vgt-drop__detail-actions">
                  <button type="button" className="btn-secondary" onClick={() => setSelectedDrop(null)}>
                    {t('close') || 'Schließen'}
                  </button>
                  <button type="button" className="btn-danger" onClick={() => handleDeleteDrop(selectedDrop.id)}>
                    <Icon name="trash" size={15} />
                    {t('delete') || 'Löschen'}
                  </button>
                </div>
              </header>

              <div className="vgt-drop__message" tabIndex={0} aria-label="Entschlüsselte Nachricht">
                {dropBody(selectedDrop) ||
                  selectedDrop.decryptError ||
                  t('decrypt_failed') ||
                  'Die Nachricht konnte nicht entschlüsselt werden.'}
              </div>

              <section className="vgt-drop__evidence">
                <span className="vgt-label">
                  <Icon name="seal" size={12} /> Integritätsnachweis
                </span>
                <dl className="vgt-drop__evidence-grid">
                  <div>
                    <dt>{t('drop_id') || 'Drop ID'}</dt>
                    <dd className="vgt-id">{selectedDrop.id}</dd>
                  </div>
                  <div>
                    <dt>{t('proof_hash') || 'Proof Hash'}</dt>
                    <dd className="vgt-id">{selectedDrop.payload_hash}</dd>
                  </div>
                </dl>
                <p className="vgt-caption">
                  Inhalte werden clientseitig entschlüsselt; serverseitig wird der Umschlag-Hash zur Integritätsprüfung
                  geführt.
                </p>
              </section>
            </>
          ) : (
            <div className="vgt-drop__intro">
              <div className="vgt-drop__address">
                <div>
                  <span className="vgt-label">{t('drop_own_address') || 'Deine Empfänger-Adresse für Tippgeber'}</span>
                  <code className="vgt-id">{address || 'deine_adresse'}</code>
                </div>
                <button type="button" className="btn-action" onClick={copyAddress} disabled={!address}>
                  <Icon name="copy" size={14} />
                  {t('copy') || 'Kopieren'}
                </button>
              </div>

              <p className="vgt-body vgt-body--sm">
                {t('drop_desc') ||
                  'Ein Zero-Knowledge-Kanal für anonyme externe Zusendungen. Externe Quellen senden über den GaiaDrop-Bereich der Login-Seite, ohne selbst ein Konto zu besitzen.'}
              </p>

              <div className="vgt-drop__steps">
                <span className="vgt-label">{t('how_to_receive_drops') || 'Wie empfange ich Drops?'}</span>
                <ol>
                  <li>{t('receive_drops_step1') || 'Teile deine GaiaID mit externen Quellen.'}</li>
                  <li>{t('receive_drops_step2') || 'Diese senden ihre verschlüsselte Nachricht über die GaiaDrop-Maske der Login-Seite.'}</li>
                  <li>{t('receive_drops_step3') || 'Lade den Eingang über „Laden / Entschlüsseln“, um neue Drops clientseitig zu öffnen.'}</li>
                </ol>
              </div>

              <button type="button" className="btn-secondary" onClick={loadGaiaDropInbox} disabled={gaiaDropLoading}>
                <Icon name="refresh" size={15} />
                {t('drop_btn_load') || 'Laden / Entschlüsseln'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DropPane;
