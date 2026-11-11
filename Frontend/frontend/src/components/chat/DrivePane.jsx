import React, { useRef, useState } from 'react';
import Icon from '../ui/Icon';

const CATEGORY_META = {
  identity: { label: 'Identität', labelKey: 'onboarding_sec_identity_title', icon: 'user' },
  credentials: { label: 'Zugangsdaten', icon: 'key' },
  emergency: { label: 'Notfallkontakte', icon: 'alertOctagon' },
  legal: { label: 'Rechtliches', labelKey: 'auth_landing_nav_legal', icon: 'fileText' },
  private_logs: { label: 'Private Aufzeichnungen', icon: 'archive' },
  files: { label: 'Dateien', icon: 'folder' }
};
const NOTE_CATEGORIES = ['identity', 'credentials', 'emergency', 'legal', 'private_logs'];

const categoryOf = record => CATEGORY_META[record?.category] || CATEGORY_META.identity;
const categoryLabel = (category, t) => (category.labelKey && t ? (t(category.labelKey) || category.label) : category.label);

function formatSize(bytes) {
  const value = Number(bytes);
  if (!value || Number.isNaN(value)) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function CloudBadge({ record }) {
  if (!record.cloudFileId) return null;
  const expires = record.cloudExpiresAt ? new Date(record.cloudExpiresAt) : null;
  const now = new Date();
  const expired = expires ? expires < now : false;
  const daysLeft = expires ? Math.max(0, Math.ceil((expires - now) / 86400000)) : 0;
  return (
    <span className={`vgt-drive-cloud${expired ? ' is-expired' : ''}`}>
      <Icon name="cloud" size={12} />
      {expired ? 'Cloud-Kopie abgelaufen' : `Cloud · ${daysLeft} Tag(e)`}
    </span>
  );
}

/**
 * GaiaDrive — local encrypted notes/files with optional two-week cloud copies.
 * Behaviour is preserved: unlock, note/file creation, detail, download, delete
 * and cloud upload/download all call the handlers passed by `useDrive`. Progress
 * is rendered only while a real upload reports it.
 */
export default function DrivePane({
  driveUnlocked,
  drivePasswordInput,
  setDrivePasswordInput,
  driveError,
  driveRecords,
  selectedDriveRecord,
  setSelectedDriveRecord,
  draftTitle,
  setDraftTitle,
  draftCategory,
  setDraftCategory,
  draftBody,
  setDraftBody,
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
  const [activeTab, setActiveTab] = useState('notes');

  const notes = driveRecords.filter(record => record.type === 'note');
  const files = driveRecords.filter(record => record.type === 'file');
  const listRecords = activeTab === 'notes' ? notes : files;
  const mobileActions = (
    <div className="vgt-pane-mobile">
      <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)}>
        {t('menu') || 'Menü'}
      </button>
    </div>
  );

  if (!driveUnlocked) {
    return (
      <div className="chat-container vgt-drive">
        {mobileActions}
        <section className="vgt-drive-lock" aria-labelledby="drive-lock-title">
          <span className="vgt-drive-lock__seal" aria-hidden="true"><Icon name="lock" size={26} /></span>
          <p className="vgt-eyebrow">{t('gaiadrive') || 'GaiaDrive'}</p>
          <h1 className="vgt-h2" id="drive-lock-title">Lokaler, verschlüsselter Speicher</h1>
          <p className="vgt-body">
            Notizen, Dateien und Bilder werden auf diesem Gerät mit AES-GCM verschlüsselt. Optional lassen sich Dateien bis
            20 MB für zwei Wochen in die GaiaCom-Cloud hochladen.
          </p>
          <form className="vgt-drive-lock__form" onSubmit={handleUnlockDrive}>
            <div className="vgt-field">
              <label className="vgt-label" htmlFor="drive-password-input">Drive-Passwort</label>
              <input
                id="drive-password-input"
                type="password"
                className="input-field"
                placeholder="Drive-Passwort eingeben…"
                value={drivePasswordInput}
                onChange={event => setDrivePasswordInput(event.target.value)}
                autoComplete="current-password"
                aria-invalid={!!driveError}
                aria-describedby={driveError ? 'drive-lock-error' : undefined}
                required
              />
              {driveError && <p className="field-error" id="drive-lock-error" role="alert">{driveError}</p>}
            </div>
            <button type="submit" className="btn-primary"><Icon name="unlock" size={16} />Drive entsperren</button>
          </form>
          <p className="vgt-caption">Der Schlüssel wird aus deinem Passwort abgeleitet und verlässt dieses Gerät nicht.</p>
        </section>
      </div>
    );
  }

  if (selectedDriveRecord) {
    const record = selectedDriveRecord;
    const category = categoryOf(record);
    const hasLocalFile = record.type === 'file' && record.opfsName;
    const hasCloudFile = !!record.cloudFileId;
    const cloudExpiry = record.cloudExpiresAt ? new Date(record.cloudExpiresAt) : null;
    const cloudExpired = cloudExpiry ? cloudExpiry < new Date() : false;
    const canUpload = !cloudExpired && !hasCloudFile && hasLocalFile && (record.sizeBytes || 0) <= 20 * 1024 * 1024;

    return (
      <div className="chat-container vgt-drive">
        {mobileActions}
        {/* Route-level heading for the detail view; the record title below is a section heading. */}
        <h1 className="vgt-sr-only">{t('gaiadrive') || 'GaiaDrive'}</h1>
        <nav className="vgt-breadcrumb" aria-label="Pfad">
          <button type="button" className="vgt-breadcrumb__item" onClick={() => setSelectedDriveRecord(null)}>
            <Icon name="drive" size={14} />{t('gaiadrive') || 'GaiaDrive'}</button>
          <span className="vgt-breadcrumb__sep" aria-hidden="true">/</span>
          <button type="button" className="vgt-breadcrumb__item" onClick={() => setSelectedDriveRecord(null)}>
            {record.type === 'file' ? 'Dateien' : 'Notizen'}
          </button>
          <span className="vgt-breadcrumb__sep" aria-hidden="true">/</span>
          <span className="vgt-breadcrumb__current" aria-current="page">{record.title}</span>
        </nav>

        <header className="vgt-pane-head">
          <div className="vgt-drive-detail__title">
            <span className="vgt-drive-row__icon" aria-hidden="true">
              <Icon name={record.type === 'file' ? 'file' : category.icon} size={18} />
            </span>
            <div>
              <h2 className="vgt-h3">{record.title}</h2>
              <p className="vgt-caption">{categoryLabel(category, t)} · {formatDate(record.createdAt)}</p>
            </div>
          </div>
          <div className="vgt-pane-head__actions">
            <button type="button" className="btn-secondary" onClick={() => setSelectedDriveRecord(null)}>
              <Icon name="arrowLeft" size={15} />{t('onboarding_back') || 'Zurück'}</button>
            <button type="button" className="btn-danger-outline" onClick={() => handleDeleteRecord(record.id)}>
              <Icon name="trash" size={15} />{t('delete') || 'Löschen'}</button>
          </div>
        </header>

        <div className="vgt-drive-detail vgt-scroll-page">
          {record.type === 'note' && (
            <section className="vgt-drive-detail__panel">
              <header className="vgt-drive-detail__panel-head">
                <span className="vgt-label"><Icon name="lock" size={12} />{t('vault_decrypted_content') || 'Entschlüsselter Inhalt'}</span>
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => {
                    navigator.clipboard.writeText(record.body);
                    triggerAlert('Kopiert', 'Inhalt in die Zwischenablage kopiert.');
                  }}
                >
                  <Icon name="copy" size={14} />Kopieren
                </button>
              </header>
              <pre className="vgt-drive-note">{record.body}</pre>
            </section>
          )}

          {record.type === 'file' && (
            <>
              <section className="vgt-drive-detail__panel">
                <dl className="vgt-drive-meta">
                  <div><dt>Dateiname</dt><dd>{record.fileName}</dd></div>
                  <div><dt>Typ</dt><dd className="vgt-mono">{record.mimeType}</dd></div>
                  <div><dt>Größe</dt><dd className="vgt-numeric">{formatSize(record.sizeBytes)}</dd></div>
                  <div>
                    <dt>Lokale Kopie</dt>
                    <dd>
                      {hasLocalFile
                        ? <span className="vgt-status vgt-status--ok">Verfügbar (OPFS)</span>
                        : <span className="vgt-status vgt-status--warn">Nicht gefunden</span>}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="vgt-drive-detail__panel">
                <header className="vgt-drive-detail__panel-head">
                  <span className="vgt-label"><Icon name="cloud" size={12} />Cloud-Sync</span>
                </header>
                {!hasCloudFile && (
                  <p className="vgt-body vgt-body--sm">
                    Diese Datei liegt nur lokal. Ein Cloud-Upload hält sie zwei Wochen vor und wird danach automatisch
                    gelöscht; die lokale Kopie bleibt erhalten.
                  </p>
                )}
                {hasCloudFile && !cloudExpired && (
                  <p className="vgt-body vgt-body--sm">
                    In der Cloud · läuft ab am <strong>{new Date(record.cloudExpiresAt).toLocaleDateString()}</strong>
                  </p>
                )}
                {hasCloudFile && cloudExpired && (
                  <p className="vgt-body vgt-body--sm">
                    Die Cloud-Kopie ist abgelaufen. Die lokale Kopie ist weiterhin verfügbar.
                  </p>
                )}
                {driveUploadProgress !== null && (
                  <div className="vgt-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={driveUploadProgress}>
                    <div className="vgt-progress__label"><span>Cloud-Upload</span><span className="vgt-numeric">{driveUploadProgress}%</span></div>
                    <div className="vgt-progress__track">
                      <div className="vgt-progress__fill" style={{ width: `${driveUploadProgress}%` }} />
                    </div>
                  </div>
                )}
                <div className="vgt-drive-detail__actions">
                  {hasLocalFile && (
                    <button type="button" className="btn-primary" onClick={() => handleDownloadFile(record)}>
                      <Icon name="download" size={15} />Lokal herunterladen
                    </button>
                  )}
                  {canUpload && (
                    <button type="button" className="btn-secondary" onClick={() => handleCloudUpload(record)}>
                      <Icon name="upload" size={15} />In Cloud hochladen (2 Wochen)
                    </button>
                  )}
                  {hasCloudFile && !cloudExpired && (
                    <button type="button" className="btn-secondary" onClick={() => handleCloudDownload(record)}>
                      <Icon name="cloud" size={15} />Von Cloud laden
                    </button>
                  )}
                </div>
              </section>
            </>
          )}

          {driveError && <p className="field-error" role="alert">{driveError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container vgt-drive">
      {mobileActions}
      <header className="vgt-pane-head">
        <div>
          <p className="vgt-eyebrow">{t('gaiadrive') || 'GaiaDrive'}</p>
          <h1 className="vgt-h2">Lokaler Speicher</h1>
          <p className="vgt-caption">
            <span className="vgt-numeric">{driveRecords.length}</span> Einträge · AES-GCM, Schlüssel nur auf diesem Gerät
          </p>
        </div>
        <div className="vgt-pane-head__actions">
          <button type="button" className="btn-secondary" onClick={handleLockDrive}>
            <Icon name="lock" size={15} />{t('sperren') || 'Sperren'}</button>
        </div>
      </header>

      <div className="vgt-segmented vgt-drive-tabs" role="tablist" aria-label="Speicherbereiche">
        <button type="button" role="tab" aria-selected={activeTab === 'notes'}
          className={`vgt-segmented__item${activeTab === 'notes' ? ' is-active' : ''}`} onClick={() => setActiveTab('notes')}>
          <Icon name="fileText" size={16} />Notizen <span className="vgt-numeric">{notes.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'files'}
          className={`vgt-segmented__item${activeTab === 'files' ? ' is-active' : ''}`} onClick={() => setActiveTab('files')}>
          <Icon name="folder" size={16} />Dateien <span className="vgt-numeric">{files.length}</span>
        </button>
      </div>

      <div className="vgt-drive-body">
        {activeTab === 'notes' ? (
          <section className="vgt-drive-form" aria-labelledby="drive-note-form-title">
            <h2 className="vgt-h4" id="drive-note-form-title">Neue Notiz</h2>
            <p className="vgt-caption">Notizen werden lokal verschlüsselt gespeichert; das Passwort verlässt das Gerät nicht.</p>
            <form onSubmit={handleAddNote} className="vgt-drive-form__grid">
              <div className="vgt-field">
                <label className="vgt-label" htmlFor="drive-note-title">Titel</label>
                <input
                  id="drive-note-title"
                  type="text"
                  className="input-field"
                  placeholder="z. B. Recovery Seed / Server-Zugang…"
                  value={draftTitle}
                  onChange={event => setDraftTitle(event.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="vgt-field">
                <span className="vgt-label">{t('gsn_report_category') || 'Kategorie'}</span>
                <div className="vgt-drive-categories" role="group" aria-label="Kategorie">
                  {NOTE_CATEGORIES.map(key => {
                    const meta = CATEGORY_META[key];
                    const selected = draftCategory === key;
                    return (
                      <button key={key} type="button" className={`vgt-chip${selected ? ' is-active' : ''}`}
                        aria-pressed={selected} onClick={() => setDraftCategory(key)}>
                        <Icon name={meta.icon} size={14} />{meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="vgt-field">
                <label className="vgt-label" htmlFor="drive-note-body">Inhalt</label>
                <textarea
                  id="drive-note-body"
                  className="input-field vgt-drive-form__body"
                  placeholder="Verschlüsselten Inhalt eingeben…"
                  value={draftBody}
                  onChange={event => setDraftBody(event.target.value)}
                  maxLength={10000}
                  required
                />
              </div>
              {driveError && <p className="field-error" role="alert">{driveError}</p>}
              <button type="submit" className="btn-primary"><Icon name="lock" size={15} />Notiz verschlüsseln und speichern</button>
            </form>
          </section>
        ) : (
          <section className="vgt-drive-form" aria-labelledby="drive-file-form-title">
            <h2 className="vgt-h4" id="drive-file-form-title">Datei hinzufügen</h2>
            <p className="vgt-caption">
              Dateien werden lokal mit AES-GCM verschlüsselt (OPFS). Optional: Cloud-Upload bis 20 MB mit automatischem
              Ablauf nach zwei Wochen.
            </p>
            <div
              className="vgt-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file) handleAddFile(file);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Datei hinzufügen"
            >
              <Icon name="upload" size={24} />
              <strong>Datei ablegen oder auswählen</strong>
              <span className="vgt-caption">Alle Dateitypen · lokal verschlüsselt</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={event => {
                const file = event.target.files[0];
                if (file) handleAddFile(file);
                event.target.value = '';
              }}
            />
            {driveError && <p className="field-error" role="alert">{driveError}</p>}
          </section>
        )}

        <section className="vgt-drive-list" aria-live="polite">
          <header className="vgt-drive-list__head">
            <span className="vgt-label">{activeTab === 'notes' ? 'Notizen' : 'Dateien'}</span>
            <span className="vgt-caption vgt-numeric">{listRecords.length}</span>
          </header>
          {listRecords.length === 0 ? (
            <div className="vgt-empty">
              <Icon name={activeTab === 'notes' ? 'fileText' : 'folder'} size={24} />
              <strong>{activeTab === 'notes' ? 'Noch keine Notizen' : 'Noch keine Dateien'}</strong>
              <span className="vgt-body vgt-body--sm">
                {activeTab === 'notes' ? 'Lege die erste verschlüsselte Notiz an.' : 'Lade die erste Datei in den lokalen Speicher.'}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => (activeTab === 'notes' ? document.getElementById('drive-note-title')?.focus() : fileInputRef.current?.click())}
              >
                <Icon name={activeTab === 'notes' ? 'plus' : 'upload'} size={15} />
                {activeTab === 'notes' ? 'Notiz anlegen' : 'Datei auswählen'}
              </button>
            </div>
          ) : (
            <ul className="vgt-drive-list__rows">
              {listRecords.map(record => {
                const category = categoryOf(record);
                return (
                  <li key={record.id} className="vgt-drive-row">
                    <button type="button" className="vgt-drive-row__main" onClick={() => setSelectedDriveRecord(record)}>
                      <span className="vgt-drive-row__icon" aria-hidden="true">
                        <Icon name={record.type === 'file' ? 'file' : category.icon} size={16} />
                      </span>
                      <span className="vgt-drive-row__text">
                        <span className="vgt-drive-row__title">{record.title}</span>
                        <span className="vgt-drive-row__meta">
                          {categoryLabel(category, t)} · {formatDate(record.createdAt)}
                          {record.type === 'file' && <> · {formatSize(record.sizeBytes)}</>}
                          <CloudBadge record={record} />
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-icon vgt-danger-text"
                      onClick={event => {
                        event.stopPropagation();
                        handleDeleteRecord(record.id);
                      }}
                      aria-label={`Eintrag löschen: ${record.title}`}
                      title="Eintrag löschen"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
