import React from 'react';
import Icon from '../ui/Icon';

/**
 * Custom window controls for GaiaCom.
 * In Desktop (Tauri decorations: false): provides minimize, maximize/restore,
 * and close with seamless Tauri IPC and custom hover states.
 * In Web mode: provides fullscreen toggle / minimize simulation + security pill.
 */
export default function WindowControls() {
  const [maximized, setMaximized] = React.useState(false);
  const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

  React.useEffect(() => {
    if (isTauri) {
      document.documentElement.classList.add('is-tauri');
      let unlisten;
      (async () => {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          setMaximized(await win.isMaximized());
          unlisten = await win.onResized(async () => {
            try {
              setMaximized(await win.isMaximized());
            } catch { /* ignore */ }
          });
        } catch { /* not available */ }
      })();
      return () => {
        if (typeof unlisten === 'function') unlisten();
      };
    }

    const onFullscreenChange = () => {
      setMaximized(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [isTauri]);

  const call = async (method) => {
    if (isTauri) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        if (method === 'minimize') {
          await win.minimize();
        } else if (method === 'maximize') {
          await win.toggleMaximize();
          setMaximized(await win.isMaximized());
        } else if (method === 'close') {
          await win.close();
        }
      } catch { /* ignore */ }
    } else {
      if (method === 'maximize') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      } else if (method === 'minimize') {
        window.blur?.();
      }
    }
  };

  return (
    <div className="ax4-windowcontrols window-controls" role="group" aria-label="Fenstersteuerung">
      <span className="ax4-web-pill" title="Post-Quantum Verschlüsselung aktiv (ML-KEM + HQC)">
        <Icon name="cpu" size={12} />
        <span>ML-KEM · HQC</span>
      </span>
      <button
        type="button"
        className="ax4-windowbtn window-btn"
        onClick={() => call('minimize')}
        aria-label="Minimieren"
        title="Minimieren"
      >
        <Icon name="minus" size={13} />
      </button>
      <button
        type="button"
        className="ax4-windowbtn window-btn"
        onClick={() => call('maximize')}
        aria-label={maximized ? 'Wiederherstellen' : 'Maximieren'}
        title={maximized ? 'Wiederherstellen' : 'Maximieren'}
      >
        <Icon name={maximized ? 'windowRestore' : 'square'} size={12} />
      </button>
      <button
        type="button"
        className="ax4-windowbtn ax4-windowbtn--close window-btn is-close"
        onClick={() => call('close')}
        aria-label="Schließen"
        title="Schließen"
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}
