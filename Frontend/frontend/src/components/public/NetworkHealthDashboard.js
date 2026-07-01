// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import * as api from '../../api';

const formatNumber = value => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : '0';
};

const formatTimestamp = value => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 'Unavailable';
  return new Date(number * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const shorten = (value, front = 18, back = 16) => {
  if (!value) return 'Unavailable';
  if (value.length <= front + back + 3) return value;
  return `${value.slice(0, front)}...${value.slice(-back)}`;
};

export default function NetworkHealthDashboard({ onClose, embedded = false }) {
  const [health, setHealth] = React.useState(null);
  const [securityHealth, setSecurityHealth] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    async function loadHealth() {
      setLoading(true);
      setError('');
      try {
        const result = await api.getNetworkHealth();
        if (mounted) {
          setHealth(result);
        }
        try {
          const secResult = await api.getPublicSecurityHealth();
          if (mounted) {
            setSecurityHealth(secResult);
          }
        } catch (e) {
          console.warn("Public security health is unavailable:", e);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Network health is unavailable.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadHealth();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = health?.metrics || {};
  const transparency = health?.cryptoTransparency || {};
  const signedStatus = health?.signedNodeStatus || {};
  const metricCards = [
    ['Accounts', metrics.accounts],
    ['Identities', metrics.identities],
    ['Nodes', metrics.nodes],
    ['Rooms', metrics.rooms],
    ['Messages (24h)', metrics.messages24h],
    ['GaiaDrops (24h)', metrics.gaiaDrops24h],
    ['Federation Events (24h)', metrics.federationEvents24h],
    ['Node Uptime', health?.uptimePercent || 'Unavailable']
  ];
  const cryptoCards = [
    ['Protocol Version', health?.protocolVersion || transparency.protocolVersion],
    ['Hybrid KEM', transparency.hybridKem],
    ['Encryption', transparency.encryption],
    ['Signatures', transparency.signatures],
    ['Federation', transparency.federation],
    ['SMTP Bridge', transparency.smtpBridge],
    ['No Godmode', transparency.noGodmode]
  ];

  const content = (
      <section className={`nhd-shell glass-panel ${embedded ? 'embedded' : ''}`} role={embedded ? 'region' : 'dialog'} aria-modal={embedded ? undefined : true} aria-labelledby="nhd-title">
        <div className="nhd-header">
          <div>
            <p className="nhd-kicker">Public Network Health Dashboard</p>
            <h2 id="nhd-title">{health?.title || 'GaiaCom Network Status'}</h2>
          </div>
          {!embedded && (
            <button type="button" className="nhd-close" onClick={onClose} aria-label="Close Network Health Dashboard">
              Close
            </button>
          )}
        </div>

        {loading ? (
          <div className="nhd-state">Loading signed network status...</div>
        ) : error ? (
          <div className="nhd-state danger">{error}</div>
        ) : (
          <>
            <div className="nhd-status-row">
              <div>
                <span>Protocol Version</span>
                <strong>{health.protocolVersion || 'v0.1'}</strong>
              </div>
              <div>
                <span>Network Status</span>
                <strong>{health.networkStatus || 'Operational'}</strong>
              </div>
            </div>

            <div className="nhd-metric-grid">
              {metricCards.map(([label, value]) => (
                <div className="nhd-metric-card" key={label}>
                  <span>{label}</span>
                  <strong>{typeof value === 'number' ? formatNumber(value) : value}</strong>
                </div>
              ))}
            </div>

            <div className="nhd-section">
              <h3>Cryptographic Transparency</h3>
              <div className="nhd-crypto-grid">
                {cryptoCards.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value || 'Unavailable'}</strong>
                  </div>
                ))}
              </div>
            </div>

            {securityHealth && (
              <div className="nhd-section">
                <h3>GaiaShield Security Status</h3>
                <div className="nhd-crypto-grid">
                  <div>
                    <span>GaiaShield Status</span>
                    <strong className={securityHealth.gaiaShieldActive ? 'nhd-status-secure' : 'nhd-status-warning'}>
                      {securityHealth.gaiaShieldActive ? 'ACTIVE (SECURED)' : 'INACTIVE'}
                    </strong>
                  </div>
                  <div>
                    <span>Blocked Requests (24h)</span>
                    <strong>{formatNumber(securityHealth.blockedRequests24h)}</strong>
                  </div>
                  <div>
                    <span>Security Events (24h)</span>
                    <strong>{formatNumber(securityHealth.securityEvents24h)}</strong>
                  </div>
                  <div>
                    <span>SMTP Legacies Blocked</span>
                    <strong>{formatNumber(securityHealth.smtpShieldEvents24h)}</strong>
                  </div>
                  <div>
                    <span>Federation Rejects</span>
                    <strong>{formatNumber(securityHealth.federationRejects24h)}</strong>
                  </div>
                  <div>
                    <span>Shield Policy Version</span>
                    <strong>{securityHealth.policyVersion || 'v1.0'}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="nhd-section">
              <h3>Signed Node Status</h3>
              <div className="nhd-signature-card">
                <div><span>Node</span><strong>{signedStatus.node || 'Unavailable'}</strong></div>
                <div><span>Timestamp</span><strong>{formatTimestamp(signedStatus.timestamp)}</strong></div>
                <div><span>Public Key</span><code>{shorten(signedStatus.publicKey)}</code></div>
                <div><span>Signature</span><code>{shorten(signedStatus.signature, 24, 24)}</code></div>
              </div>
            </div>

            <div className="nhd-section">
              <h3>Privacy Boundary</h3>
              <div className="nhd-boundary-grid">
                <div>
                  <strong>Allowed</strong>
                  {(health.allowedAggregates || []).map(item => <span key={item}>{item}</span>)}
                </div>
                <div>
                  <strong>Never Published</strong>
                  {(health.forbiddenData || []).map(item => <span key={item}>{item}</span>)}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
  );

  if (embedded) {
    return <div className="nhd-page">{content}</div>;
  }

  return (
    <div className="popup-overlay nhd-overlay">
      {content}
    </div>
  );
}
