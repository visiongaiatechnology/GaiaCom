import React from 'react';
import { statusLabel, statusTone } from '../utils/abuseFormat';

export default function CaseStatusPill({ status }) {
  if (!status) {
    return <span className="vgt-status vgt-status--idle">Nicht verfügbar</span>;
  }
  return (
    <span className={`vgt-status vgt-status--${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  );
}
