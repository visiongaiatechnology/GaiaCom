// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useEffect } from 'react';
import * as api from '../../api';
import GaiaPassportCard from '../common/GaiaPassportCard';
import HumanProofDialog from '../common/HumanProofDialog';
import { getHumanProof, saveHumanProof } from '../../utils/humanProof';

export default function SecurityCenter({ activeIdentity, derivedKeys, t, triggerAlert }) {
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'events', 'node_operator'
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [nodeSummary, setNodeSummary] = useState(null);
  const [nodeEvents, setNodeEvents] = useState([]);
  const [nodeRegistry, setNodeRegistry] = useState(null);
  const [nodeSecrets, setNodeSecrets] = useState(null);
  const [nodeRegistryError, setNodeRegistryError] = useState('');
  const [roles, setRoles] = useState([]);
  const [operatorAccess, setOperatorAccess] = useState(false);
  const [nodeOperatorError, setNodeOperatorError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showHumanProofDialog, setShowHumanProofDialog] = useState(false);
  const [humanProofRefresh, setHumanProofRefresh] = useState(0);
  const [humanProof, setHumanProof] = useState(null);
  const [trustPassport, setTrustPassport] = useState(null);

  useEffect(() => {
    setHumanProof(getHumanProof(activeIdentity?.GaiaID));
  }, [activeIdentity?.GaiaID, humanProofRefresh]);

  useEffect(() => {
    let cancelled = false;
    async function loadTrustPassport() {
      if (!activeIdentity?.GaiaID) {
        setTrustPassport(null);
        return;
      }
      try {
        const passport = await api.getTrustPassport(activeIdentity.GaiaID);
        if (cancelled) return;
        setTrustPassport(passport);
        if (passport?.humanProof) {
          saveHumanProof(activeIdentity.GaiaID, passport.humanProof);
          setHumanProof(passport.humanProof);
        }
      } catch (_) {}
    }
    loadTrustPassport();
    return () => {
      cancelled = true;
    };
  }, [activeIdentity?.GaiaID, humanProofRefresh]);

  // Load user roles
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await api.getGovernanceRoles();
        if (res && res.roles) {
          setRoles(res.roles);
        }
      } catch (_) {}
    }
    if (activeIdentity) {
      loadRoles();
    }
  }, [activeIdentity]);

  const isOperator = roles.includes('node_operator') || operatorAccess;

  const loadData = async () => {
    setLoading(true);
    try {
      const sumRes = await api.getSecuritySummary();
      setSummary(sumRes);

      const evsRes = await api.getSecurityEvents();
      setEvents(evsRes.events || []);

      try {
        const nodeSum = await api.getNodeSecuritySummary();
        setNodeSummary(nodeSum);
        const nodeEvs = await api.getNodeSecurityEvents();
        setNodeEvents(nodeEvs.events || []);
        try {
          const registryRes = await api.getNodeRegistrySummary();
          setNodeRegistry(registryRes);
          setNodeRegistryError('');
        } catch (registryErr) {
          setNodeRegistry(null);
          setNodeRegistryError(registryErr.message || 'Node Registry konnte nicht geladen werden.');
        }
        setOperatorAccess(true);
        setNodeOperatorError('');
      } catch (nodeErr) {
        setOperatorAccess(false);
        setNodeSummary(null);
        setNodeEvents([]);
        setNodeOperatorError(nodeErr.message || 'Node-Sicherheitsdaten konnten nicht geladen werden.');
      }
    } catch (err) {
      console.error('Failed to load security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeIdentity) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdentity, roles]);

  const handleAcknowledge = async (eventId) => {
    try {
      await api.acknowledgeSecurityEvent(eventId);
      triggerAlert(
        t('success') || 'Erfolg',
        'Sicherheitsereignis wurde bestätigt.',
        'success'
      );
      loadData();
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  const handleExport = async (format) => {
    try {
      const blob = await api.exportSecurityReport(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gaiashield_report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  const handleGenerateNodeSecrets = async () => {
    try {
      const result = await api.generateNodeRegistrySecrets();
      setNodeSecrets(result);
      triggerAlert('Erfolg', `Node-Secrets wurden erzeugt und in ${result.savedTo || 'node_secrets.json'} gespeichert.`, 'success');
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  const handlePingMainNode = async () => {
    try {
      const result = await api.pingNodeRegistryMain();
      triggerAlert('Erfolg', `Main-Node Ping akzeptiert: ${result.entry?.status || result.status}`, 'success');
      const registryRes = await api.getNodeRegistrySummary();
      setNodeRegistry(registryRes);
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  const handleRegistryStatus = async (domain, status) => {
    try {
      await api.updateNodeRegistryStatus(domain, status);
      triggerAlert('Erfolg', `Node ${domain} wurde auf ${status} gesetzt.`, 'success');
      const registryRes = await api.getNodeRegistrySummary();
      setNodeRegistry(registryRes);
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (filterSeverity !== 'all' && ev.severity !== filterSeverity) return false;
    if (filterCategory !== 'all' && ev.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="security-center-pane gaia-scrollbar" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      {/* HEADER */}
      <div className="security-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span className="auth-kicker">GaiaShield Integrated Security Layer</span>
          <h1 style={{ margin: '4px 0 0 0', fontSize: '1.8rem', fontWeight: '800' }}>Security Center</h1>
        </div>
      </div>

      {/* TABS */}
      <div className="security-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
        <button
          className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          {t('sc_tab_status') || '🛡️ Schutzstatus'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          {t('sc_tab_events') || '📋 Sicherheitsprotokoll'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'passport' ? 'active' : ''}`}
          onClick={() => setActiveTab('passport')}
        >
          Gaia Passport
        </button>
        {(isOperator || nodeOperatorError) && (
          <button
            className={`tab-btn ${activeTab === 'node_operator' ? 'active' : ''}`}
            onClick={() => setActiveTab('node_operator')}
          >
            {t('sc_tab_node') || '⚙️ Node-Sicherheit'}
          </button>
        )}
        {isOperator && (
          <button
            className={`tab-btn ${activeTab === 'node_system' ? 'active' : ''}`}
            onClick={() => setActiveTab('node_system')}
          >
            Nodesystem
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('sc_loading') || 'Lade Sicherheitsdaten...'}</div>
      ) : (
        <>
          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="security-status-tab" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="status-hero glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px', borderRadius: '12px' }}>
                <div className="shield-icon-container" style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: summary?.status === 'secured' ? 'rgba(0, 230, 115, 0.1)' : 'rgba(255, 179, 0, 0.1)',
                  border: summary?.status === 'secured' ? '2px solid var(--success)' : '2px solid var(--warning)',
                  boxShadow: summary?.status === 'secured' ? '0 0 15px var(--success-glow)' : '0 0 15px var(--warning-glow)',
                }}>
                  <span style={{ fontSize: '2rem' }}>{summary?.status === 'secured' ? '✓' : '!'}</span>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>
                    Systemstatus: {summary?.status === 'secured' ? (t('sc_status_secured') || 'Konto ist geschützt') : (t('sc_status_warning') || 'Warnungen aktiv')}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {summary?.status === 'secured' 
                      ? (t('sc_desc_secured') || 'Es liegen keine offenen kritischen Sicherheitswarnungen vor. GaiaShield überwacht dein Konto aktiv.')
                      : (t('sc_desc_warning') || 'Achtung: Es gibt offene Sicherheitsereignisse, die deine Aufmerksamkeit erfordern.') + ` (${summary?.activeWarnings || 0})`}
                  </p>
                </div>
              </div>

              <div className="security-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div className="security-card glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                  <h4>{t('sc_account_protection') || 'Konto-Schutz'}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{t('quantum_shield_status') || 'GaiaShield Status'}</span>
                    <strong style={{ color: 'var(--success)' }}>{t('sc_active') || 'AKTIV'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('sc_failed_logins') || 'Fehlgeschlagene Logins'}</span>
                    <strong>{events.filter(e => e.category === 'failed_login').length}</strong>
                  </div>
                </div>

                <div className="security-card glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                  <h4>{t('sc_message_protection') || 'Nachrichten-Schutz'}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{t('sc_tamper_checks') || 'Manipulationsprüfungen'}</span>
                    <strong style={{ color: 'var(--success)' }}>Optimal</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('sc_blocked_replays') || 'Blockierte Replays'}</span>
                    <strong>{events.filter(e => e.category === 'message_replay').length}</strong>
                  </div>
                </div>

                <div className="security-card glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                  <h4>{t('sc_audits') || 'Sicherheitsprüfungen'}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{t('sc_last_check') || 'Letzte Prüfung'}</span>
                    <span>{t('sc_just_now') || 'Gerade eben'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('sc_open_warnings') || 'Offene Warnungen'}</span>
                    <strong style={{ color: summary?.activeWarnings > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {summary?.activeWarnings || 0}
                    </strong>
                  </div>
                </div>
              </div>

              <section className="gaiashield-explainer glass-panel" aria-labelledby="gaiashield-explainer-title">
                <div className="gaiashield-explainer-intro">
                  <span className="gaiashield-explainer-kicker">GaiaShield</span>
                  <h3 id="gaiashield-explainer-title">{t('sc_explainer_title') || 'Was wird hier eigentlich geschützt?'}</h3>
                  <p>{t('sc_explainer_desc') || 'GaiaShield ist die Schutzschicht zwischen deinem Account, deinen Nachrichten und dem Netzwerk.'}</p>
                </div>
                <div className="gaiashield-explainer-grid">
                  <div className="gaiashield-explainer-card">
                    <strong>{t('onboarding_sec_identity_title') || 'Identität'}</strong>
                    <span>{t('sc_explainer_identity_desc') || 'Prüft Login-Anomalien, Session-Risiken und Zugriffe auf fremde Identitäten.'}</span>
                  </div>
                  <div className="gaiashield-explainer-card">
                    <strong>{t('onboarding_sec_messages_title') || 'Nachrichten'}</strong>
                    <span>{t('sc_explainer_messages_desc') || 'Erkennt Replay-Muster, manipulierte Umschläge und fehlende Integritätsmerkmale.'}</span>
                  </div>
                  <div className="gaiashield-explainer-card">
                    <strong>{t('onboarding_sec_network_title') || 'Netzwerk'}</strong>
                    <span>{t('sc_explainer_network_desc') || 'Markiert Federation-, Rate-Limit- und SMTP-Risiken, bevor Vertrauen falsch angezeigt wird.'}</span>
                  </div>
                  <div className="gaiashield-explainer-card">
                    <strong>{t('onboarding_sec_transparency_title') || 'Transparenz'}</strong>
                    <span>{t('onboarding_sec_transparency_desc') || 'Schreibt sicherheitsrelevante Ereignisse ins Protokoll, damit Warnungen nachvollziehbar bleiben.'}</span>
                  </div>
                </div>
              </section>


              {/* Warnings quick list */}
              {events.filter(e => !e.acknowledged_at && e.severity !== 'info' && e.severity !== 'low').length > 0 && (
                <div className="warnings-alert-section glass-panel" style={{ padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--warning)' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--warning)' }}>{t('sc_open_security_warnings') || 'Offene Sicherheitswarnungen'}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {events.filter(e => !e.acknowledged_at && e.severity !== 'info' && e.severity !== 'low').map((ev) => (
                      <div key={ev.event_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                        <div>
                          <strong style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--danger)' }}>{ev.category}</strong>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>{ev.summary}</p>
                        </div>
                        <button className="btn-primary compact-btn" onClick={() => handleAcknowledge(ev.event_id)}>{t('sc_btn_acknowledge') || 'Bestätigen'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EVENTS LOG */}
          {activeTab === 'events' && (
            <div className="security-events-tab">
              <div className="filter-bar glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px', color: 'var(--text-secondary)' }}>{t('sc_filter_severity') || 'Dringlichkeit'}</label>
                    <select className="input-field compact-input" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                      <option value="all">{t('sc_opt_all') || 'Alle'}</option>
                      <option value="info">Info</option>
                      <option value="low">{t('sc_opt_low') || 'Niedrig'}</option>
                      <option value="medium">{t('sc_opt_medium') || 'Mittel'}</option>
                      <option value="high">{t('sc_opt_high') || 'Hoch'}</option>
                      <option value="critical">{t('sc_opt_critical') || 'Kritisch'}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px', color: 'var(--text-secondary)' }}>{t('sc_filter_category') || 'Kategorie'}</label>
                    <select className="input-field compact-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                      <option value="all">{t('sc_opt_all') || 'Alle'}</option>
                      <option value="failed_login">{t('sc_opt_failed_login') || 'Fehlgeschlagener Login'}</option>
                      <option value="auth_attack">{t('sc_opt_auth_attack') || 'Auth-Angriff'}</option>
                      <option value="rate_limit">{t('sc_opt_rate_limit') || 'Rate Limit'}</option>
                      <option value="policy_violation">{t('sc_opt_policy_violation') || 'Richtlinien-Hinweis'}</option>
                      <option value="message_replay">{t('sc_opt_message_replay') || 'Nachrichten-Replay'}</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary compact-btn" onClick={() => handleExport('json')}>Download JSON</button>
                  <button className="btn-secondary compact-btn" onClick={() => handleExport('csv')}>Download CSV</button>
                </div>
              </div>

              <div className="events-list glass-panel gaia-scrollbar" style={{ borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden' }}>
                <table className="gaia-table security-events-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px' }}>{t('sc_col_time') || 'Zeit'}</th>
                      <th style={{ padding: '12px' }}>{t('sc_col_category') || 'Kategorie'}</th>
                      <th style={{ padding: '12px' }}>{t('sc_filter_severity') || 'Dringlichkeit'}</th>
                      <th style={{ padding: '12px' }}>{t('sc_col_details') || 'Beschreibung'}</th>
                      <th style={{ padding: '12px' }}>{t('sc_col_action') || 'Aktion'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('sc_no_events') || 'Keine Sicherheitsereignisse gefunden.'}</td>
                      </tr>
                    ) : (
                      filteredEvents.map((ev) => (
                        <tr key={ev.event_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontSize: '0.85rem' }}>{new Date(ev.created_at).toLocaleString()}</td>
                          <td style={{ padding: '12px' }}><span className="category-badge">{ev.category}</span></td>
                          <td style={{ padding: '12px' }}>
                            <span className={`severity-badge ${ev.severity}`} style={{
                              color: ev.severity === 'critical' || ev.severity === 'high' ? 'var(--danger)' : ev.severity === 'medium' ? 'var(--warning)' : 'var(--success)'
                            }}>{ev.severity}</span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.9rem' }}>{ev.summary}</td>
                          <td style={{ padding: '12px' }}>
                            {ev.acknowledged_at ? (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('sc_btn_acknowledge') || 'Bestätigt'}</span>
                            ) : (
                              <button className="btn-primary compact-btn" onClick={() => handleAcknowledge(ev.event_id)}>{t('sc_btn_acknowledge') || 'Bestätigen'}</button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'passport' && (
            <div className="security-passport-tab">
              <div className="security-passport-grid">
                <GaiaPassportCard
                  profile={{
                    displayName: activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.GaiaID,
                    gaiaId: activeIdentity?.GaiaID,
                    avatar: ''
                  }}
                  trustPassport={trustPassport || { trustAgeDays: 0, abuseScore: { score: 0, escalationLevel: 0 }, fingerprint: derivedKeys?.sign?.public }}
                  humanProof={humanProof}
                  isOwnProfile
                  onStartHumanProof={() => setShowHumanProofDialog(true)}
                />
                <section className="glass-panel security-passport-proof-panel">
                  <span className="auth-kicker">Human Proof PoC</span>
                  <h3>SHA-256 Ceremony</h3>
                  <p>
                    Die Ceremony laeuft lokal im Browser-Worker, wird mit deinem Identitaetsschluessel signiert
                    und nach Serverpruefung im Trust Passport gespeichert.
                  </p>
                  <div className="security-passport-proof-list">
                    <div><strong>Status</strong><span>{humanProof ? 'Verifiziert' : 'Nicht verifiziert'}</span></div>
                    <div><strong>Algorithmus</strong><span>SHA-256 chained proof-of-work</span></div>
                    <div><strong>Signatur</strong><span>Ed25519 Identity Key</span></div>
                    <div><strong>Scope</strong><span>Node-gespeicherter Gaia Passport</span></div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowHumanProofDialog(true)}
                    disabled={!activeIdentity || !derivedKeys}
                  >
                    {humanProof ? 'Human Proof erneuern' : 'Ich bin ein Mensch verifizieren'}
                  </button>
                </section>
              </div>
            </div>
          )}

          {/* TAB 3: NODE OPERATOR DASHBOARD */}
          {activeTab === 'node_operator' && nodeOperatorError && !nodeSummary && (
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--warning)' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--warning)' }}>{t('sc_node_security_data_unavailable') || 'Node-Sicherheitsdaten nicht verfügbar'}</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{nodeOperatorError}</p>
            </div>
          )}

          {activeTab === 'node_operator' && isOperator && nodeSummary && (
            <div className="security-node-tab" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="node-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div className="nhd-metric-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                  <span>{t('sc_total_events') || 'Ereignisse Gesamt'}</span>
                  <strong>{nodeSummary.totalEvents}</strong>
                </div>
                <div className="nhd-metric-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                  <span>{t('sc_login_attacks') || 'Login Angriffe'}</span>
                  <strong>{nodeSummary.authAttackCount}</strong>
                </div>
                <div className="nhd-metric-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                  <span>{t('sc_rate_limits_active') || 'Rate Limits aktiv'}</span>
                  <strong>{nodeSummary.rateLimitedRequests}</strong>
                </div>
                <div className="nhd-metric-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                  <span>{t('sc_smtp_shield_hits') || 'SMTP Shield Treffer'}</span>
                  <strong>{nodeSummary.smtpShieldEvents}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>{t('sc_top_event_categories') || 'Top Ereigniskategorien'}</h4>
                  {Object.keys(nodeSummary.topEventCategories).length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>{t('sc_no_entries') || 'Keine Einträge.'}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(nodeSummary.topEventCategories).map(([cat, cnt]) => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.85rem' }}>{cat}</span>
                          <strong>{cnt}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>{t('sc_node_audit_log') || 'Node-Audit-Protokoll (Letzte Events)'}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                    {nodeEvents.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)' }}>{t('sc_no_node_events') || 'Keine Node-Events.'}</p>
                    ) : (
                      nodeEvents.map(e => (
                        <div key={e.event_id} style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ color: 'var(--accent-cyan)' }}>{e.category}</strong>
                            <span style={{ color: 'var(--text-secondary)' }}>{new Date(e.created_at).toLocaleTimeString()}</span>
                          </div>
                          <span>{e.summary}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'node_system' && isOperator && (
            <div className="security-node-system-tab" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section className="glass-panel" style={{ padding: '22px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <span className="auth-kicker">GaiaCom Federation Registry</span>
                    <h3 style={{ margin: '6px 0 8px 0' }}>Nodesystem</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '760px' }}>
                      Dieser Node kann seine S2S-Secrets erzeugen, den Registry-Mainnode pingen und verbundene Nodes anhand von Public Key, Core-Hash und Status verwalten.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn-secondary compact-btn" onClick={handleGenerateNodeSecrets}>
                      Secrets generieren
                    </button>
                    <button type="button" className="btn-primary compact-btn" onClick={handlePingMainNode}>
                      Main-Node pingen
                    </button>
                  </div>
                </div>
              </section>

              {nodeRegistryError && (
                <section className="glass-panel" style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--warning)' }}>
                  <strong style={{ color: 'var(--warning)' }}>Registry Hinweis</strong>
                  <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)' }}>{nodeRegistryError}</p>
                </section>
              )}

              {nodeRegistry && (
                <section className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
                  <div className="node-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    <div className="nhd-metric-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span>Server</span>
                      <strong style={{ fontSize: '1rem' }}>{nodeRegistry.serverName}</strong>
                    </div>
                    <div className="nhd-metric-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span>Authority</span>
                      <strong style={{ color: nodeRegistry.isRegistryAuthority ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {nodeRegistry.isRegistryAuthority ? 'Aktiv' : 'Remote'}
                      </strong>
                    </div>
                    <div className="nhd-metric-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span>Core Hash</span>
                      <strong style={{ fontSize: '0.76rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{nodeRegistry.coreHash}</strong>
                    </div>
                    <div className="nhd-metric-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span>Accepted Nodes</span>
                      <strong>{nodeRegistry.acceptedNodes?.length || 0}</strong>
                    </div>
                  </div>

                  <div className="events-list gaia-scrollbar" style={{ overflowX: 'auto' }}>
                    <table className="gaia-table security-events-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '12px' }}>Node</th>
                          <th style={{ padding: '12px' }}>Status</th>
                          <th style={{ padding: '12px' }}>Version</th>
                          <th style={{ padding: '12px' }}>Core Hash</th>
                          <th style={{ padding: '12px' }}>Ping</th>
                          <th style={{ padding: '12px' }}>Aktion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(nodeRegistry.registry || []).length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              Noch keine externen Nodes in der Registry.
                            </td>
                          </tr>
                        ) : (
                          (nodeRegistry.registry || []).map((entry) => (
                            <tr key={entry.domain} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px' }}>
                                <strong>{entry.domain}</strong>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{entry.operatorGaiaId || 'Operator nicht angegeben'}</div>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span className={`severity-badge ${entry.status === 'accepted' ? 'low' : entry.status === 'blocked' ? 'high' : 'medium'}`}>
                                  {entry.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{entry.nodeVersion || 'unknown'}</td>
                              <td style={{ padding: '12px', maxWidth: '260px', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                {entry.coreHash}
                                {entry.coreHash && entry.coreHash !== nodeRegistry.coreHash && (
                                  <div style={{ color: 'var(--warning)', marginTop: '4px' }}>Update/Fork abweichend</div>
                                )}
                              </td>
                              <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                {entry.pingCount || 0}x<br />
                                {entry.lastSeenAt ? new Date(entry.lastSeenAt).toLocaleString() : 'nie'}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <button type="button" className="btn-secondary compact-btn" onClick={() => handleRegistryStatus(entry.domain, 'accepted')}>Annehmen</button>
                                  <button type="button" className="btn-secondary compact-btn" onClick={() => handleRegistryStatus(entry.domain, 'quarantined')}>Quarantaene</button>
                                  <button type="button" className="btn-secondary compact-btn" onClick={() => handleRegistryStatus(entry.domain, 'blocked')}>Blocken</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {nodeSecrets && (
                <section className="glass-panel" style={{ padding: '20px', borderRadius: '14px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Generierte Node-Secrets</h4>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Die Datei wurde serverseitig gespeichert. Trage die Werte als Umgebungsvariablen ein, bevor du den Node produktiv startest.
                  </p>
                  <div style={{ display: 'grid', gap: '10px', fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                    <div><strong>GAIACOM_SERVER_PRIVATE_KEY</strong><br />{nodeSecrets.serverPrivateKeyHex}</div>
                    <div><strong>GAIACOM_TRUSTMESH_EPOCH_SECRET</strong><br />{nodeSecrets.trustMeshEpochSecretHex}</div>
                    <div><strong>Public Key</strong><br />{nodeSecrets.serverPublicKeyBase64}</div>
                    <div><strong>Datei</strong><br />{nodeSecrets.savedTo}</div>
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
      <HumanProofDialog
        show={showHumanProofDialog}
        onClose={() => setShowHumanProofDialog(false)}
        activeIdentity={activeIdentity}
        derivedKeys={derivedKeys}
        profile={{
          displayName: activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.GaiaID
        }}
        triggerAlert={triggerAlert}
        onVerified={(proof, nextTrustPassport) => {
          if (proof) setHumanProof(proof);
          if (nextTrustPassport) setTrustPassport(nextTrustPassport);
          setHumanProofRefresh(value => value + 1);
          setShowHumanProofDialog(false);
        }}
      />
    </div>
  );
}
