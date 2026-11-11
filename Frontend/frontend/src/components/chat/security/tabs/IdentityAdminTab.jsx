import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../../../ui/Icon';
import * as api from '../../../../api';
import { ATTESTATION_TYPES } from '../../../../utils/attestations';
import TransparencyAccessList from '../ui/TransparencyAccessList';

const AUTHORITY_BY_TYPE = {
  human: 'node',
  organization: 'node',
  moderator: 'governance',
  node_operator: 'governance',
  official: 'governance'
};

const EVIDENCE_HINT = {
  human: 'Prüfprotokoll / Referenz der persönlichen Prüfung (keine Ausweiskopie)',
  organization: 'DNS-TXT-Hash, Handelsregister-ID oder Governance-Beschluss',
  moderator: 'Governance-Beschluss-ID / Rolle',
  node_operator: 'Governance-Beschluss-ID',
  official: 'Governance-Beschluss-ID'
};

const METRIC_FIELDS = [
  { key: 'accounts', label: 'Konten' },
  { key: 'identities', label: 'Identitäten' },
  { key: 'rooms', label: 'Räume' },
  { key: 'messages_24h', label: 'Nachrichten (24 h)' },
  { key: 'gaiadrops_24h', label: 'GaiaDrops (24 h)' },
  { key: 'open_abuse_cases', label: 'Offene Abuse-Cases' },
  { key: 'active_attestations', label: 'Aktive Abzeichen' },
  { key: 'directory_reads_24h', label: 'Verzeichnis-Zugriffe (24 h)' }
];

function metricValue(field, stats, statsError) {
  if (statsError) return '—';
  const value = stats?.[field.key];
  return typeof value === 'number' ? String(value) : '—';
}

/**
 * Node-operator console: business metrics (no personal data), issuing and
 * revoking signed attestations, and the break-glass identity directory with a
 * mandatory, logged reason.
 *
 * The component is read-only for non-operators: every write path is gated by
 * the server role check, this UI only hides the controls.
 */
export default function IdentityAdminTab({ isOperator, t, triggerAlert }) {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [issued, setIssued] = useState([]);
  const [issuedError, setIssuedError] = useState('');
  const [form, setForm] = useState({ subject: '', type: 'human', evidence_ref: '', expires_in_days: 180 });
  const [busy, setBusy] = useState(false);
  const [revokeId, setRevokeId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [directoryReason, setDirectoryReason] = useState('');
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [directory, setDirectory] = useState(null);
  const [directoryError, setDirectoryError] = useState('');
  const [directoryBusy, setDirectoryBusy] = useState(false);

  const loadStats = useCallback(() => {
    api.getNodeOperatorStats()
      .then(data => { setStats(data || null); setStatsError(''); })
      .catch(err => setStatsError(err?.message || 'Kennzahlen nicht verfügbar.'));
  }, []);

  const loadIssued = useCallback(() => {
    api.listIssuedAttestations({ status: 'all', limit: 50 })
      .then(data => {
        setIssued(Array.isArray(data?.attestations) ? data.attestations : []);
        setIssuedError('');
      })
      .catch(err => setIssuedError(err?.message || 'Ausgestellte Attestierungen nicht verfügbar.'));
  }, []);

  useEffect(() => {
    if (!isOperator) return;
    loadStats();
    loadIssued();
  }, [isOperator, loadStats, loadIssued]);

  if (!isOperator) {
    return (
      <p className="vgt-empty-note">
        Identitätsverwaltung und Break-Glass-Verzeichnis sind nur mit einer aktiven
        Node-Operator-Rolle verfügbar.
      </p>
    );
  }

  const authority = AUTHORITY_BY_TYPE[form.type] || 'node';
  const evidenceHint = EVIDENCE_HINT[form.type] || 'Referenz der Prüfung';

  const issue = async event => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.issueAttestation({
        subject: form.subject.trim(),
        type: form.type,
        authority,
        evidence_ref: form.evidence_ref.trim(),
        expires_in_days: Number(form.expires_in_days) || 180
      });
      const created = response?.attestation || response;
      triggerAlert?.(
        'Abzeichen ausgestellt',
        `Signierte Attestierung für ${created?.subject_gaia_id || form.subject} erstellt (Aussteller: dieser Node).`,
        'success'
      );
      setForm(prev => ({ ...prev, subject: '', evidence_ref: '' }));
      loadIssued();
      loadStats();
    } catch (err) {
      triggerAlert?.('Ausstellung fehlgeschlagen', err?.message || 'Attestierung konnte nicht ausgestellt werden.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    if (!revokeReason.trim()) return;
    setBusy(true);
    try {
      await api.revokeAttestation(id, revokeReason.trim());
      triggerAlert?.('Abzeichen widerrufen', 'Die Attestierung wurde widerrufen; Clients prüfen den Status erneut.', 'warning');
      setRevokeId('');
      setRevokeReason('');
      loadIssued();
      loadStats();
    } catch (err) {
      triggerAlert?.('Widerruf fehlgeschlagen', err?.message || 'Attestierung konnte nicht widerrufen werden.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const openDirectory = async (event) => {
    event.preventDefault();
    if (directoryReason.trim().length < 20) return;
    setDirectoryBusy(true);
    setDirectoryError('');
    try {
      const response = await api.lookupNodeIdentities({
        reason: directoryReason.trim(),
        query: directoryQuery.trim(),
        limit: 25
      });
      setDirectory(response);
      setDirectoryReason('');
    } catch (err) {
      setDirectoryError(err?.message || 'Verzeichnis konnte nicht geöffnet werden.');
    } finally {
      setDirectoryBusy(false);
    }
  };

  const renderIssuedAction = (item) => {
    if (item.status !== 'valid') {
      return <span className="vgt-caption">{item.revoked_at ? 'widerrufen' : item.status}</span>;
    }
    if (revokeId === item.id) {
      return (
        <div className="vgt-admin-revoke">
          <input
            className="input-field"
            type="text"
            placeholder="Widerrufsgrund"
            value={revokeReason}
            onChange={event => setRevokeReason(event.target.value)}
            aria-label="Widerrufsgrund"
          />
          <button
            type="button"
            className="btn-danger"
            disabled={busy || !revokeReason.trim()}
            onClick={() => revoke(item.id)}
          >
            Widerrufen
          </button>
          <button type="button" className="btn-ghost" onClick={() => { setRevokeId(''); setRevokeReason(''); }}>
            Abbrechen
          </button>
        </div>
      );
    }
    return (
      <button type="button" className="btn-ghost" onClick={() => setRevokeId(item.id)}>
        Widerrufen
      </button>
    );
  };

  let issuedBody = null;
  if (issuedError) {
    issuedBody = <p className="vgt-notice vgt-notice--danger" role="alert">{issuedError}</p>;
  } else if (issued.length === 0) {
    issuedBody = <p className="vgt-empty-note">Noch keine Attestierungen von diesem Node ausgestellt.</p>;
  } else {
    issuedBody = (
      <ul className="vgt-row-list vgt-admin-issued">
        {issued.map(item => (
          <li className="vgt-row" key={item.id}>
            <div className="vgt-row__main">
              <strong>{item.subject_gaia_id}</strong>
              <span className="vgt-row__meta">
                {ATTESTATION_TYPES[item.type]?.label || item.type} · {item.status}
                {item.expires_at ? ` · bis ${String(item.expires_at).slice(0, 10)}` : ''}
              </span>
              <span className="vgt-row__meta">Evidenz: {item.evidence_ref}</span>
            </div>
            {renderIssuedAction(item)}
          </li>
        ))}
      </ul>
    );
  }

  let directoryBody = null;
  if (directory) {
    const entries = Array.isArray(directory.entries) ? directory.entries : [];
    if (entries.length === 0) {
      directoryBody = <p className="vgt-empty-note">Keine Einträge für diese Suche.</p>;
    } else {
      directoryBody = (
        <ul className="vgt-row-list vgt-admin-directory">
          {entries.map(entry => (
            <li className="vgt-row" key={entry.gaia_id}>
              <div className="vgt-row__main">
                <strong>{entry.display_name || '—'}</strong>
                <span className="vgt-row__meta vgt-mono">{entry.gaia_id}</span>
              </div>
              <span className="vgt-caption">
                {entry.created_at ? String(entry.created_at).slice(0, 10) : '—'} · {entry.status || 'aktiv'}
              </span>
            </li>
          ))}
        </ul>
      );
    }
  }

  return (
    <div className="vgt-sec-stack">
      <div className="vgt-admin-note" role="note">
        <Icon name="shieldCheck" size={16} />
        <p>
          Alle Aktionen dieser Ansicht werden protokolliert. Abzeichen sind signierte Aussagen
          dieses Nodes mit Aussteller, Evidenz-Referenz, Ablauf und Widerruf — kein globaler
          „verifiziert"-Status.
        </p>
      </div>

      <dl className="vgt-sec-metrics">
        {METRIC_FIELDS.map(field => (
          <div className="vgt-sec-metric" key={field.key}>
            <dt>{field.label}</dt>
            <dd className="vgt-numeric">
              {metricValue(field, stats, statsError)}
            </dd>
          </div>
        ))}
      </dl>
      {statsError ? <p className="vgt-notice vgt-notice--danger" role="alert">{statsError}</p> : null}

      <div className="vgt-sec-grid-2">
        <section className="vgt-sec-block" aria-labelledby="vgt-attest-issue-title">
          <h2 className="vgt-h4" id="vgt-attest-issue-title">Verifizierungs-Abzeichen ausstellen</h2>
          <form className="vgt-admin-form" onSubmit={issue}>
            <label className="input-label" htmlFor="vgt-attest-subject">Subject-GaiaID</label>
            <input
              id="vgt-attest-subject"
              className="input-field"
              type="text"
              placeholder="@name:domain"
              value={form.subject}
              onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))}
              required
            />
            <label className="input-label" htmlFor="vgt-attest-type">Typ</label>
            <select
              id="vgt-attest-type"
              className="input-field"
              value={form.type}
              onChange={event => setForm(prev => ({ ...prev, type: event.target.value }))}
            >
              {Object.entries(ATTESTATION_TYPES).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
            <p className="vgt-admin-field-note">
              {ATTESTATION_TYPES[form.type]?.description || ''} Autorität: <code>{authority}</code>
            </p>
            <label className="input-label" htmlFor="vgt-attest-evidence">Evidenz-Referenz</label>
            <input
              id="vgt-attest-evidence"
              className="input-field"
              type="text"
              placeholder={evidenceHint}
              value={form.evidence_ref}
              onChange={event => setForm(prev => ({ ...prev, evidence_ref: event.target.value }))}
              required
            />
            <label className="input-label" htmlFor="vgt-attest-expiry">Gültigkeit (Tage)</label>
            <input
              id="vgt-attest-expiry"
              className="input-field"
              type="number"
              min="1"
              max="3650"
              value={form.expires_in_days}
              onChange={event => setForm(prev => ({ ...prev, expires_in_days: event.target.value }))}
            />
            <p className="vgt-caption">
              Es werden nur Evidenz-Referenzen gespeichert, keine Dokumente. Die Attestierung wird
              mit dem Node-Schlüssel Ed25519 signiert.
            </p>
            <button type="submit" className="btn-primary" disabled={busy || !form.subject.trim() || !form.evidence_ref.trim()}>
              <Icon name="seal" size={16} />
              Abzeichen signieren &amp; ausstellen
            </button>
          </form>
        </section>

        <section className="vgt-sec-block" aria-labelledby="vgt-attest-issued-title">
          <h2 className="vgt-h4" id="vgt-attest-issued-title">Ausgestellte Attestierungen</h2>
          {issuedBody}
        </section>
      </div>

      <section className="vgt-sec-block" aria-labelledby="vgt-directory-title">
        <h2 className="vgt-h4" id="vgt-directory-title">
          <Icon name="users" size={16} /> Break-Glass: Identitätsverzeichnis
        </h2>
        <div className="vgt-notice vgt-notice--warning" role="note">
          <div>
            <strong>Nur im konkreten Fall verwenden.</strong>
            <p className="vgt-body vgt-body--sm">
              Der Zugriff wird mit deiner Operator-GaiaID, deiner Begründung und der Anzahl der
              Einträge protokolliert und im Transparenz-Log öffentlich angezeigt. Angezeigt werden
              nur GaiaID, Anzeigename, Registrierungsdatum und Status — keine Schlüssel, keine
              Nachrichteninhalte.
            </p>
          </div>
        </div>
        <form className="vgt-admin-form" onSubmit={openDirectory}>
          <label className="input-label" htmlFor="vgt-directory-reason">Begründung (Pflicht, mind. 20 Zeichen)</label>
          <textarea
            id="vgt-directory-reason"
            className="input-field"
            rows={2}
            minLength={20}
            value={directoryReason}
            onChange={event => setDirectoryReason(event.target.value)}
            placeholder="z. B. Abuse-Case-ID 1234: Identität zur Fallbearbeitung prüfen"
            required
          />
          <label className="input-label" htmlFor="vgt-directory-query">Suche (optional: GaiaID oder Name)</label>
          <input
            id="vgt-directory-query"
            className="input-field"
            type="text"
            value={directoryQuery}
            onChange={event => setDirectoryQuery(event.target.value)}
          />
          <button
            type="submit"
            className="btn-secondary"
            disabled={directoryBusy || directoryReason.trim().length < 20}
          >
            <Icon name="unlock" size={16} />
            {directoryBusy ? 'Wird protokolliert …' : 'Verzeichnis öffnen (protokolliert)'}
          </button>
        </form>
        {directoryError ? <p className="vgt-notice vgt-notice--danger" role="alert">{directoryError}</p> : null}
        {directoryBody}
      </section>

      <TransparencyAccessList t={t} />
    </div>
  );
}
