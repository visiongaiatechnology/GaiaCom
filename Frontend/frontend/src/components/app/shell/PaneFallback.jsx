import React from 'react';

/**
 * PaneFallback — Suspense loading surface for lazily loaded workspace panes.
 * Honest short loading text; no fake progress.
 */
export default function PaneFallback() {
  return (
    <div className="empty-reader-pane">
      <h2>GaiaCom</h2>
      <p className="vgt-pane-fallback__copy">Lade Modul …</p>
    </div>
  );
}
