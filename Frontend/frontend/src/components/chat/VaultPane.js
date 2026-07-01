// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

export const VaultPane = ({
  vaultUnlocked,
  vaultPasswordInput,
  setVaultPasswordInput,
  vaultError,
  vaultRecords,
  vaultDraftTitle,
  setVaultDraftTitle,
  vaultDraftCategory,
  setVaultDraftCategory,
  vaultDraftBody,
  setVaultDraftBody,
  handleUnlockVault,
  handleAddVaultRecord,
  handleDeleteVaultRecord,
  handleLockVault,
  selectedVaultRecord,
  setSelectedVaultRecord,
  t,
  triggerAlert,
  setMobileMenuOpen
}) => {
  const categories = [
    { value: 'identity', label: 'Identity Notes', icon: '\u{1F194}' },
    { value: 'credentials', label: 'Server Credentials', icon: '\u{1F511}' },
    { value: 'emergency', label: 'Emergency Contacts', icon: '\u{1F6A8}' },
    { value: 'legal', label: 'Legal/Law Notes', icon: '\u2696\uFE0F' },
    { value: 'private_logs', label: 'Private Logs / Records', icon: '\u{1F4DD}' }
  ];
  const mobileActions = (
    <div className="detail-mobile-actions vault-mobile-actions">
      <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)}>
        {t('menu') || 'Menu'}
      </button>
    </div>
  );

  if (!vaultUnlocked) {
    return (
      <div className="chat-container vault-shell vault-locked-shell">
        {mobileActions}
        <div className="vault-locked-body">
          <div className="vault-unlock-card">
            <div className="vault-unlock-icon" aria-hidden="true">{'\u{1F512}'}</div>
            <h3>{t('vault_title') || 'GaiaVault Secure Records'}</h3>
            <p>
              {t('vault_desc') || 'Lokaler verschluesselter Tresor fuer Recovery-Backups, Identitaetsnotizen, Server-Zugaenge, Notfallkontakte und private Logs.'}
            </p>
            <form className="vault-unlock-form" onSubmit={handleUnlockVault}>
              <input
                type="password"
                className="input-field"
                placeholder={t('vault_pwd_placeholder') || 'Vault-Passwort eingeben...'}
                value={vaultPasswordInput}
                onChange={event => setVaultPasswordInput(event.target.value)}
                required
              />
              {vaultError && <p className="vault-error">{vaultError}</p>}
              <button type="submit" className="btn-primary">
                {t('vault_btn_unlock') || 'Tresor entsperren'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container vault-shell">
      {mobileActions}
      <header className="vault-header">
        <div className="vault-title-block">
          <div className="vault-header-icon" aria-hidden="true">{'\u{1F511}'}</div>
          <div>
            <h3>{t('gaiavault') || 'GaiaVault'}</h3>
            <span>{vaultRecords.length} {t('records_stored') || 'Records gesichert'}</span>
          </div>
        </div>
        <button type="button" className="btn-secondary vault-lock-button" onClick={handleLockVault}>
          {'\u{1F512}'} {t('vault_btn_lock') || 'Sperren'}
        </button>
      </header>

      <div className="vault-scroll gaia-scrollbar">
        {selectedVaultRecord ? (
          <article className="vault-detail-card">
            <div className="vault-detail-header">
              <div>
                <div className="vault-detail-meta">
                  <span className="vault-category-badge">{'\u{1F4C2}'} {selectedVaultRecord.category}</span>
                  <span>{'\u23F1\uFE0F'} {new Date(selectedVaultRecord.createdAt).toLocaleString()}</span>
                </div>
                <h4>{selectedVaultRecord.title}</h4>
              </div>
              <div className="vault-detail-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelectedVaultRecord(null)}>
                  {t('close') || 'Schliessen'}
                </button>
                <button type="button" className="btn-primary vault-danger-button" onClick={() => handleDeleteVaultRecord(selectedVaultRecord.id)}>
                  {t('delete') || 'Loeschen'}
                </button>
              </div>
            </div>

            <div className="vault-content-block">
              <div className="vault-content-header">
                <span>{'\u{1F512}'} {t('vault_decrypted_content') || 'Entschluesselter Inhalt'}</span>
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedVaultRecord.body);
                    triggerAlert(t('kopiert') || 'Kopiert', t('vault_copied_success') || 'Inhalt in die Zwischenablage kopiert.');
                  }}
                >
                  {'\u{1F4CB}'} Kopieren
                </button>
              </div>
              <pre>{selectedVaultRecord.body}</pre>
            </div>
          </article>
        ) : (
          <section className="vault-form-card">
            <h4>{t('vault_new_record') || 'Neuen Secure Record anlegen'}</h4>
            <div className="vault-security-note">
              <strong>{t('zero_knowledge_encryption') || 'Zero-Knowledge Verschlüsselung'}:</strong> Alle Daten werden auf deinem Rechner per AES-GCM verschluesselt. Der Server sieht niemals deine Klartextdaten oder dein Passwort.
            </div>
            <form className="vault-record-form" onSubmit={handleAddVaultRecord}>
              <div className="form-group">
                <label>{t('vault_record_title') || 'Titel'}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('vault_record_title_placeholder') || 'z. B. Recovery Seed / Server Zugang...'}
                  value={vaultDraftTitle}
                  onChange={event => setVaultDraftTitle(event.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('vault_record_category') || 'Kategorie'}</label>
                <div className="vault-category-grid">
                  {categories.map(category => (
                    <button
                      type="button"
                      key={category.value}
                      className={`vault-category-option ${vaultDraftCategory === category.value ? 'active' : ''}`}
                      onClick={() => setVaultDraftCategory(category.value)}
                      aria-pressed={vaultDraftCategory === category.value}
                    >
                      <span aria-hidden="true">{category.icon}</span>
                      <strong>{category.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>{t('vault_record_body') || 'Inhalt'}</label>
                <textarea
                  className="input-field vault-body-input"
                  placeholder={t('vault_record_body_placeholder') || 'Verschluesselten Record-Inhalt eingeben...'}
                  value={vaultDraftBody}
                  onChange={event => setVaultDraftBody(event.target.value)}
                  maxLength={5000}
                  required
                />
              </div>

              {vaultError && <p className="vault-error">{vaultError}</p>}

              <button type="submit" className="btn-primary vault-submit-button">
                {t('vault_btn_encrypt') || 'Record verschluesseln'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default VaultPane;
