import React from 'react';
import { severityLabel, severityTone, unavailable } from '../utils/securityFormat';

/**
 * Severity is communicated by text plus tone; colour alone never carries the
 * meaning. Unknown severities are shown verbatim rather than guessed. The
 * label resolves through the locale keys when a `t` function is provided.
 */
export default function SeverityBadge({ severity, t }) {
  if (!severity) {
    return <span className="vgt-status vgt-status--idle">{unavailable(t)}</span>;
  }
  return (
    <span className={`vgt-status vgt-status--${severityTone(severity)}`}>
      {severityLabel(severity, t)}
    </span>
  );
}
