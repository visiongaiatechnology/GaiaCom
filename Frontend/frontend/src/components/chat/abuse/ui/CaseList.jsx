import React from 'react';
import CaseStatusPill from './CaseStatusPill';
import { categoryLabel, formatCaseId, formatDateTime, severityLabel } from '../utils/abuseFormat';

/**
 * Report queue list. One row per case, hairline separated, never a card wall.
 * The row is a single button so it is keyboard reachable and announces the
 * selected case through `aria-pressed`.
 */
export default function CaseList({ cases, selectedCaseId, onSelect, emptyNote }) {
  const items = Array.isArray(cases) ? cases : [];

  if (items.length === 0) {
    return <p className="vgt-empty-note">{emptyNote}</p>;
  }

  return (
    <ul className="vgt-row-list vgt-case-list">
      {items.map(item => {
        const active = selectedCaseId === item.id;
        return (
          <li key={item.id} className={active ? 'is-active' : undefined}>
            <button
              type="button"
              className="vgt-case-row"
              onClick={() => onSelect(item)}
              aria-pressed={active}
            >
              <span className="vgt-case-row__main">
                <strong>Fall {formatCaseId(item.id)}</strong>
                <span className="vgt-row__meta">
                  {categoryLabel(item.category)} · {severityLabel(item.severity)}
                </span>
                <span className="vgt-row__meta">{formatDateTime(item.createdAt)}</span>
              </span>
              <CaseStatusPill status={item.status} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
