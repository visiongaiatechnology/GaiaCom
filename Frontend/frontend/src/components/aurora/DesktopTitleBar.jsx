import React from 'react';
import WindowControls from './WindowControls';

/**
 * Frameless window title bar for the unlocked screens (vault lock, auth, setup
 * wizard). The authenticated workspace renders its own integrated title bar;
 * this one keeps the custom window controls reachable before login.
 */
export default function DesktopTitleBar() {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return null;

  return (
    <header className="ax4-logintitlebar" data-tauri-drag-region="true">
      <div className="ax4-logintitlebar__brand" data-tauri-drag-region="true">
        <span className="ax4-logintitlebar__logo" aria-hidden="true" data-tauri-drag-region="true">
          <img src="/brand/gaiacom-mark.webp" width="22" height="22" alt="" draggable="false" />
        </span>
        <div data-tauri-drag-region="true">
          <strong>GaiaCom 3</strong>
          <small>Sovereign Post-Quantum Messenger · PQC · E2E-verschlüsselt</small>
        </div>
      </div>
      <WindowControls />
    </header>
  );
}
