// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useRef } from 'react';

const CATEGORIES = [
  { value: 'identity',     label: 'Identität',             icon: '🪪' },
  { value: 'credentials',  label: 'Zugangsdaten',           icon: '🔑' },
  { value: 'emergency',    label: 'Notfallkontakte',        icon: '🚨' },
  { value: 'legal',        label: 'Rechtliches',            icon: '⚖️' },
  { value: 'private_logs', label: 'Private Aufzeichnungen', icon: '📝' },
  { value: 'files',        label: 'Dateien',                icon: '📂' }
];

function CloudBadge({ record }) {
  if (!record.cloudFileId) return null;
  const expires = record.cloudExpiresAt ? new Date(record.cloudExpiresAt) : null;
  const now     = new Date();
  const expired = expires && expires < now;
  const daysLeft = expires ? Math.max(0, Math.ceil((expires - now) / 86400000)) : 0;

  return (
    <span className={`drive-cloud-badge${expired ? ' expired' : ''}`} title={expired ? 'Cloud-Kopie abgelaufen' : `Läuft ab in ${daysLeft} Tag(en)`}>
      {expired ? '☁️ Abgelaufen' : `☁️ ${daysLeft}d`}
    </span>
  );
}

function RecordCard({ record, onSelect, onDelete }) {
  const cat = CATEGORIES.find(c => c.value === record.category) || CATEGORIES[0];
  return (
    <article className="drive-record-card" onClick={() => onSelect(record)}>
      <div className="drive-record-icon">{record.type === 'file' ? '📄' : cat.icon}</div>
      <div className="drive-record-info">
        <div className="drive-record-title">{record.title}</div>
        <div className="drive-record-meta">
          <span className="drive-category-badge">{cat.label}</span>
          {record.type === 'file' && record.sizeBytes && (
            <span className="drive-size-badge">{(record.sizeBytes / 1024).toFixed(1)} KB</span>
          )}
          <CloudBadge record={record} />
          <span className="drive-date">{new Date(record.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <button
        type="button"
        className="drive-record-delete"
        title="Löschen"
        onClick={e => { e.stopPropagation(); onDelete(record.id); }}
        aria-label="Eintrag löschen"
      >
        🗑️
      </button>
    </article>
  );
}

export default function DrivePane({
  driveUnlocked,
  drivePasswordInput,
  setDrivePasswordInput,
  driveError,
  driveRecords,
  selectedDriveRecord,
  setSelectedDriveRecord,
  draftTitle,    setDraftTitle,
  draftCategory, setDraftCategory,
  draftBody,     setDraftBody,
  driveUploadProgress,
  handleUnlockDrive,
  handleLockDrive,
  handleAddNote,
  handleAddFile,
  handleDownloadFile,
  handleCloudUpload,
  handleCloudDownload,
  handleDeleteRecord,
  t,
  triggerAlert,
  setMobileMenuOpen
}) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = React.useState('notes'); // 'notes' | 'files'

  const notes = driveRecords.filter(r => r.type === 'note');
  const files = driveRecords.filter(r => r.type === 'file');

  const mobileActions = (
    <div className="detail-mobile-actions drive-mobile-actions">
      <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)}>
        {t('menu') || 'Menü'}
      </button>
    </div>
  );

  /* ── Lock screen ───────────────────────────────────────────────────── */
  if (!driveUnlocked) {
    return (
      <div className="chat-container drive-shell drive-locked-shell">
        {mobileActions}
        <div className="drive-locked-body">
          <div className="drive-unlock-card">
            <div className="drive-unlock-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
                <rect x="8" y="20" width="32" height="22" rx="6" fill="rgba(67,227,255,0.15)" stroke="rgba(67,227,255,0.5)" strokeWidth="2"/>
                <path d="M16 20V15a8 8 0 0116 0v5" stroke="rgba(67,227,255,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="24" cy="31" r="3" fill="rgba(67,227,255,0.8)"/>
                <line x1="24" y1="34" x2="24" y2="38" stroke="rgba(67,227,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-gradient">GaiaDrive</h3>
            <p>
              Dein lokaler, verschlüsselter Drive. Notizen, Dateien und Bilder werden auf deinem Gerät mit AES-GCM gespeichert. Optional kannst du Dateien bis 20 MB für 2 Wochen in die GaiaCOM-Cloud hochladen.
            </p>
            <form className="drive-unlock-form" onSubmit={handleUnlockDrive}>
              <input
                id="drive-password-input"
                type="password"
                className="input-field"
                placeholder="Drive-Passwort eingeben…"
                value={drivePasswordInput}
                onChange={e => setDrivePasswordInput(e.target.value)}
                autoComplete="current-password"
                required
              />
              {driveError && <p className="drive-error" role="alert">{driveError}</p>}
              <button type="submit" className="btn-primary">
                🔓 Drive entsperren
              </button>
            </form>
            <p className="drive-zero-knowledge-note">
              <strong>Zero-Knowledge:</strong> Dein Passwort verlässt niemals dein Gerät. Alle Daten bleiben lokal verschlüsselt.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Detail view for a selected record ──────────────────────────────── */
  if (selectedDriveRecord) {
    const rec = selectedDriveRecord;
    const cat = CATEGORIES.find(c => c.value === rec.category) || CATEGORIES[0];
    const hasLocalFile  = rec.type === 'file' && rec.opfsName;
    const hasCloudFile  = !!rec.cloudFileId;
    const cloudExpiry   = rec.cloudExpiresAt ? new Date(rec.cloudExpiresAt) : null;
    const cloudExpired  = cloudExpiry && cloudExpiry < new Date();

    return (
      <div className="chat-container drive-shell">
        {mobileActions}
        <header className="drive-header">
          <div className="drive-title-block">
            <div className="drive-header-icon" aria-hidden="true">
              {rec.type === 'file' ? '📄' : cat.icon}
            </div>
            <div>
              <h3>{rec.title}</h3>
              <span>{cat.label} · {new Date(rec.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="drive-header-actions">
            <button type="button" className="btn-secondary" onClick={() => setSelectedDriveRecord(null)}>
              ← Zurück
            </button>
            <button type="button" className="btn-primary drive-danger-button" onClick={() => handleDeleteRecord(rec.id)}>
              🗑️ Löschen
            </button>
          </div>
        </header>

        <div className="drive-scroll gaia-scrollbar">
          <article className="drive-detail-card">

            {/* ── Text note ── */}
            {rec.type === 'note' && (
              <div className="drive-content-block">
                <div className="drive-content-header">
                  <span>🔒 Entschlüsselter Inhalt</span>
                  <button
                    type="button"
                    className="btn-action"
                    onClick={() => {
                      navigator.clipboard.writeText(rec.body);
                      triggerAlert('Kopiert', 'Inhalt in die Zwischenablage kopiert.');
                    }}
                  >
                    📋 Kopieren
                  </button>
                </div>
                <pre>{rec.body}</pre>
              </div>
            )}

            {/* ── File record ── */}
            {rec.type === 'file' && (
              <div className="drive-file-detail">
                <div className="drive-file-meta-grid">
                  <div className="drive-file-meta-item">
                    <span>Dateiname</span>
                    <strong>{rec.fileName}</strong>
                  </div>
                  <div className="drive-file-meta-item">
                    <span>Typ</span>
                    <strong>{rec.mimeType}</strong>
                  </div>
                  <div className="drive-file-meta-item">
                    <span>Größe</span>
                    <strong>{rec.sizeBytes ? (rec.sizeBytes / 1024).toFixed(1) + ' KB' : '—'}</strong>
                  </div>
                  <div className="drive-file-meta-item">
                    <span>Lokal</span>
                    <strong>{hasLocalFile ? '✅ Verfügbar (OPFS)' : '⚠️ Nicht gefunden'}</strong>
                  </div>
                </div>

                {/* Cloud status */}
                <div className="drive-cloud-section">
                  <h4>☁️ Cloud-Sync</h4>
                  {!hasCloudFile && (
                    <p className="drive-cloud-info">
                      Diese Datei ist noch nicht in der Cloud. Du kannst sie für 2 Wochen hochladen. Die Cloud-Kopie wird danach automatisch gelöscht – deine lokale Kopie bleibt erhalten.
                    </p>
                  )}
                  {hasCloudFile && !cloudExpired && (
                    <div className="drive-cloud-active">
                      <p>
                        ✅ In der Cloud · läuft ab: <strong>{new Date(rec.cloudExpiresAt).toLocaleDateString()}</strong>
                      </p>
                    </div>
                  )}
                  {hasCloudFile && cloudExpired && (
                    <div className="drive-cloud-expired">
                      <p>⏰ Cloud-Kopie ist abgelaufen und wurde gelöscht. Lokale Kopie ist weiterhin verfügbar.</p>
                    </div>
                  )}
                </div>

                {driveUploadProgress !== null && (
                  <div className="drive-upload-progress-bar">
                    <div className="drive-upload-progress-fill" style={{ width: `${driveUploadProgress}%` }} />
                    <span>{driveUploadProgress}%</span>
                  </div>
                )}

                <div className="drive-file-actions">
                  {hasLocalFile && (
                    <button type="button" className="btn-primary" onClick={() => handleDownloadFile(rec)}>
                      ⬇️ Lokal herunterladen
                    </button>
                  )}
                  {!cloudExpired && !hasCloudFile && hasLocalFile && (rec.sizeBytes || 0) <= 20 * 1024 * 1024 && (
                    <button type="button" className="btn-secondary drive-cloud-upload-btn" onClick={() => handleCloudUpload(rec)}>
                      ☁️ In Cloud hochladen (2 Wochen)
                    </button>
                  )}
                  {hasCloudFile && !cloudExpired && (
                    <button type="button" className="btn-secondary" onClick={() => handleCloudDownload(rec)}>
                      ☁️ Von Cloud laden
                    </button>
                  )}
                </div>
              </div>
            )}

            {driveError && <p className="drive-error" role="alert">{driveError}</p>}
          </article>
        </div>
      </div>
    );
  }

  /* ── Main Drive view ────────────────────────────────────────────────── */
  const listRecords = activeTab === 'notes' ? notes : files;

  return (
    <div className="chat-container drive-shell">
      {mobileActions}

      <header className="drive-header">
        <div className="drive-title-block">
          <div className="drive-header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
              <path d="M2 8l10-6 10 6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8z" stroke="rgba(67,227,255,0.8)" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M8 22V12h8v10" stroke="rgba(67,227,255,0.6)" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="text-gradient">GaiaDrive</h3>
            <span>{driveRecords.length} Einträge · lokal verschlüsselt</span>
          </div>
        </div>
        <button type="button" className="btn-secondary drive-lock-button" onClick={handleLockDrive}>
          🔒 Sperren
        </button>
      </header>

      {/* Tabs */}
      <div className="drive-tabs">
        <button
          type="button"
          className={`drive-tab${activeTab === 'notes' ? ' active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Notizen ({notes.length})
        </button>
        <button
          type="button"
          className={`drive-tab${activeTab === 'files' ? ' active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          📂 Dateien ({files.length})
        </button>
      </div>

      <div className="drive-scroll gaia-scrollbar">

        {/* ── Note creation form ── */}
        {activeTab === 'notes' && (
          <section className="drive-form-card">
            <h4>📝 Neue Notiz</h4>
            <div className="drive-security-note">
              <strong>Zero-Knowledge:</strong> Alle Notizen werden mit AES-GCM auf deinem Gerät verschlüsselt. Dein Passwort verlässt niemals das Gerät.
            </div>
            <form className="drive-record-form" onSubmit={handleAddNote}>
              <div className="form-group">
                <label htmlFor="drive-note-title">Titel</label>
                <input
                  id="drive-note-title"
                  type="text"
                  className="input-field"
                  placeholder="z. B. Recovery Seed / Server-Zugang…"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label>Kategorie</label>
                <div className="drive-category-grid">
                  {CATEGORIES.filter(c => c.value !== 'files').map(cat => (
                    <button
                      type="button"
                      key={cat.value}
                      className={`drive-category-option${draftCategory === cat.value ? ' active' : ''}`}
                      onClick={() => setDraftCategory(cat.value)}
                      aria-pressed={draftCategory === cat.value}
                    >
                      <span aria-hidden="true">{cat.icon}</span>
                      <strong>{cat.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="drive-note-body">Inhalt</label>
                <textarea
                  id="drive-note-body"
                  className="input-field drive-body-input"
                  placeholder="Verschlüsselten Inhalt eingeben…"
                  value={draftBody}
                  onChange={e => setDraftBody(e.target.value)}
                  maxLength={10000}
                  required
                />
              </div>

              {driveError && <p className="drive-error" role="alert">{driveError}</p>}
              <button type="submit" className="btn-primary drive-submit-button">
                🔒 Notiz verschlüsseln & speichern
              </button>
            </form>
          </section>
        )}

        {/* ── File upload zone ── */}
        {activeTab === 'files' && (
          <section className="drive-form-card">
            <h4>📂 Datei hinzufügen</h4>
            <div className="drive-security-note">
              <strong>Lokal verschlüsselt:</strong> Dateien werden mit AES-GCM verschlüsselt und im OPFS-Ordner deines Browsers gespeichert. Optional: Cloud-Upload bis 20 MB mit automatischem Ablauf nach 2 Wochen.
            </div>
            <div
              className="drive-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleAddFile(file);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              aria-label="Datei hochladen"
            >
              <div className="drive-dropzone-icon">📤</div>
              <p>Klicken oder Datei hierher ziehen</p>
              <span>Alle Dateitypen · lokal verschlüsselt</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (file) handleAddFile(file);
                e.target.value = '';
              }}
            />
            {driveError && <p className="drive-error" role="alert">{driveError}</p>}
          </section>
        )}

        {/* ── Record list ── */}
        {listRecords.length > 0 ? (
          <div className="drive-record-list">
            {listRecords.map(record => (
              <RecordCard
                key={record.id}
                record={record}
                onSelect={setSelectedDriveRecord}
                onDelete={handleDeleteRecord}
              />
            ))}
          </div>
        ) : (
          <div className="drive-empty-state">
            <span>{activeTab === 'notes' ? '📝' : '📂'}</span>
            <p>{activeTab === 'notes' ? 'Noch keine Notizen vorhanden.' : 'Noch keine Dateien vorhanden.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
