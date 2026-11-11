import React, { useRef, useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import MailIdentityGlyph from './mail/MailIdentityGlyph';
import MailSecurityNotice from './mail/MailSecurityNotice';
import MailModeField from './mail/MailModeField';
import { formatFileSize } from './mail/mailUtils';

const FORMAT_ACTIONS = [
  { syntax: 'bold', label: 'B', title: 'Fett' },
  { syntax: 'italic', label: 'I', title: 'Kursiv' },
  { syntax: 'underline', label: 'U', title: 'Unterstrichen' },
  { syntax: 'heading', label: 'H3', title: 'Überschrift' },
  { syntax: 'list', label: '•', title: 'Aufzählung' },
  { syntax: 'code', label: '</>', title: 'Codeblock' }
];

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
  const recipientRef = useRef(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showScheduleRow, setShowScheduleRow] = useState(Boolean(composeScheduledFor));

  const canSchedule = typeof setComposeScheduledFor === 'function';
  const progressValue = Number(uploadProgress) || 0;
  const uploadInFlight = Boolean(uploadFile) && progressValue > 0 && progressValue < 100;

  useEffect(() => {
    if (mailSettings?.signature) {
      const sigLine = `\n\n---\n${mailSettings.signature}`;
      if (!composeBody) {
        setComposeBody(sigLine);
      } else if (!composeBody.includes(mailSettings.signature)) {
        setComposeBody(`\n\n${sigLine}\n\n${composeBody.trim()}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const isCoarse = typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)').matches;
    if (!isCoarse) recipientRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!composeTo?.trim() || !contacts) {
      setFilteredContacts([]);
      setShowAutocomplete(false);
      return;
    }
    const val = composeTo.toLowerCase();
    const matches = contacts.filter((c) => {
      const nameMatch = c.displayName?.toLowerCase().includes(val);
      const gaiaMatch = c.gaiaID?.toLowerCase().includes(val);
      if (isSmtpMode) {
        return nameMatch || gaiaMatch || c.email?.toLowerCase().includes(val);
      }
      return c.gaiaID && (nameMatch || gaiaMatch);
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
    let replacement = '';
    if (syntax === 'bold') replacement = `**${selected || 'fett'}**`;
    else if (syntax === 'italic') replacement = `*${selected || 'kursiv'}*`;
    else if (syntax === 'underline') replacement = `<u>${selected || 'unterstrichen'}</u>`;
    else if (syntax === 'heading') replacement = `### ${selected || 'Überschrift'}\n`;
    else if (syntax === 'list') replacement = `\n- ${selected || 'Punkt'}\n`;
    else if (syntax === 'code') replacement = `\`\`\`\n${selected || 'Code'}\n\`\`\``;

    setComposeBody(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      const pos = start + replacement.length;
      textarea.setSelectionRange(pos, pos);
    }, 40);
  };

  const handleSelectContact = (contact) => {
    const addr = isSmtpMode ? (contact.email || contact.gaiaID) : contact.gaiaID;
    setComposeTo(addr);
    setShowAutocomplete(false);
  };

  const handleSubmit = (event) => {
    setIsSending(true);
    try {
      Promise.resolve(handleSendMail(event))
        .catch(() => {})
        .finally(() => setIsSending(false));
    } catch (_) {
      setIsSending(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef?.current?.click();
  };

  return (
    <form className="vgt-mail-compose" onSubmit={handleSubmit} aria-labelledby="vgt-mail-compose-title">
      <header className="vgt-mail-compose__head">
        <div className="vgt-mail-compose__bar">
          <div className="vgt-mail-compose__heading-group">
            <button
              type="button"
              className="mobile-back-btn vgt-mail-back"
              onClick={() => setIsComposing(false)}
              aria-label={t('wizard_back') || 'Zurück'}
            >
              <Icon name="chevronLeft" size={16} />
              <span>{t('wizard_back') || 'Zurück'}</span>
            </button>
            <h2 className="vgt-mail-compose__title-text" id="vgt-mail-compose-title">
              {t('neue_mail') || 'Neue E-Mail'}
            </h2>
          </div>

          <div className="vgt-mail-compose__quick-actions">
            <div
              className={`vgt-mail-compose__pqc-pill ${isSmtpMode ? 'is-smtp' : 'is-pqc'}`}
              title={isSmtpMode ? 'SMTP-Zustellung (Ungesichert)' : 'ML-KEM-768 + HQC-256 Quantum Shield'}
            >
              <Icon name={isSmtpMode ? 'alertTriangle' : 'shieldCheck'} size={14} />
              <span>{isSmtpMode ? 'Legacy-SMTP' : 'PQC + Signatur (ML-KEM + HQC)'}</span>
            </div>

            <button
              type="button"
              className="btn-icon"
              onClick={openFileDialog}
              title={t('choose_file') || 'Anhang hinzufügen'}
            >
              <Icon name="paperclip" size={16} />
            </button>

            {canSchedule && (
              <button
                type="button"
                className={`btn-icon ${showScheduleRow ? 'is-active' : ''}`}
                onClick={() => setShowScheduleRow(!showScheduleRow)}
                title={t('schedule_send') || 'Zeitplan einstellen'}
              >
                <Icon name="calendar" size={16} />
              </button>
            )}

            <button
              type="button"
              className="btn-icon"
              onClick={() => setIsComposing(false)}
              title={t('abbrechen') || 'Verwerfen'}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="vgt-mail-compose__scroll">
        <div className="vgt-mail-compose__inner">
          <MailModeField isSmtpMode={isSmtpMode} setIsSmtpMode={setIsSmtpMode} t={t} />

          {isSmtpMode && (
            <MailSecurityNotice
              tone="warning"
              icon="shieldOff"
              role="status"
              title={t('security_warning_title') || 'Sicherheitswarnung'}
            >
              {t('smtp_security_warning_desc') ||
                'Diese Nachricht verlässt den GaiaCom-Sicherheitsraum. SMTP-Zustellung bietet keine GaiaCOM-native Ende-zu-Ende-Garantie ab dem Gateway.'}
            </MailSecurityNotice>
          )}

          {/* An: Row */}
          <div className="vgt-mail-form-row">
            <label className="vgt-mail-form-row__label" htmlFor="vgt-compose-to">
              {t('receiver_label') || 'An:'}
            </label>
            <div className="vgt-mail-form-row__input-wrap vgt-mail-suggest-anchor">
              <input
                ref={recipientRef}
                id="vgt-compose-to"
                type="text"
                className="vgt-mail-form-row__input"
                placeholder={isSmtpMode ? 'empfaenger@domain.de' : 'name@domain (Gaia-Adresse)'}
                value={composeTo}
                onChange={(event) => setComposeTo(event.target.value)}
                onFocus={() => {
                  if (filteredContacts.length > 0) setShowAutocomplete(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowAutocomplete(false), 200);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setShowAutocomplete(false);
                }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showAutocomplete}
                aria-controls="vgt-compose-suggestions"
                required
                autoComplete="off"
              />

              {showAutocomplete && (
                <div
                  id="vgt-compose-suggestions"
                  className="vgt-glass vgt-glass--floating vgt-mail-suggest"
                  role="listbox"
                >
                  {filteredContacts.map((contact) => {
                    const address = contact.gaiaID || contact.email || '';
                    return (
                      <button
                        key={contact.ID || contact.gaiaID || address}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="vgt-mail-menu__item vgt-mail-suggest__item"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectContact(contact)}
                      >
                        <MailIdentityGlyph name={contact.displayName} address={address} size="sm" />
                        <span className="vgt-mail-suggest__name">
                          {contact.displayName || (t('unbenannt') || 'Unbenannt')}
                        </span>
                        <span className="vgt-mail-suggest__address vgt-mono">{address}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="vgt-mail-form-row__pills">
              <span className="vgt-chip-opt" title="Kopie">Cc</span>
              <span className="vgt-chip-opt" title="Blindkopie">Bcc</span>
            </div>
          </div>

          {/* Betreff: Row */}
          <div className="vgt-mail-form-row">
            <label className="vgt-mail-form-row__label" htmlFor="vgt-compose-subject">
              {t('subject_label') || 'Betreff:'}
            </label>
            <div className="vgt-mail-form-row__input-wrap">
              <input
                id="vgt-compose-subject"
                type="text"
                className="vgt-mail-form-row__input"
                placeholder={t('subject_placeholder') || 'Betreff eingeben…'}
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
                required
              />
            </div>
          </div>

          {/* Optional Schedule Row */}
          {canSchedule && showScheduleRow && (
            <div className="vgt-mail-form-row vgt-mail-schedule-row">
              <label className="vgt-mail-form-row__label" htmlFor="vgt-compose-schedule">
                {t('schedule_send') || 'Zeitplan:'}
              </label>
              <div className="vgt-mail-schedule__group">
                <input
                  id="vgt-compose-schedule"
                  type="datetime-local"
                  className="input-field vgt-mail-schedule__input"
                  value={composeScheduledFor || ''}
                  onChange={(event) => setComposeScheduledFor(event.target.value)}
                />
                {composeScheduledFor && (
                  <button
                    type="button"
                    className="btn-secondary vgt-mail-schedule__clear"
                    onClick={() => setComposeScheduledFor('')}
                  >
                    <Icon name="x" size={14} />
                    <span>{t('clear_schedule') || 'Zurücksetzen'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Editor Area with Integrated Modern Toolbar */}
          <div className="vgt-mail-editor-container">
            <div className="vgt-mail-toolbar" role="group" aria-label={t('formatting') || 'Formatierung'}>
              <div className="vgt-mail-toolbar__group">
                {FORMAT_ACTIONS.map((action) => (
                  <button
                    key={action.syntax}
                    type="button"
                    className="vgt-mail-toolbar__btn"
                    onClick={() => insertFormat(action.syntax)}
                    title={action.title}
                    aria-label={action.title}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="vgt-mail-toolbar__spacer" />
              <button
                type="button"
                className="vgt-mail-toolbar__btn"
                onClick={openFileDialog}
                title={t('choose_file') || 'Anhang auswählen'}
              >
                <Icon name="paperclip" size={14} />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              id="vgt-compose-body"
              className="vgt-mail-editor__body"
              placeholder={t('write_message_placeholder') || 'Sichere Nachricht schreiben… (Markdown unterstützt)'}
              value={composeBody}
              onChange={(event) => setComposeBody(event.target.value)}
              required
            />
          </div>

          {/* Attachments Display */}
          <input
            type="file"
            ref={fileInputRef}
            className="vgt-mail-file-input"
            onChange={handleFileUpload}
            tabIndex={-1}
            aria-hidden="true"
          />

          {uploadFile && (
            <div className="vgt-mail-upload-chip">
              <Icon name="file" size={16} />
              <div className="vgt-mail-upload-chip__info">
                <span className="vgt-mail-upload-chip__name">{uploadFile.name}</span>
                <span className="vgt-mail-upload-chip__size vgt-mono">
                  {formatFileSize(uploadFile.size)}
                </span>
              </div>
              <span className="vgt-mail-upload-chip__state">
                {uploadInFlight ? `${progressValue}%` : 'Verschlüsselt angehängt'}
              </span>
            </div>
          )}

          {composeError && (
            <MailSecurityNotice
              tone="danger"
              role="alert"
              title={t('send_failed') || 'Versand nicht möglich'}
            >
              {composeError}
            </MailSecurityNotice>
          )}
        </div>
      </div>

      <footer className="vgt-mail-compose__foot">
        <p className="vgt-caption vgt-mail-compose__status" role="status" aria-live="polite">
          {isSavingDraft
            ? (t('saving_draft') || 'Entwurf wird gespeichert…')
            : uploadInFlight
              ? (t('upload_running') || 'Anhang wird verschlüsselt…')
              : isSmtpMode
                ? (t('compose_foot_smtp') || 'Versand über Legacy-SMTP-Bridge (nicht Ende-zu-Ende).')
                : (t('compose_foot_gaia') || 'Übertragen über das GaiaCOM-Netz (Ende-zu-Ende verschlüsselt).')}
        </p>

        <div className="vgt-mail-compose__actions">
          <button type="button" className="btn-secondary" onClick={() => setIsComposing(false)}>
            {t('save_draft') || 'Entwurf speichern'}
          </button>
          <button
            type="submit"
            className="btn-primary vgt-mail-compose__send"
            disabled={isSending || uploadInFlight}
          >
            <Icon name={canSchedule && composeScheduledFor ? 'calendar' : 'send'} size={15} />
            <span>
              {isSending
                ? (t('sending') || 'Wird gesendet…')
                : canSchedule && composeScheduledFor
                  ? (t('schedule_save') || 'Zeitplan speichern')
                  : isSmtpMode
                    ? (t('senden') || 'Senden')
                    : (t('senden_verschluesselt') || 'Verschlüsselt senden')}
            </span>
          </button>
        </div>
      </footer>
    </form>
  );
};

export default ComposerPane;
