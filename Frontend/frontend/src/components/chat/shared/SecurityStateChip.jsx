import React from 'react';
import Icon from '../../ui/Icon';

/**
 * Renders exactly one message-security state derived by
 * `shared/securityState.js`. The visible label is short; the full evidence
 * (envelope suite string, flag source) is in the tooltip. There is no default
 * positive state — callers pass the derived object or nothing is shown.
 */
export default function SecurityStateChip({ state, className }) {
  if (!state) return null;
  return (
    <span
      className={`vgt-chat-secstate vgt-chat-secstate--${state.variant}${className ? ` ${className}` : ''}`}
      title={state.detail}
      data-security-state={state.key}
    >
      <Icon name={state.icon} size={12} />
      <span className="vgt-chat-secstate__label">{state.label}</span>
    </span>
  );
}
