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
  triggerAlert
}) => {
  if (!vaultUnlocked) {
    return (
      <div className="chat-container" style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', width: '100%', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '15px' }}>🔒</div>
          <h3 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '1.2rem', fontWeight: 800 }}>{t('vault_title') || 'GaiaVault Secure Records'}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '20px', lineHeight: '1.4' }}>
            {t('vault_desc') || 'Lokaler verschlüsselter Tresor für Recovery-Backups, Identitätsnotizen, Server-Zugänge, Notfallkontakte und private Logs.'}
          </p>
          <form onSubmit={handleUnlockVault}>
            <div className="form-group">
              <input
                type="password"
                className="input-field"
                placeholder={t('vault_pwd_placeholder') || 'Vault-Passwort eingeben...'}
                value={vaultPasswordInput}
                onChange={e => setVaultPasswordInput(e.target.value)}
                required
              />
            </div>
            {vaultError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '-8px', marginBottom: '12px' }}>{vaultError}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              {t('vault_btn_unlock') || 'Tresor entsperren'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const categories = [
    { value: 'identity', label: 'Identity Notes', icon: '🆔' },
    { value: 'credentials', label: 'Server Credentials', icon: '🔑' },
    { value: 'emergency', label: 'Emergency Contacts', icon: '🚨' },
    { value: 'legal', label: 'Legal/Law Notes', icon: '⚖️' },
    { value: 'private_logs', label: 'Private Logs / Records', icon: '📝' }
  ];

  return (
    <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="reader-header" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '1.8rem' }}>🔑</div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>GaiaVault</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {vaultRecords.length} {t('records_stored') || 'Records gesichert'}
            </span>
          </div>
        </div>
        <button 
          type="button" 
          className="btn-secondary" 
          style={{ color: 'var(--warning)', borderColor: 'var(--warning)', padding: '4px 10px', fontSize: '0.75rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} 
          onClick={handleLockVault}
        >
          🔒 {t('vault_btn_lock') || 'Sperren'}
        </button>
      </header>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {selectedVaultRecord ? (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800 }}>
                    📂 {selectedVaultRecord.category}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ⏱️ {new Date(selectedVaultRecord.createdAt).toLocaleString()}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.3rem', marginTop: '10px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedVaultRecord.title}</h4>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setSelectedVaultRecord(null)}>
                  {t('close') || 'Schließen'}
                </button>
                <button type="button" className="btn-primary" style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)', padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleDeleteVaultRecord(selectedVaultRecord.id)}>
                  {t('delete') || 'Löschen'}
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>🔒 {t('vault_decrypted_content') || 'Entschlüsselter Inhalt'}</span>
                <button
                  type="button"
                  className="btn-action"
                  style={{ padding: '3px 8px', fontSize: '0.65rem' }}
                  onClick={() => {
                    navigator.clipboard.writeText(selectedVaultRecord.body);
                    // Use passed triggerAlert or alertConfig
                    triggerAlert(t('kopiert') || 'Kopiert', t('vault_copied_success') || 'Inhalt in die Zwischenablage kopiert.');
                  }}
                >
                  📋 Kopieren
                </button>
              </div>
              <pre style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '16px',
                borderRadius: '8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                lineHeight: '1.6',
                border: '1px solid var(--border-color)',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
              }}>
                {selectedVaultRecord.body}
              </pre>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ marginBottom: '10px', fontWeight: 800 }}>{t('vault_new_record') || 'Neuen Secure Record anlegen'}</h4>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px dashed var(--accent-cyan)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
              🛡️ <strong>Zero-Knowledge Verschlüsselung:</strong> Alle Daten werden auf deinem Rechner per AES-GCM (256-bit) verschlüsselt, bevor sie im verschlüsselten Zustand den Server erreichen. Der Server sieht niemals deine Klartextdaten oder dein Passwort!
            </div>
            <form onSubmit={handleAddVaultRecord}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('vault_record_title') || 'Titel'}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('vault_record_title_placeholder') || 'z. B. Recovery Seed / Server Zugang...'}
                  value={vaultDraftTitle}
                  onChange={e => setVaultDraftTitle(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('vault_record_category') || 'Kategorie'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginTop: '6px' }}>
                  {categories.map(cat => (
                    <div
                      key={cat.value}
                      onClick={() => setVaultDraftCategory(cat.value)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '8px',
                        border: '1px solid ' + (vaultDraftCategory === cat.value ? 'var(--accent-cyan)' : 'var(--border-color)'),
                        background: vaultDraftCategory === cat.value ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255,255,255,0.01)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: vaultDraftCategory === cat.value ? '0 0 8px rgba(0, 242, 254, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{cat.icon}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: vaultDraftCategory === cat.value ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>{cat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('vault_record_body') || 'Inhalt (Verschlüsselt)'}</label>
                <textarea
                  className="input-field"
                  placeholder={t('vault_record_body_placeholder') || 'Verschlüsselten Record-Inhalt eingeben...'}
                  value={vaultDraftBody}
                  onChange={e => setVaultDraftBody(e.target.value)}
                  style={{ minHeight: '150px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  maxLength={5000}
                  required
                />
              </div>

              {vaultError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '12px' }}>{vaultError}</p>}

              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 24px' }}>
                {t('vault_btn_encrypt') || 'Record verschlüsseln'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultPane;
