import React from 'react';
import Icon from '../../ui/Icon';
import { formatFileSize } from './mailUtils';

/**
 * Attachment list. Each row is a real download action backed by the existing
 * decryption/download handler; attachments are never listed as fake previews.
 */
export default function MailAttachments({ attachments, msgId, onDownload, t }) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  const headingId = `vgt-mail-attachments-${msgId || 'thread'}`;

  return (
    <section className="vgt-mail-attachments" aria-labelledby={headingId}>
      <h4 className="vgt-label" id={headingId}>
        {t('attachments') || 'Anhänge'}{' '}
        <span className="vgt-numeric vgt-mail-attachments__count">({attachments.length})</span>
      </h4>
      <ul className="vgt-mail-attachments__list">
        {attachments.map((attachment, index) => {
          const name =
            attachment?.name || attachment?.fileName || (t('attachment') || 'Anhang');
          return (
            <li key={attachment?.fileId || `${name}-${index}`}>
              <button
                type="button"
                className="vgt-mail-attachment"
                onClick={() => onDownload(attachment)}
                aria-label={`${name} ${t('attachment_download') || 'herunterladen'}`}
              >
                <span className="vgt-mail-attachment__icon" aria-hidden="true">
                  <Icon name="paperclip" size={16} />
                </span>
                <span className="vgt-mail-attachment__name">{name}</span>
                <span className="vgt-mail-attachment__size vgt-numeric">
                  {formatFileSize(attachment?.size)}
                </span>
                <span className="vgt-mail-attachment__download" aria-hidden="true">
                  <Icon name="download" size={16} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
