import React, { useId } from 'react';

/**
 * Section frame for the identity workspace: eyebrow, heading, optional
 * description and actions. Grouping is expressed by rhythm and one hairline,
 * never by card-in-card nesting.
 */
export default function ProfileSection({
  eyebrow,
  title,
  description,
  actions,
  tone = 'normal',
  children
}) {
  const titleId = useId();
  return (
    <section
      className={`vgt-profile-section ${tone === 'danger' ? 'is-danger' : ''}`.trim()}
      aria-labelledby={titleId}
    >
      <header className="vgt-profile-section__head">
        <div className="vgt-profile-section__titles">
          {eyebrow ? <span className="vgt-eyebrow">{eyebrow}</span> : null}
          <h2 className="vgt-h3" id={titleId}>{title}</h2>
          {description ? <p className="vgt-body vgt-body--sm">{description}</p> : null}
        </div>
        {actions ? <div className="vgt-profile-section__actions">{actions}</div> : null}
      </header>
      <div className="vgt-profile-section__body">{children}</div>
    </section>
  );
}
