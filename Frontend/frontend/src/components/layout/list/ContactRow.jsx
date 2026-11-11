import React from 'react';
import Icon from '../../ui/Icon';
import { initialsMark, truncateText } from './format';

/**
 * VGT GLASS 2100 — contact row.
 *
 * Primary action = start a mail to this contact (same handler as before), the
 * separated secondary action opens the contact profile. Abuse score is only
 * shown when the prop actually carries a positive score.
 */
export default function ContactRow({ contact, t, displayGaiaID, onCompose, onOpenProfile }) {
  const name = contact.displayName || '';
  const gaiaId = typeof displayGaiaID === 'function'
    ? displayGaiaID(contact.gaiaID)
    : (contact.gaiaID || '');
  const abuseScore = contact.abuseScore && contact.abuseScore.score > 0 ? contact.abuseScore.score : null;
  const preview = (typeof t === 'function' && t('click_to_write_mail')) || 'Klicken zum Schreiben einer Mail';
  const profileLabel = (typeof t === 'function' && (t('profil') || 'Profil')) || 'Profil';

  return (
    <li className="vgt-inbox-row vgt-inbox-row--contact">
      <button type="button" className="vgt-inbox-row__main" onClick={onCompose}>
        <span className="vgt-inbox-row__avatar" aria-hidden="true">{initialsMark(name || gaiaId)}</span>
        <span className="vgt-inbox-row__body">
          <span className="vgt-inbox-row__line vgt-inbox-row__line--top">
            <span className="vgt-inbox-row__name">{name}</span>
            {abuseScore ? (
              <span className="vgt-inbox-chip vgt-inbox-chip--warn" title="Abuse-Score">
                Score: {abuseScore}
              </span>
            ) : null}
          </span>
          <span className="vgt-inbox-row__id">{truncateText(gaiaId, 52)}</span>
          <span className="vgt-inbox-row__preview">{preview}</span>
        </span>
      </button>
      <span className="vgt-inbox-row__actions">
        <button
          type="button"
          className="btn-action vgt-inbox-row__aside"
          onClick={onOpenProfile}
          title={profileLabel}
        >
          <Icon name="user" size={14} />
          <span>{profileLabel}</span>
        </button>
      </span>
    </li>
  );
}
