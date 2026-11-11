import React from 'react';
import ChatDialog from '../shared/ChatDialog';
import { REPORT_COMMENT_LIMIT } from './useGroupChatExports';

/**
 * Trust, egress and moderation dialogs of the group surface.
 * Same API calls as before, now a keyboard-complete Z4 dialog.
 */
export default function GroupChatModals({ report, encryptedExport, gaiaProof, kick, roomName, t }) {
  return (
    <>
      {report.open ? (
        <ChatDialog
          eyebrow="Trust & Safety"
          title={roomName ? `Gruppe ${roomName} melden` : (t('report_group') || 'Gruppe melden')}
          description="Die Meldung geht an das Abuse-Center und betrifft den ganzen Raum."
          onClose={report.closeModal}
          footer={(
            <>
              <button type="button" className="btn-secondary" onClick={report.closeModal} disabled={report.busy}>
                {t('abbrechen') || 'Abbrechen'}</button>
              <button
                type="button"
                className="btn-danger"
                onClick={report.submit}
                disabled={report.busy || report.comment.length > REPORT_COMMENT_LIMIT}
              >
                {report.busy ? 'Sendet…' : (t('gsn_report') || 'Melden')}
              </button>
            </>
          )}
        >
          <div className="vgt-chat-field">
            <label className="input-label" htmlFor="group-report-category">{t('gsn_report_category') || 'Kategorie'}</label>
            <select
              id="group-report-category"
              className="input-field"
              value={report.category}
              onChange={event => report.setCategory(event.target.value)}
              disabled={report.busy}
            >
              <option value="spam">{t('gsn_report_spam') || 'Spam / Werbung'}</option>
              <option value="phishing">{t('gsn_report_phishing') || 'Phishing / Betrug'}</option>
              <option value="malware">{t('gsn_report_malware') || 'Malware / Schadcode'}</option>
              <option value="harassment">{t('gsn_report_harassment') || 'Belästigung'}</option>
              <option value="illegal_content">{t('gsn_report_illegal') || 'Illegale Inhalte'}</option>
              <option value="threat">{t('gsn_report_threat') || 'Akute Bedrohung'}</option>
              <option value="other">{t('gsn_report_other') || 'Sonstiges'}</option>
            </select>
          </div>

          <div className="vgt-chat-field">
            <label className="input-label" htmlFor="group-report-severity">{t('gsn_report_severity') || 'Schweregrad'}</label>
            <select
              id="group-report-severity"
              className="input-field"
              value={report.severity}
              onChange={event => report.setSeverity(event.target.value)}
              disabled={report.busy}
            >
              <option value="low">{t('gsn_report_low') || 'Niedrig'}</option>
              <option value="medium">{t('gsn_report_medium') || 'Mittel'}</option>
              <option value="high">{t('gsn_report_high') || 'Hoch'}</option>
              <option value="critical">{t('gsn_report_critical') || 'Kritisch'}</option>
            </select>
          </div>

          <div className="vgt-chat-field">
            <label className="input-label" htmlFor="group-report-comment">Begründung</label>
            <textarea
              id="group-report-comment"
              className="input-field"
              value={report.comment}
              maxLength={REPORT_COMMENT_LIMIT + 500}
              onChange={event => report.setComment(event.target.value)}
              disabled={report.busy}
              placeholder="Optionaler Kontext für das Meldecenter…"
              rows={4}
              aria-invalid={report.comment.length > REPORT_COMMENT_LIMIT}
            />
            <span className={`field-hint ${report.comment.length > REPORT_COMMENT_LIMIT ? 'field-error' : ''}`}>
              <span className="vgt-numeric">{report.comment.length}</span> / <span className="vgt-numeric">{REPORT_COMMENT_LIMIT}</span>
            </span>
          </div>
        </ChatDialog>
      ) : null}

      {encryptedExport.open ? (
        <ChatDialog
          eyebrow="Datensouveränität"
          title="Gruppenkanal verschlüsselt exportieren"
          description="Der Export wird lokal mit deinem Passwort verschlüsselt und als JSON gespeichert."
          onClose={encryptedExport.closeModal}
          footer={(
            <>
              <button type="button" className="btn-secondary" onClick={encryptedExport.closeModal} disabled={encryptedExport.busy}>
                {t('abbrechen') || 'Abbrechen'}</button>
              <button
                type="button"
                className="btn-primary"
                onClick={encryptedExport.submit}
                disabled={encryptedExport.busy || !encryptedExport.password.trim()}
              >
                {encryptedExport.busy ? 'Exportiert…' : (t('sc_btn_export') || 'Exportieren')}
              </button>
            </>
          )}
        >
          <div className="vgt-chat-field">
            <label className="input-label" htmlFor="group-export-password">Export-Passwort</label>
            <input
              id="group-export-password"
              type="password"
              className="input-field"
              value={encryptedExport.password}
              onChange={event => encryptedExport.setPassword(event.target.value)}
              disabled={encryptedExport.busy}
              autoFocus
              autoComplete="new-password"
            />
            <span className="field-hint">Ohne dieses Passwort ist der Export nicht wiederherstellbar.</span>
          </div>
        </ChatDialog>
      ) : null}

      {gaiaProof.open ? (
        <ChatDialog
          eyebrow="Nachweis"
          title="GaiaProof exportieren"
          description="Das Paket enthält die Signaturen und Server-Zustellnachweise dieses Gruppenkanals."
          onClose={gaiaProof.closeModal}
          footer={(
            <>
              <button type="button" className="btn-secondary" onClick={gaiaProof.closeModal}>
                {t('abbrechen') || 'Abbrechen'}</button>
              <button type="button" className="btn-primary" onClick={gaiaProof.submit}>
                {t('sc_btn_export') || (t('sc_btn_export') || 'Exportieren')}</button>
            </>
          )}
        >
          <p className="vgt-body vgt-body--sm">
            Der Export ist nicht mit einem Passwort verschlüsselt und nur für die Weitergabe an eine
            Prüfstelle gedacht.
          </p>
        </ChatDialog>
      ) : null}

      {kick.open ? (
        <ChatDialog
          eyebrow="Moderation"
          title="Mitglied entfernen"
          description={kick.memberName ? `${kick.memberName} wird aus der Gruppe entfernt.` : 'Das Mitglied wird aus der Gruppe entfernt.'}
          onClose={kick.onCancel}
          footer={(
            <>
              <button type="button" className="btn-secondary" onClick={kick.onCancel}>
                {t('abbrechen') || 'Abbrechen'}</button>
              <button type="button" className="btn-danger" onClick={kick.onConfirm}>
                Entfernen
              </button>
            </>
          )}
        >
          <p className="vgt-body vgt-body--sm">
            Das Mitglied verliert den Zugriff auf alle Kanäle dieses Raums. Die Aktion wird im
            Moderationslog erfasst.
          </p>
        </ChatDialog>
      ) : null}
    </>
  );
}
