// STATUS: DIAMANT VGT SUPREME
import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { LanguageProvider } from './utils/i18n';

function FatalScreen() {
  return (
    <main className="astraea-startup astraea-startup--fault" role="alert">
      <div className="astraea-startup__mark"><img src="/astraeaos-logo.svg" alt="AstraeaOS" /></div>
      <p className="astraea-startup__eyebrow">ASTRAEAOS // SECURE FAIL-CLOSED</p>
      <h1>GaiaCom konnte nicht initialisiert werden</h1>
      <p className="astraea-startup__copy">
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
