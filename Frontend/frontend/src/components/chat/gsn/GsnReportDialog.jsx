import React from 'react';
import Icon from '../../ui/Icon';
import DialogShell from '../../modals/DialogShell';
import { GSN_REPORT_CATEGORIES, GSN_REPORT_MAX_COMMENT, GSN_REPORT_SEVERITIES } from './gsnProtocol';

/**
 * Abuse report dialog for GSN posts and profiles. The submit handler and the
 * comment length limit are the existing pane logic; this module only renders.
 */
export default function GsnReportDialog({
  t,
  reportCategory,
  setReportCategory,
  reportSeverity,
  setReportSeverity,
  reportComment,
  setReportComment,
  submittingReport,
  onSubmit,
  onClose
}) {
  const tooLong = reportComment.length > GSN_REPORT_MAX_COMMENT;

  return (
    <DialogShell
      id="gsn-report"
      eyebrow={t('gsn_report_title') || 'Verstoß melden'}
      title={t('gsn_report_title') || 'Verstoß melden'}
      description="Meldungen gehen an die Governance-Queue dieses Nodes. Bitte sachlich und konkret begründen."
      onClose={onClose}
      closeLabel={t('cancel') || 'Abbrechen'}
      size="sm"
      footer={
        <div className="vgt-dialog__actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submittingReport}>
            {t('cancel') || 'Abbrechen'}
          </button>
          <button type="submit" form="gsn-report-form" className="btn-danger" disabled={submittingReport || tooLong}>
            <Icon name="alertTriangle" size={15} />
            {submittingReport ? (t('sending') || 'Sendet…') : (t('gsn_report_submit') || 'Melden')}
          </button>
        </div>
      }
    >
      <form id="gsn-report-form" className="vgt-dialog__form" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        <div className="vgt-field">
          <label className="vgt-label" htmlFor="gsn-report-category">
            {t('gsn_report_category') || 'Kategorie'}
          </label>
          <select
            id="gsn-report-category"
            className="input-field"
            value={reportCategory}
            onChange={event => setReportCategory(event.target.value)}
          >
            {GSN_REPORT_CATEGORIES.map(category => (
              <option key={category.value} value={category.value}>
                {t(category.key) || category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="gsn-report-severity">
            {t('gsn_report_severity') || 'Dringlichkeit'}
          </label>
          <select
            id="gsn-report-severity"
            className="input-field"
            value={reportSeverity}
            onChange={event => setReportSeverity(event.target.value)}
          >
            {GSN_REPORT_SEVERITIES.map(severity => (
              <option key={severity.value} value={severity.value}>
                {t(severity.key) || severity.label}
              </option>
            ))}
          </select>
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="gsn-report-comment">
            {t('gsn_report_comment') || 'Zusätzlicher Kommentar'}
          </label>
          <textarea
            id="gsn-report-comment"
            className="input-field"
            placeholder="Warum meldest du diesen Inhalt?"
            value={reportComment}
            maxLength={GSN_REPORT_MAX_COMMENT + 500}
            onChange={event => setReportComment(event.target.value)}
          />
          <span className={`vgt-caption vgt-numeric${tooLong ? ' vgt-danger-text' : ''}`}>
            {reportComment.length}/{GSN_REPORT_MAX_COMMENT}
          </span>
        </div>
      </form>
    </DialogShell>
  );
}
