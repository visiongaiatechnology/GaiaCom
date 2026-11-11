import React from 'react';
import Icon from '../../../ui/Icon';
import {
  UNAVAILABLE,
  formatDateTime,
  formatDate,
  parseJsonRecordDetailed
} from '../utils/abuseFormat';

const reportMetric = (reports, key) => {
  if (!reports || typeof reports !== 'object' || !(key in reports)) return UNAVAILABLE;
  const value = reports[key];
  return typeof value === 'number' ? value : UNAVAILABLE;
};

/**
 * Public transparency view. Credentials and signed snapshots are rendered only
 * from the server response; a snapshot whose data cannot be parsed is marked
 * instead of being shown with invented zeros.
 */
export default function TransparencyTab({ transparency }) {
  const credentials = Array.isArray(transparency?.credentials) ? transparency.credentials : null;
  const snapshots = Array.isArray(transparency?.snapshots) ? transparency.snapshots : null;

  return (
    <div className="vgt-abuse-stack">
      <section className="vgt-abuse-panel" aria-labelledby="vgt-transparency-credentials-title">
        <div className="vgt-abuse-panel__head">
          <Icon name="verified" size={18} />
          <h2 className="vgt-h4" id="vgt-transparency-credentials-title">Gültige Rollen-Credentials</h2>
        </div>
        {credentials === null ? (
          <p className="vgt-empty-note">{UNAVAILABLE}: Die Transparenz-Antwort enthält keine Credential-Liste.</p>
        ) : credentials.length === 0 ? (
          <p className="vgt-empty-note">Keine Credentials in der Registry.</p>
        ) : (
          <div className="vgt-table-wrap">
            <table className="vgt-table">
              <caption className="vgt-sr-only">Aktive Governance-Rollen-Credentials</caption>
              <thead>
                <tr>
                  <th scope="col">Credential-ID</th>
                  <th scope="col">Rolle</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Gültig bis</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map(credential => (
                  <tr key={credential.id}>
                    <td className="vgt-mono">{credential.id ? `${credential.id.slice(0, 10)}…` : UNAVAILABLE}</td>
                    <td><span className="vgt-status vgt-status--signed">{credential.role || UNAVAILABLE}</span></td>
                    <td className="vgt-mono">
                      {credential.subjectIdentity ? `${credential.subjectIdentity.slice(0, 14)}…` : UNAVAILABLE}
                    </td>
                    <td>{formatDate(credential.validUntil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="vgt-abuse-panel" aria-labelledby="vgt-transparency-snapshots-title">
        <div className="vgt-abuse-panel__head">
          <Icon name="fileText" size={18} />
          <h2 className="vgt-h4" id="vgt-transparency-snapshots-title">Letzte Transparenzberichte (Snapshots)</h2>
        </div>
        {snapshots === null ? (
          <p className="vgt-empty-note">{UNAVAILABLE}: Die Transparenz-Antwort enthält keine Snapshot-Liste.</p>
        ) : snapshots.length === 0 ? (
          <p className="vgt-empty-note">
            Noch keine Transparenz-Snapshots erzeugt. Node-Operatoren können Snapshots im
            Operator-Bereich erzeugen.
          </p>
        ) : (
          <ul className="vgt-abuse-snapshots">
            {snapshots.map(snapshot => {
              const parsed = parseJsonRecordDetailed(snapshot.snapshotData);
              const data = parsed.value || {};
              const invalid = parsed.invalid;
              const reports = data?.reports;
              return (
                <li className="vgt-abuse-snapshot" key={snapshot.id}>
                  <header className="vgt-abuse-snapshot__head">
                    <strong>Snapshot {snapshot.period || UNAVAILABLE}</strong>
                    <span className="vgt-caption">{formatDateTime(snapshot.timestamp)}</span>
                  </header>
                  <dl className="vgt-abuse-media">
                    <div><dt>Spam</dt><dd className="vgt-numeric">{reportMetric(reports, 'spam')}</dd></div>
                    <div><dt>Betrug</dt><dd className="vgt-numeric">{reportMetric(reports, 'phishing')}</dd></div>
                    <div><dt>Malware</dt><dd className="vgt-numeric">{reportMetric(reports, 'malware')}</dd></div>
                    <div><dt>Belästigung</dt><dd className="vgt-numeric">{reportMetric(reports, 'harassment')}</dd></div>
                  </dl>
                  {invalid ? (
                    <p className="vgt-inline-status is-error">
                      Snapshotdaten konnten nicht als JSON gelesen werden; es werden keine Zahlen angezeigt.
                    </p>
                  ) : null}
                  <p className="vgt-caption vgt-break">
                    Signatur: {snapshot.signature ? `${snapshot.signature.slice(0, 32)}…` : UNAVAILABLE}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
