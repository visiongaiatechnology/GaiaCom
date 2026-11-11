import React, { useEffect, useState } from 'react';
import Icon from '../../../ui/Icon';
import * as api from '../../../../api';
import { formatTime } from '../utils/securityFormat';

/**
 * Public transparency log for node-operator break-glass directory reads.
 *
 * Every user can see when (and why) a node operator opened the paginated
 * identity directory. The log is append-only server-side; this component only
 * renders what the node actually returned and never invents entries.
 */
export default function TransparencyAccessList({ t }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [unsupported, setUnsupported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getNodeAccessLog()
      .then(response => {
        if (!active) return;
        setEvents(Array.isArray(response?.events) ? response.events : []);
        setError('');
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        const message = err?.message || 'Transparenz-Log konnte nicht geladen werden.';
        // Feature not shipped on this node yet (404) is not a user-facing error.
        setUnsupported(/404|not found|nicht gefunden/i.test(message));
        setError(message);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (unsupported) return null;

  return (
    <section className="vgt-sec-block" aria-labelledby="vgt-access-log-title">
      <h2 className="vgt-h4" id="vgt-access-log-title">
        <Icon name="eye" size={16} /> Node-Operator-Transparenz
      </h2>
      <p className="vgt-caption">
        Jeder Zugriff auf das paginierte Identitätsverzeichnis (Break-Glass) wird mit Begründung
        protokolliert und hier öffentlich für alle Nutzer dieses Nodes angezeigt.
      </p>
      {loading ? (
        <p className="vgt-empty-note" role="status">Transparenz-Log wird geladen …</p>
      ) : error ? (
        <p className="vgt-notice vgt-notice--danger" role="alert">{error}</p>
      ) : !events || events.length === 0 ? (
        <p className="vgt-empty-note">{t('sc_no_access_events') || 'Noch keine Operator-Zugriffe protokolliert.'}</p>
      ) : (
        <ul className="vgt-row-list">
          {events.map(event => (
            <li className="vgt-row" key={event.id || `${event.created_at}-${event.operator_gaia_id}`}>
              <div className="vgt-row__main">
                <strong>{event.operator_gaia_id || 'Unbekannter Operator'}</strong>
                <span className="vgt-row__meta">
                  Grund: {event.reason || 'ohne Begründung'}
                  {typeof event.result_count === 'number' ? ` · ${event.result_count} Einträge` : ''}
                </span>
              </div>
              <span className="vgt-caption vgt-numeric">
                {formatTime(event.created_at, t) || event.created_at}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
