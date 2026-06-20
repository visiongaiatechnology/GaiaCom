import React, { useRef } from 'react';
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
  fileInputRef,
  handleFileUpload,
  uploadFile,
  uploadProgress,
  composeError,
  handleSendMail,
  setIsComposing,
  t
}) => {
  const textareaRef = useRef(null);

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

  return (
    <form className="composer-form" onSubmit={handleSendMail}>
      <button type="button" className="mobile-back-btn" onClick={() => setIsComposing(false)}>← {t('wizard_back') || 'Zurück'}</button>
      <h2>{t('neue_mail') || 'Neue GaiaCOM E-Mail'}</h2>
      
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

      <div className="form-group">
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
          required
        />
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

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '12px 24px' }} onClick={() => setIsComposing(false)}>
          {t('abbrechen') || 'Abbrechen'}
        </button>
        <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 36px' }}>
          <Icons.Sent /> {t('senden') || 'Senden'}
        </button>
      </div>
    </form>
  );
};

export default ComposerPane;
