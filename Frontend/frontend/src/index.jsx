import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { LanguageProvider } from './utils/i18n';

function StartupSeal() {
  return (
    <img
      className="vgt-startup__seal"
      src="/brand/gaiacom-mark.webp"
      width="52"
      height="52"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}

function FatalScreen() {
  return (
    <main className="vgt-startup vgt-startup--fault" role="alert">
      <div className="vgt-startup__mark" aria-hidden="true"><StartupSeal /></div>
      <p className="vgt-startup__eyebrow">Sicherer Start angehalten</p>
      <h1>GaiaCom konnte nicht initialisiert werden</h1>
      <p className="vgt-startup__copy">
        Der geschützte Client wurde angehalten. Starten Sie GaiaCom erneut; es wurden keine Schlüssel freigegeben.
      </p>
    </main>
  );
}

class RuntimeBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GaiaCom renderer initialization failed.', error, errorInfo);
  }

  render() {
    if (this.state.failed) return <FatalScreen />;
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!(rootElement instanceof HTMLElement)) {
  throw new Error('GaiaCom root container is unavailable.');
}

const root = ReactDOM.createRoot(rootElement);
try {
  root.render(
    <React.StrictMode>
      <RuntimeBoundary>
        <LanguageProvider><App /></LanguageProvider>
      </RuntimeBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('GaiaCom renderer bootstrap failed.', error);
  root.render(<FatalScreen />);
}

const nativeDesktop = Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__ || window.location.protocol === 'tauri:');
if (!nativeDesktop && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('ServiceWorker successfully registered with scope: ', reg.scope))
      .catch(err => console.error('ServiceWorker registration failed: ', err));
  });
}
