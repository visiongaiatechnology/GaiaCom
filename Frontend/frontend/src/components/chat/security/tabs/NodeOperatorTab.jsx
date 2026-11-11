import React from 'react';
import Icon from '../../../ui/Icon';
import { UNAVAILABLE, categoryLabel, formatTime, unavailable } from '../utils/securityFormat';

/**
 * Node operator security overview. Values come straight from
 * `getNodeSecuritySummary` / `getNodeSecurityEvents`; missing fields are shown
 * as unavailable instead of being defaulted to zero.
 */
export default function NodeOperatorTab({ nodeSummary, nodeEvents, nodeOperatorError, isOperator, t }) {
  if (nodeOperatorError && !nodeSummary) {
    return (
      <section className="vgt-sec-unavailable" aria-labelledby="vgt-node-unavailable-title">
        <span className="vgt-sec-unavailable__mark" aria-hidden="true">
          <Icon name="server" size={24} />
        </span>
        <h2 className="vgt-h4" id="vgt-node-unavailable-title">
          {t('sc_node_security_data_unavailable') || 'Node-Sicherheitsdaten nicht verfügbar'}
        </h2>
        <p className="vgt-body vgt-body--sm">{nodeOperatorError}</p>
        <p className="vgt-caption">
          Es werden bewusst keine Ersatzwerte angezeigt. Die Ansicht füllt sich, sobald der Node
          Sicherheitsdaten für dieses Konto liefert.
        </p>
      </section>
    );
  }

  if (!isOperator || !nodeSummary) {
    return (
      <p className="vgt-empty-note">
        Node-Sicherheitsdaten sind nur mit einer aktiven Node-Operator-Rolle verfügbar.
      </p>
    );
  }

  const metrics = [
    { key: 'totalEvents', label: t('sc_total_events') || 'Ereignisse gesamt' },
    { key: 'authAttackCount', label: t('sc_login_attacks') || 'Login-Angriffe' },
    { key: 'rateLimitedRequests', label: t('sc_rate_limits_active') || 'Rate Limits aktiv' },
    { key: 'smtpShieldEvents', label: t('sc_smtp_shield_hits') || 'SMTP-Shield-Treffer' }
  ];

  const categories = nodeSummary.topEventCategories && typeof nodeSummary.topEventCategories === 'object'
    ? Object.entries(nodeSummary.topEventCategories)
    : [];

  return (
    <div className="vgt-sec-stack">
      <dl className="vgt-sec-metrics">
        {metrics.map(metric => {
          const value = nodeSummary[metric.key];
          return (
            <div className="vgt-sec-metric" key={metric.key}>
              <dt>{metric.label}</dt>
              <dd className="vgt-numeric">
                {typeof value === 'number' ? value : unavailable(t)}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="vgt-sec-grid-2">
        <section className="vgt-sec-block" aria-labelledby="vgt-node-categories-title">
          <h2 className="vgt-h4" id="vgt-node-categories-title">
            {t('sc_top_event_categories') || 'Top-Ereigniskategorien'}
          </h2>
          {categories.length === 0 ? (
            <p className="vgt-empty-note">Keine Ereigniskategorien gemeldet.</p>
          ) : (
            <ul className="vgt-row-list">
              {categories.map(([category, count]) => (
                <li className="vgt-row" key={category}>
                  <div className="vgt-row__main">
                    <strong>{categoryLabel(category, t)}</strong>
                  </div>
                  <span className="vgt-numeric">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="vgt-sec-block" aria-labelledby="vgt-node-events-title">
          <h2 className="vgt-h4" id="vgt-node-events-title">
            {t('sc_node_audit_log') || 'Node-Audit-Protokoll (letzte Ereignisse)'}
          </h2>
          {!Array.isArray(nodeEvents) || nodeEvents.length === 0 ? (
            <p className="vgt-empty-note">{t('sc_no_node_events') || 'Keine Node-Ereignisse.'}</p>
          ) : (
            <ul className="vgt-row-list">
              {nodeEvents.map(event => (
                <li className="vgt-row" key={event.event_id}>
                  <div className="vgt-row__main">
                    <strong>{categoryLabel(event.category, t)}</strong>
                    <span className="vgt-row__meta">{event.summary || 'Ohne Beschreibung protokolliert.'}</span>
                  </div>
                  <span className="vgt-caption vgt-numeric">
                    {formatTime(event.created_at, t)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
