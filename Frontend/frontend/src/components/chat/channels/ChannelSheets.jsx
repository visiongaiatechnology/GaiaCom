import React from 'react';
import Icon from '../../ui/Icon';
import DialogShell from '../../modals/DialogShell';
import { CHANNEL_CATEGORIES } from './channelMedia';

const REPORT_CATEGORIES = ['spam', 'phishing', 'malware', 'harassment', 'illegal_content', 'threat', 'other'];
const REPORT_SEVERITIES = ['low', 'medium', 'high', 'critical'];

/**
 * Channel-level overlays: abuse report dialog, channel control sheet and the
 * mobile category sheet. Each one is a Z4 dialog from the shared shell; the
 * callbacks are the ones the pane already owns.
 */
export function ChannelReportDialog({
  ct,
  channel,
  reportCategory,
  setReportCategory,
  reportSeverity,
  setReportSeverity,
  reportComment,
  setReportComment,
  onSubmit,
  onClose,
  busy
}) {
  return (
    <DialogShell
      id="channel-report"
      eyebrow={ct('report_action')}
      title={`${ct('report_title')}: ${channel?.name || ''}`}
      onClose={onClose}
      closeLabel={ct('cancel')}
      size="sm"
      footer={
        <div className="vgt-dialog__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {ct('cancel')}
          </button>
          <button type="submit" form="channel-report-form" className="btn-danger" disabled={busy}>
            <Icon name="alertTriangle" size={15} />
            {busy ? ct('report_submitting') : ct('report_submit')}
          </button>
        </div>
      }
    >
      <form id="channel-report-form" className="vgt-dialog__form" onSubmit={onSubmit}>
        <div className="vgt-field">
          <label className="vgt-label" htmlFor="channel-report-category">
            {ct('report_category')}
          </label>
          <select
            id="channel-report-category"
            className="input-field"
            value={reportCategory}
            onChange={event => setReportCategory(event.target.value)}
          >
            {REPORT_CATEGORIES.map(category => (
              <option key={category} value={category}>
                {ct(`report_${category}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="channel-report-severity">
            {ct('report_severity')}
          </label>
          <select
            id="channel-report-severity"
            className="input-field"
            value={reportSeverity}
            onChange={event => setReportSeverity(event.target.value)}
          >
            {REPORT_SEVERITIES.map(severity => (
              <option key={severity} value={severity}>
                {ct(`severity_${severity}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="vgt-field">
          <label className="vgt-label" htmlFor="channel-report-notes">
            {ct('report_notes')}
          </label>
          <textarea
            id="channel-report-notes"
            className="input-field"
            value={reportComment}
            placeholder={ct('report_placeholder')}
            onChange={event => setReportComment(event.target.value)}
          />
        </div>
      </form>
    </DialogShell>
  );
}

export function ChannelActionsSheet({
  ct,
  channel,
  isOperator,
  busy,
  onEdit,
  onToggleComments,
  onDelete,
  onToggleVerification,
  onBlock,
  onReport,
  onToggleSubscription,
  onClose
}) {
  return (
    <DialogShell
      id="channel-actions"
      eyebrow={ct('channel_control')}
      title={channel?.name || ''}
      onClose={onClose}
      closeLabel={ct('close')}
      size="sm"
    >
      <div className="vgt-dialog__list">
        {onToggleSubscription && (
          <button type="button" className="vgt-dialog__list-item" onClick={onToggleSubscription}>
            <Icon name={channel?.isSubscribed ? 'minus' : 'plus'} size={17} />
            <span>{channel?.isSubscribed ? (ct('unsubscribe') || 'Deabonnieren') : (ct('subscribe') || 'Abonnieren')}</span>
          </button>
        )}
        {channel?.isAdmin && (
          <>
            <button type="button" className="vgt-dialog__list-item" onClick={onEdit}>
              <Icon name="edit" size={17} />
              <span>{ct('edit_btn')}</span>
            </button>
            <button type="button" className="vgt-dialog__list-item" onClick={onToggleComments} disabled={busy}>
              <Icon name="chat" size={17} />
              <span>{channel.commentsEnabled === false ? ct('comments_on') : ct('comments_off')}</span>
            </button>
            <button type="button" className="vgt-dialog__list-item vgt-danger-text" onClick={onDelete}>
              <Icon name="trash" size={17} />
              <span>{ct('delete_channel')}</span>
            </button>
          </>
        )}

        {isOperator && (
          <button type="button" className="vgt-dialog__list-item" onClick={onToggleVerification}>
            <Icon name="seal" size={17} />
            <span>{channel?.isVerified ? ct('decertify') : ct('certify')}</span>
          </button>
        )}

        {!channel?.isAdmin && (
          <>
            <button type="button" className="vgt-dialog__list-item vgt-danger-text" onClick={onBlock}>
              <Icon name="shieldOff" size={17} />
              <span>{ct('block_action')}</span>
            </button>
            <button type="button" className="vgt-dialog__list-item vgt-danger-text" onClick={onReport}>
              <Icon name="alertTriangle" size={17} />
              <span>{ct('report_action')}</span>
            </button>
          </>
        )}
      </div>
    </DialogShell>
  );
}

export function ChannelCategorySheet({ ct, categoryLabel, discoverCategory, handleDiscoverCategory, onClose }) {
  return (
    <DialogShell id="channel-category" eyebrow={ct('discover')} title={ct('category')} onClose={onClose} closeLabel={ct('close')} size="sm">
      <div className="vgt-dialog__list">
        {CHANNEL_CATEGORIES.map(category => (
          <button
            key={category}
            type="button"
            className={`vgt-dialog__list-item${discoverCategory === category ? ' is-active' : ''}`}
            aria-pressed={discoverCategory === category}
            onClick={() => handleDiscoverCategory(category)}
          >
            <span>{categoryLabel(category)}</span>
            {discoverCategory === category && <Icon name="check" size={16} />}
          </button>
        ))}
      </div>
    </DialogShell>
  );
}
