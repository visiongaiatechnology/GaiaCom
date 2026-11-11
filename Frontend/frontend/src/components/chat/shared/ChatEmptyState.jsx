import React from 'react';
import Icon from '../../ui/Icon';

/**
 * Honest empty state: says why the surface is empty and what the next action is.
 * No fake data, no decorative illustration.
 */
export default function ChatEmptyState({ icon = 'chat', title, description, hint, action }) {
  return (
    <div className="vgt-chat-empty">
      <span className="vgt-chat-empty__mark" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <h2 className="vgt-chat-empty__title">{title}</h2>
      {description ? <p className="vgt-chat-empty__text">{description}</p> : null}
      {hint ? <p className="vgt-chat-empty__hint">{hint}</p> : null}
      {action ? <div className="vgt-chat-empty__action">{action}</div> : null}
    </div>
  );
}
