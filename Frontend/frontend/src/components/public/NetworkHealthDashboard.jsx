import React from 'react';
import * as api from '../../api';
import Icon from '../ui/Icon';
import useDialogA11y from '../common/useDialogA11y';

const UNAVAILABLE = 'Nicht verfügbar';

const formatNumber = (value) => {
  const number = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) return UNAVAILABLE;
  return number.toLocaleString('de-DE');
};

const formatTimestamp = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return UNAVAILABLE;
  return new Date(number * 1000).toLocaleString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const shorten = (value, front = 22, back = 14) => {
  if (!value || typeof value !== 'string') return UNAVAILABLE;
  if (value.length <= front + back + 3) return value;
  return `${value.slice(0, front)}…${value.slice(-back)}`;
};

const renderValue = (value) => {
  if (value === null || value === undefined || value === '') return UNAVAILABLE;
  if (typeof value === 'boolean') return value ? 'Aktiv' : 'Inaktiv';
  if (typeof value === 'string' && /^[a-z0-9_.-]+$/i.test(value) && value.length > 28) return shorten(value, 24, 12);
  return String(value);
};

export default function NetworkHealthDashboard({ onClose, embedded = false }) {
  const [health, setHealth] = React.useState(null);
  const [securityHealth, setSecurityHealth] = React.useState(null);
  const [securityUnavailable, setSecurityUnavailable] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    async function loadHealth() {
      setLoading(true);
      setError('');
      setSecurityUnavailable(false);
      try {
        const result = await api.getNetworkHealth();
        if (mounted) setHealth(result);
        try {
          const secResult = await api.getPublicSecurityHealth();
          if (mounted) setSecurityHealth(secResult);
        } catch (securityError) {
          if (mounted) {
            setSecurityHealth(null);
            setSecurityUnavailable(true);
          }
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Netzwerkstatus konnte nicht geladen werden.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadHealth();
    return () => { mounted = false; };
  }, [reloadKey]);

  // The full-screen variant is a modal dialog: trap focus, close on Escape and
  // restore the previous focus. The embedded pane variant is normal content.
  const dialogRef = useDialogA11y(!embedded, { onClose });

  const metrics = health?.metrics || {};
  const transparency = health?.cryptoTransparency || {};
  const signedStatus = health?.signedNodeStatus || {};

  const metricRows = [
    ['Konten', metrics.accounts],
    ['Identitäten', metrics.identities],
    ['Nodes', metrics.nodes],
    ['Räume', metrics.rooms],
    ['Nachrichten (24 h)', metrics.messages24h],
    ['GaiaDrops (24 h)', metrics.gaiaDrops24h],
    ['Federation-Ereignisse (24 h)', metrics.federationEvents24h],
    ['Node-Verfügbarkeit', health?.uptimePercent]
  ];

  const cryptoRows = [
    ['Protokollversion', health?.protocolVersion || transparency.protocolVersion],
    ['Hybrides KEM', transparency.hybridKem],
    ['Verschlüsselung', transparency.encryption],
    ['Signaturen', transparency.signatures],
    ['Föderation', transparency.federation],
    ['SMTP-Brücke', transparency.smtpBridge],
    ['Kein Godmode', transparency.noGodmode]
  ];

  const retry = () => setReloadKey((value) => value + 1);

  const body = (
    <>
      <header className="vgt-nhd__head">
        <div>
          <p className="vgt-eyebrow">Öffentliche Netzwerk-Transparenz</p>
          <h1 className="vgt-h3" id="vgt-nhd-title">
            {health?.title || 'GaiaCom Netzwerkstatus'}
          </h1>
        </div>
        {!embedded && (
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Netzwerkstatus schließen">
            <Icon name="close" size={18} />
          </button>
        )}
      </header>

      {loading ? (
        <div className="vgt-nhd__state" role="status" aria-live="polite">
          <Icon name="spinner" size={18} className="vgt-nhd__spinner" />
          Signierten Netzwerkstatus laden…
        </div>
      ) : error ? (
        <div className="vgt-nhd__state vgt-nhd__state--error" role="alert">
          <Icon name="alertTriangle" size={18} />
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={retry}>
            <Icon name="refresh" size={15} />
            Erneut versuchen
          </button>
        </div>
      ) : (
        <>
          <div className="vgt-nhd__subhead">
            <span className="vgt-status vgt-status--info">
              Protokoll {renderValue(health?.protocolVersion || 'v0.1')}
            </span>
            <span className="vgt-status vgt-status--idle">
              Status: {renderValue(health?.networkStatus)}
            </span>
            <button type="button" className="btn-ghost vgt-nhd__reload" onClick={retry}>
              <Icon name="refresh" size={14} />
              Aktualisieren
            </button>
          </div>

          <section className="vgt-nhd__section" aria-label="Netzwerkkennzahlen">
            <h2 className="vgt-h4">Kennzahlen</h2>
            <div className="vgt-nhd__metrics">
              {metricRows.map(([label, value]) => (
                <div className="vgt-nhd__metric" key={label}>
                  <span className="vgt-label">{label}</span>
                  <strong className="vgt-numeric">
                    {typeof value === 'number' ? formatNumber(value) : renderValue(value)}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section className="vgt-nhd__section" aria-label="Kryptografische Transparenz">
            <h2 className="vgt-h4">Kryptografische Transparenz</h2>
            <dl className="vgt-nhd__ledger">
              {cryptoRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{renderValue(value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {securityHealth ? (
            <section className="vgt-nhd__section" aria-label="GaiaShield-Status">
              <h2 className="vgt-h4">GaiaShield</h2>
              <dl className="vgt-nhd__ledger">
                <div>
                  <dt>Status</dt>
                  <dd>
                    {securityHealth.gaiaShieldActive
                      ? <span className="vgt-status vgt-status--ok">Aktiv</span>
                      : <span className="vgt-status vgt-status--warn">Inaktiv</span>}
                  </dd>
                </div>
                <div>
                  <dt>Blockierte Anfragen (24 h)</dt>
                  <dd className="vgt-numeric">{formatNumber(securityHealth.blockedRequests24h)}</dd>
                </div>
                <div>
                  <dt>Sicherheitsereignisse (24 h)</dt>
                  <dd className="vgt-numeric">{formatNumber(securityHealth.securityEvents24h)}</dd>
                </div>
                <div>
                  <dt>SMTP-Legacy-Blockierungen</dt>
                  <dd className="vgt-numeric">{formatNumber(securityHealth.smtpShieldEvents24h)}</dd>
                </div>
                <div>
                  <dt>Federation-Abweisungen</dt>
                  <dd className="vgt-numeric">{formatNumber(securityHealth.federationRejects24h)}</dd>
                </div>
                <div>
                  <dt>Policy-Version</dt>
                  <dd className="vgt-mono">{renderValue(securityHealth.policyVersion)}</dd>
                </div>
              </dl>
            </section>
          ) : securityUnavailable ? (
            <p className="vgt-caption vgt-nhd__note">
              Öffentlicher Security-Status ist derzeit nicht verfügbar. Es wird kein Ersatzwert angezeigt.
            </p>
          ) : null}

          <section className="vgt-nhd__section" aria-label="Signierter Node-Status">
            <h2 className="vgt-h4">Signierter Node-Status</h2>
            <dl className="vgt-nhd__ledger">
              <div><dt>Node</dt><dd>{renderValue(signedStatus.node)}</dd></div>
              <div><dt>Zeitstempel</dt><dd className="vgt-numeric">{formatTimestamp(signedStatus.timestamp)}</dd></div>
              <div>
                <dt>Öffentlicher Schlüssel</dt>
                <dd className="vgt-mono" title={signedStatus.publicKey || ''}>{shorten(signedStatus.publicKey)}</dd>
              </div>
              <div>
                <dt>Signatur</dt>
                <dd className="vgt-mono" title={signedStatus.signature || ''}>{shorten(signedStatus.signature, 26, 18)}</dd>
              </div>
            </dl>
          </section>

          <section className="vgt-nhd__section" aria-label="Datenschutzgrenze">
            <h2 className="vgt-h4">Datenschutzgrenze</h2>
            <div className="vgt-nhd__boundary">
              <div>
                <span className="vgt-label">Veröffentlicht</span>
                <ul>
                  {(health?.allowedAggregates || []).map((item) => <li key={item}>{item}</li>)}
                  {(health?.allowedAggregates || []).length === 0 && <li>{UNAVAILABLE}</li>}
                </ul>
              </div>
              <div>
                <span className="vgt-label">Nie veröffentlicht</span>
                <ul>
                  {(health?.forbiddenData || []).map((item) => <li key={item}>{item}</li>)}
                  {(health?.forbiddenData || []).length === 0 && <li>{UNAVAILABLE}</li>}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}

      <p className="vgt-caption vgt-nhd__note">
        Quelle: öffentliche Netzwerk-Transparenz-Endpunkte des Nodes. Werte werden unverändert dargestellt;
        die Anzeige prüft sie nicht kryptografisch.
      </p>
    </>
  );

  if (embedded) {
    return (
      <div className="vgt-nhd-page vgt-scroll-page">
        <section className="vgt-nhd vgt-nhd--embedded" aria-labelledby="vgt-nhd-title">
          {body}
        </section>
      </div>
    );
  }

  return (
    <div className="vgt-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section
        ref={dialogRef}
        className="vgt-nhd vgt-glass--modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vgt-nhd-title"
      >
        {body}
      </section>
    </div>
  );
}
