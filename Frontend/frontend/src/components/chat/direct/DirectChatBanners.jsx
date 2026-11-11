import React from 'react';
import Icon from '../../ui/Icon';

/**
 * Persistent, factual trust notices above the message stream. They only render
 * for real conditions (key history changed, GaiaShield anomaly events, peer
 * blocked) — never as decorative security theatre.
 */
export default function DirectChatBanners({
  hasKeyRotation,
  recentSecurityAlerts,
  isBlocked,
  onOpenProfile,
  onDismissKeyRotation,
  t
}) {
  if (!hasKeyRotation && recentSecurityAlerts.length === 0 && !isBlocked) return null;

  return (
    <div className="vgt-chat-banners">
      {hasKeyRotation ? (
        <section className="vgt-chat-banner vgt-chat-banner--warning" role="note" aria-label="Schlüsselwechsel erkannt">
          <Icon name="shieldAlert" size={18} className="vgt-chat-banner__icon" />
          <div className="vgt-chat-banner__copy">
            <strong>Schlüsselwechsel erkannt.</strong>
            <span>
              Dieser Kontakt hat mehr als einen bekannten Identitätsschlüssel. Vergleiche den Fingerprint,
              bevor du weiteres Vertrauen aufbaust.
            </span>
          </div>
          <div className="vgt-chat-banner__actions">
            <button type="button" className="btn-action" onClick={onOpenProfile}>
              Fingerprint prüfen
            </button>
            <button type="button" className="btn-ghost" onClick={onDismissKeyRotation}>
              Ausblenden
            </button>
          </div>
        </section>
      ) : null}

      {recentSecurityAlerts.length > 0 ? (
        <section className="vgt-chat-banner vgt-chat-banner--danger" role="alert" aria-label="Blockierte Nachrichtenanomalien">
          <Icon name="shieldAlert" size={18} className="vgt-chat-banner__icon" />
          <div className="vgt-chat-banner__copy">
            <strong>GaiaShield hat Nachrichtenanomalien blockiert.</strong>
            <ul className="vgt-chat-banner__list">
              {recentSecurityAlerts.map(event => (
                <li key={event.event_id}>{event.summary || event.category}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {isBlocked ? (
        <section className="vgt-chat-banner vgt-chat-banner--danger" role="status" aria-label="Kontakt blockiert">
          <Icon name="shieldOff" size={18} className="vgt-chat-banner__icon" />
          <div className="vgt-chat-banner__copy">
            <strong>Kontakt blockiert.</strong>
            <span>Du kannst derzeit keine Nachrichten senden oder empfangen.</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
