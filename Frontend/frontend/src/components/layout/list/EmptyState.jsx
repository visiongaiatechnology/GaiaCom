import React from 'react';
import Icon from '../../ui/Icon';

/**
 * VGT GLASS 2100 — honest list empty state.
 *
 * States explain why the list is empty and offer the next real action (only
 * handlers that already exist are accepted). No decorative illustration, no
 * fake counts, no emoji.
 */
export default function EmptyState({ icon = 'info', title, description, actions = [] }) {
  const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
  return (
    <div className="vgt-inbox-empty" role="status">
      <span className="vgt-inbox-empty__mark" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <p className="vgt-inbox-empty__title">{title}</p>
      {description ? <p className="vgt-inbox-empty__text">{description}</p> : null}
      {list.length > 0 ? (
        <div className="vgt-inbox-empty__actions">
          {list.map((action) => {
            const variant = action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
            return (
              <button
                key={action.label}
                type="button"
                className={`${variant}${action.variant === 'ghost' ? ' btn-ghost' : ''}`}
                onClick={action.onClick}
                disabled={action.disabled === true}
              >
                {action.icon ? <Icon name={action.icon} size={15} /> : null}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
