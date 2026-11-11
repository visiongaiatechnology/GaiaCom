import React from 'react';
import Icon from '../../ui/Icon';

const TONE_ICONS = {
  info: 'info',
  warning: 'alertTriangle',
  danger: 'alertOctagon'
};

/**
 * Functional notice for a clearly named security or delivery state.
 * Colour is never the only signal: an icon, a title and the body text carry it.
 */
export default function MailSecurityNotice({
  tone = 'info',
  icon,
  title,
  role,
  children
}) {
  return (
    <div className={`vgt-mail-notice vgt-mail-notice--${tone}`} role={role}>
      <span className="vgt-mail-notice__icon" aria-hidden="true">
        <Icon name={icon || TONE_ICONS[tone] || 'info'} size={18} />
      </span>
      <div className="vgt-mail-notice__text">
        {title ? <p className="vgt-mail-notice__title">{title}</p> : null}
        <p className="vgt-mail-notice__body">{children}</p>
      </div>
    </div>
  );
}
