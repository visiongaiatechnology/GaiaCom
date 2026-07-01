// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useRef, useState, useEffect } from 'react';
import Icons from '../common/Icons';

export const ComposerPane = ({
  isSmtpMode,
  setIsSmtpMode,
  composeTo,
  setComposeTo,
  composeSubject,
  setComposeSubject,
  composeBody,
  setComposeBody,
  composeScheduledFor,
  setComposeScheduledFor,
  fileInputRef,
  handleFileUpload,
  uploadFile,
  uploadProgress,
  composeError,
  handleSendMail,
  setIsComposing,
  contacts,
  mailSettings,
  isSavingDraft,
  t
}) => {
  const textareaRef = useRef(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState([]);

  // Inject Signature on Mount
  useEffect(() => {
    if (mailSettings?.signature) {
      const sigLine = `\n\n---\n${mailSettings.signature}`;
      if (!composeBody) {
        setComposeBody(sigLine);
      } else if (!composeBody.includes(mailSettings.signature)) {
        // Prepend signature to replies/forwards before the original message
        setComposeBody(`\n\n${sigLine}\n\n${composeBody.trim()}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recipient Autocomplete Logic
  useEffect(() => {
    if (!composeTo.trim() || !contacts) {
      setFilteredContacts([]);
      setShowAutocomplete(false);
      return;
    }

    const val = composeTo.toLowerCase();
    const matches = contacts.filter(c => {
      const nameMatch = c.displayName?.toLowerCase().includes(val);
      const gaiaMatch = c.gaiaID?.toLowerCase().includes(val);
      // If SMTP mode, show all contacts, otherwise only show contacts with gaiaID
      if (isSmtpMode) {
        return nameMatch || gaiaMatch || c.email?.toLowerCase().includes(val);
      } else {
        return c.gaiaID && (nameMatch || gaiaMatch);
      }
    });

    setFilteredContacts(matches);
    setShowAutocomplete(matches.length > 0);
  }, [composeTo, contacts, isSmtpMode]);

  const insertFormat = (syntax) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let replacement = "";
    if (syntax === 'bold') {
      replacement = `**${selected || 'fett'}**`;
    } else if (syntax === 'italic') {
      replacement = `*${selected || 'kursiv'}*`;
    } else if (syntax === 'underline') {
      replacement = `<u>${selected || 'unterstrichen'}</u>`;
    } else if (syntax === 'heading') {
      replacement = `### ${selected || 'Überschrift'}`;
    } else if (syntax === 'code') {
      replacement = `\`\`\`\n${selected || 'Code'}\n\`\`\``;
    }

    setComposeBody(text.substring(0, start) + replacement + text.substring(end));
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleSelectContact = (contact) => {
    const targetAddress = isSmtpMode
      ? (contact.email || contact.gaiaID)
      : contact.gaiaID;
    setComposeTo(targetAddress);
    setShowAutocomplete(false);
  };

  return (
    <form className="composer-form" onSubmit={handleSendMail} style={{ position: 'relative' }}>
      <button type="button" className="mobile-back-btn" onClick={() => setIsComposing(false)}>← {t('wizard_back') || 'Zurück'}</button>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>
          {t('neue_mail') || 'Neue GaiaCOM E-Mail'}
          {isSavingDraft && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginLeft: '12px', fontWeight: 'normal' }}>
              🔄 Speichere Entwurf...
            </span>
          )}
        </h2>
      </div>
      
      {/* SMTP Alert Banner */}
      {isSmtpMode && (
        <div className="smtp-security-banner">
          <Icons.Alert />
          <div>
            <strong>{t('security_warning_title') || 'SICHERHEITS-WARNUNG:'}</strong> {t('smtp_security_warning_desc') || 'Diese Nachricht verlässt den GaiaCom-Sicherheitsraum. SMTP-Zustellung bietet keine GaiaCom-native Ende-zu-Ende-Garantie, keine TrustMesh-Garantie und keine No-Godmode-Garantie ab dem Gateway.'}
          </div>
        </div>
      )}

      <div className="form-group">
        <label>{t('transmission_mode') || 'Übertragungsmodus'}</label>
        <select
          className="input-field"
          value={isSmtpMode ? 'smtp' : 'gaia'}
          onChange={e => setIsSmtpMode(e.target.value === 'smtp')}
          style={{ fontWeight: 'bold' }}
        >
          <option value="gaia">🛡️ {t('quantum_secure_net') || 'GaiaCOM Quantensicheres Netzwerk (Ed25519 & ML-KEM)'}</option>
          <option value="smtp">📧 {t('smtp_mode_option') || 'Standard E-Mail Bridge (Klassisch / SMTP unverschlüsselt)'}</option>
        </select>
      </div>

      <div className="form-group" style={{ position: 'relative' }}>
        <label>
          {isSmtpMode 
            ? (t('receiver_smtp') || 'Empfänger (Standard E-Mail Adresse)') 
            : (t('receiver_gaia') || 'Empfänger (Gaia-Adresse)')
          }
        </label>
        <input
          type="text"
          className="input-field"
          placeholder={isSmtpMode ? "external@gmail.com" : "alice@gaiacom.de"}
          value={composeTo}
          onChange={e => setComposeTo(e.target.value)}
          onFocus={() => {
            if (filteredContacts.length > 0) setShowAutocomplete(true);
          }}
          onBlur={() => {
            // Delay closing to allow clicks on items
            setTimeout(() => setShowAutocomplete(false), 200);
          }}
          required
          autoComplete="off"
        />

        {/* Autocomplete Dropdown */}
        {showAutocomplete && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 10,
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              background: 'rgba(20, 20, 25, 0.95)',
              borderRadius: '4px',
              marginTop: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
          >
            {filteredContacts.map(c => (
              <div
                key={c.ID || c.gaiaID}
                onClick={() => handleSelectContact(c)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}
                className="autocomplete-item"
              >
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {c.displayName || 'Unbenannt'}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {c.gaiaID}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>{t('subject') || 'Betreff'}</label>
        <input
          type="text"
          className="input-field"
          placeholder="Projektplanung 2026..."
          value={composeSubject}
          onChange={e => setComposeSubject(e.target.value)}
          required
        />
      </div>

      <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <label>{t('message') || 'Nachricht'}</label>
        <div className="markdown-toolbar">
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('bold')}>B</button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('italic')}>I</button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('underline')}>U</button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('heading')}>H3</button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('code')}>&lt;/&gt;</button>
        </div>
        <textarea
          ref={textareaRef}
          className="input-field"
          placeholder={t('write_message_placeholder') || 'Schreibe deine Nachricht...'}
          style={{ flex: 1, minHeight: '200px', resize: 'none', lineHeight: '1.5', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)' }}
          value={composeBody}
          onChange={e => setComposeBody(e.target.value)}
          required
        />
      </div>

      {/* Delayed Send (Snooze / Schedule Send) Controls */}
      <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          📅 Delayed Sending / Schedule Send (Später senden)
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
          <input
            type="datetime-local"
            className="input-field"
            value={composeScheduledFor}
            onChange={e => setComposeScheduledFor(e.target.value)}
            style={{ maxWidth: '220px', fontSize: '0.85rem', padding: '6px 10px' }}
          />
          {composeScheduledFor && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setComposeScheduledFor('')}
              style={{ padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Zeitplan löschen
            </button>
          )}
        </div>
      </div>

      {/* Attachments Section */}
      <div className="form-group">
        <label>{t('attachments') || 'Anhänge'}</label>
        <div className="attachment-upload-zone" onClick={() => fileInputRef.current.click()}>
          <Icons.Attachment />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {isSmtpMode 
              ? (t('attachment_smtp_hint') || 'Datei auswählen (Maximal 30 MB für klassische unverschlüsselte Mails).')
              : (t('attachment_gaia_hint') || 'Klicke hier, um eine Datei auszuwählen und post-quantum E2E verschlüsselt hochzuladen.')
            }
          </p>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>

        {uploadFile && (
          <div className="attachment-file-pill">
            <span>{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '0.75rem' }}>{uploadProgress}%</span>
            {uploadProgress < 100 && (
              <div className="attachment-progress-bar" style={{ width: '80px', margin: 0 }}>
                <div className="attachment-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>
        )}
      </div>

      {composeError && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{composeError}</p>}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '12px 24px' }} onClick={() => setIsComposing(false)}>
          {t('abbrechen') || 'Abbrechen'}
        </button>
        <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 36px' }}>
          <Icons.Sent /> {composeScheduledFor ? 'Zeitplan speichern' : (t('senden') || 'Senden')}
        </button>
      </div>
    </form>
  );
};

export default ComposerPane;
