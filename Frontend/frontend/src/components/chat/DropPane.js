// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

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
  return (
    <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="detail-mobile-actions">
        <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
          {t('menu') || 'Menu'}
        </button>
        {selectedDrop && (
          <button type="button" className="mobile-back-btn" onClick={() => setSelectedDrop(null)}>
            {t('drop_title') || 'GaiaDrop Inbox'}
          </button>
        )}
      </div>
      <header className="reader-header" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '1.8rem' }}>📥</div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('gaiadrop_inbox_title') || 'GaiaDrop Inbox'}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : ''}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn-action"
          onClick={loadGaiaDropInbox}
          disabled={gaiaDropLoading}
          style={{ padding: '6px 14px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🔄 {gaiaDropLoading ? t('drop_btn_decrypting') || 'Laden...' : t('drop_btn_load') || 'Laden / Entschlüsseln'}
        </button>
      </header>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {gaiaDropLoading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
            <div className="spinner" style={{ border: '3px solid rgba(0,0,0,0.1)', borderTop: '3px solid var(--accent-cyan)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 10px auto' }}></div>
            {t('drop_btn_decrypting') || 'Entschlüssele Posteingang...'}
          </div>
        )}

        {gaiaDropError && (
          <div className="glass-panel" style={{ padding: '20px', borderColor: 'var(--danger)', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{gaiaDropError}</p>
          </div>
        )}

        {!gaiaDropLoading && !gaiaDropError && selectedDrop ? (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
            <div className="gaiadrop-address-card drop-detail-address">
              <span>{t('drop_own_address') || 'Deine GaiaDrop-Adresse'}</span>
              <code>{activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : 'deine_adresse'}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'var(--warning-glow)', color: 'var(--warning)', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800 }}>
                    🕵️ Zero-Knowledge Drop
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ⏱️ {selectedDrop.created_at ? new Date(selectedDrop.created_at).toLocaleString() : t('time_unknown') || 'Zeitpunkt unbekannt'}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.2rem', marginTop: '10px', fontWeight: 800 }}>
                  {selectedDrop.sender_label || t('anonymous_sender') || 'Anonymer Absender'}
                </h4>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setSelectedDrop(null)}>
                  {t('close') || 'Schließen'}
                </button>
                <button type="button" className="btn-primary" style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)', padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleDeleteDrop(selectedDrop.id)}>
                  {t('delete') || 'Löschen'}
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.25)',
              padding: '16px',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              marginBottom: '20px',
              border: '1px solid var(--border-color)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {selectedDrop.decrypted ? (typeof selectedDrop.decrypted === 'string' ? selectedDrop.decrypted : selectedDrop.decrypted.body) : (selectedDrop.decryptError || t('decrypt_failed') || 'Dekodierungsfehler')}
            </div>

            <div style={{ padding: '16px', background: 'rgba(0,242,254,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '6px' }}>🛡️ Cryptographic Integrity Evidence (GaiaProof)</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', fontFamily: 'monospace' }}>
                <div>{t('drop_id') || 'Drop ID:'}</div>
                <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedDrop.id}</div>
                <div>{t('proof_hash') || 'Proof Hash:'}</div>
                <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedDrop.payload_hash}</div>
                <div>{t('server_log') || 'Server Log:'}</div>
                <div style={{ color: 'var(--success)' }}>✓ Zero-Knowledge verifiziert: Keine IP-Adressen oder Metadaten serverseitig protokolliert.</div>
              </div>
            </div>
          </div>
        ) : (
          !gaiaDropLoading && !gaiaDropError && (
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ fontSize: '3rem', textShadow: '0 0 15px var(--accent-cyan)' }}>📬</div>
                <div>
                  <h4 style={{ marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.15rem' }}>{t('drop_title') || 'GaiaDrop Secure Inbox'}</h4>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                    {t('drop_desc') || 'Ein Zero-Knowledge-Drop-Kanal für anonyme externe Zusendungen. Externe Whistleblower, Tippgeber oder Mandanten können dir über den GaiaDrop-Bereich auf der Login-Seite sichere Nachrichten senden, ohne selbst einen Account zu besitzen.'}
                  </p>
                </div>
              </div>
              
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0, 242, 254, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📣 Deine Empfänger-Adresse für Tippgeber</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <code style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid var(--border-color)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : 'deine_adresse'}
                  </code>
                  <button
                    type="button"
                    className="btn-action"
                    style={{ padding: '8px 14px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      if (activeIdentity) {
                        navigator.clipboard.writeText(displayGaiaID(activeIdentity.GaiaID));
                        triggerAlert(t('kopiert') || 'Kopiert', 'Deine GaiaID wurde in die Zwischenablage kopiert.');
                      }
                    }}
                  >
                    📋 Kopieren
                  </button>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>{t('how_to_receive_drops') || 'Wie empfange ich Drops?'}</strong>
                <ol style={{ paddingLeft: '20px', marginTop: '6px', lineHeight: '1.6' }}>
                  <li>{t('receive_drops_step1') || 'Teile deine GaiaID (z. B. oben per Kopieren-Knopf) mit externen Quellen.'}</li>
                  <li>{t('receive_drops_step2') || 'Diese rufen die Login-Seite deiner GaiaCOM-Instanz auf, wechseln zum Reiter'} <strong>"GaiaDrop"</strong> {t('receive_drops_step3') || 'und senden dort ihre verschlüsselte Nachricht an deine Adresse.'}</li>
                  <li>{t('click_top_right') || 'Klicke oben rechts auf'} <strong>"{t('drop_btn_load') || 'Laden / Entschlüsseln'}"</strong>, um eingegangene Meldungen abzurufen und clientseitig mit deinen privaten Schlüsseln zu dekodieren.</li>
                </ol>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default DropPane;
