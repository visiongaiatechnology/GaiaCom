import React from 'react';
import Icon from '../../../ui/Icon';
import TransparencyAccessList from '../ui/TransparencyAccessList';
import {
  countCategory,
  formatEpochSeconds,
  severityLabel,
  statusLabel,
  unavailable,
  categoryLabel
} from '../utils/securityFormat';

/**
 * Security posture tab. Only server-provided signals are rendered:
 * the summary status, `activeWarnings`, `gaiaShieldState`, `lastChecked`, and
 * counts derived from the loaded event list. Anything the API does not report
 * is labelled "Nicht verfügbar" rather than filled with a plausible default.
 */
export default function SecurityStatusTab({ summary, events, eventsLoaded, handleAcknowledge, t }) {
  const warnings = Array.isArray(events)
    ? events.filter(event => !event.acknowledged_at && event.severity !== 'info' && event.severity !== 'low')
    : [];

  const statusKnown = Boolean(summary && summary.status);
  const secured = summary?.status === 'secured';
  const statusName = statusKnown ? statusLabel(summary.status, t) : unavailable(t);

  const failedLogins = eventsLoaded ? countCategory(events, 'failed_login') : null;
  const blockedReplays = eventsLoaded ? countCategory(events, 'message_replay') : null;
  const openWarnings = typeof summary?.activeWarnings === 'number' ? summary.activeWarnings : null;
  const shieldState = summary?.gaiaShieldState || null;
  const tamperChecks = typeof summary?.tamperChecks === 'number' ? summary.tamperChecks : null;

  return (
    <div className="vgt-sec-stack">
      <section
        className={`vgt-sec-hero ${secured ? 'is-ok' : statusKnown ? 'is-warn' : 'is-idle'}`.trim()}
        aria-labelledby="vgt-sec-hero-title"
      >
        <span className="vgt-sec-hero__mark" aria-hidden="true">
          <Icon name={secured ? 'shieldCheck' : statusKnown ? 'shieldAlert' : 'help'} size={26} />
        </span>
        <div>
          <h2 className="vgt-h3" id="vgt-sec-hero-title">
            Schutzstatus: {statusName}
          </h2>
          {statusKnown ? (
            <p className="vgt-body vgt-body--sm">
              {secured
                ? (t('sc_desc_secured') || 'Es liegen keine offenen kritischen Sicherheitswarnungen vor.')
                : openWarnings === null
                  ? (t('sc_desc_warning') || 'Es gibt offene Sicherheitsereignisse. Die genaue Anzahl wurde vom Server nicht geliefert.')
                  : `${t('sc_desc_warning') || 'Es gibt offene Sicherheitsereignisse, die deine Aufmerksamkeit erfordern.'} (${openWarnings})`}
            </p>
          ) : (
            <p className="vgt-body vgt-body--sm">
              Der Server hat keinen Status gemeldet. Es wird bewusst kein Ersatzwert angezeigt.
            </p>
          )}
        </div>
      </section>

      <dl className="vgt-sec-metrics">
        <div className="vgt-sec-metric">
          <dt>GaiaShield Status</dt>
          <dd>{shieldState ? shieldState.toUpperCase() : unavailable(t)}</dd>
          <p className="vgt-caption">Direkt vom Sicherheits-Endpunkt gemeldeter Schutzschicht-Status.</p>
        </div>
        <div className="vgt-sec-metric">
          <dt>{t('sc_failed_logins') || 'Fehlgeschlagene Logins'}</dt>
          <dd className="vgt-numeric">{failedLogins === null ? unavailable(t) : failedLogins}</dd>
          <p className="vgt-caption">Abgeleitet aus dem geladenen Sicherheitsprotokoll dieses Kontos.</p>
        </div>
        <div className="vgt-sec-metric">
          <dt>{t('sc_blocked_replays') || 'Blockierte Replays'}</dt>
          <dd className="vgt-numeric">{blockedReplays === null ? unavailable(t) : blockedReplays}</dd>
          <p className="vgt-caption">Abgeleitet aus Ereignissen der Kategorie Nachrichten-Replay.</p>
        </div>
        <div className="vgt-sec-metric">
          <dt>{t('sc_last_check') || 'Letzte Prüfung'}</dt>
          <dd>{formatEpochSeconds(summary?.lastChecked, t)}</dd>
          <p className="vgt-caption">Zeitpunkt der letzten serverseitigen Sicherheitsauswertung.</p>
        </div>
        <div className="vgt-sec-metric">
          <dt>{t('sc_open_warnings') || 'Offene Warnungen'}</dt>
          <dd className="vgt-numeric">{openWarnings === null ? unavailable(t) : openWarnings}</dd>
          <p className="vgt-caption">Nicht bestätigte Ereignisse ab Schweregrad Mittel.</p>
        </div>
        <div className="vgt-sec-metric">
          <dt>{t('sc_tamper_checks') || 'Erkannte Manipulationsversuche'}</dt>
          <dd className="vgt-numeric">{tamperChecks === null ? unavailable(t) : tamperChecks}</dd>
          <p className="vgt-caption">
            Serverzähler über die Kategorien Nachrichten-Replay und Richtlinien-Hinweis dieses Kontos.
          </p>
        </div>
      </dl>

      <section className="vgt-sec-explainer" aria-labelledby="vgt-sec-explainer-title">
        <div>
          <span className="vgt-eyebrow">GaiaShield</span>
          <h2 className="vgt-h4" id="vgt-sec-explainer-title">
            {t('sc_explainer_title') || 'Was wird hier geschützt?'}
          </h2>
          <p className="vgt-body vgt-body--sm">
            {t('sc_explainer_desc') ||
              'GaiaShield ist die Schutzschicht zwischen Konto, Nachrichten und Netzwerk. Sie prüft Login-Anomalien, Integritätsmerkmale von Umschlägen sowie Federation- und Rate-Limit-Risiken.'}
          </p>
        </div>
        <dl className="vgt-sec-explainer__grid">
          <div>
            <dt>{t('onboarding_sec_identity_title') || 'Identität'}</dt>
            <dd>{t('sc_explainer_identity_desc') || 'Prüft Login-Anomalien, Session-Risiken und Zugriffe auf fremde Identitäten.'}</dd>
          </div>
          <div>
            <dt>{t('onboarding_sec_messages_title') || 'Nachrichten'}</dt>
            <dd>{t('sc_explainer_messages_desc') || 'Erkennt Replay-Muster, manipulierte Umschläge und fehlende Integritätsmerkmale.'}</dd>
          </div>
          <div>
            <dt>{t('onboarding_sec_network_title') || 'Netzwerk'}</dt>
            <dd>{t('sc_explainer_network_desc') || 'Markiert Federation-, Rate-Limit- und SMTP-Risiken, bevor Vertrauen falsch angezeigt wird.'}</dd>
          </div>
          <div>
            <dt>{t('onboarding_sec_transparency_title') || 'Transparenz'}</dt>
            <dd>{t('onboarding_sec_transparency_desc') || 'Schreibt sicherheitsrelevante Ereignisse ins Protokoll, damit Warnungen nachvollziehbar bleiben.'}</dd>
          </div>
        </dl>
      </section>

      {warnings.length > 0 ? (
        <section className="vgt-sec-warnings" aria-labelledby="vgt-sec-warnings-title">
          <h2 className="vgt-h4" id="vgt-sec-warnings-title">
            {t('sc_open_security_warnings') || 'Offene Sicherheitswarnungen'} ({warnings.length})
          </h2>
          <ul className="vgt-row-list">
            {warnings.map(event => (
              <li className="vgt-row" key={event.event_id}>
                <div className="vgt-row__main">
                  <strong>{severityLabel(event.severity, t)} · {categoryLabel(event.category, t)}</strong>
                  <span className="vgt-row__meta">{event.summary || 'Ohne Beschreibung gemeldet.'}</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => handleAcknowledge(event.event_id)}>
                  {t('sc_btn_acknowledge') || 'Bestätigen'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <TransparencyAccessList t={t} />
    </div>
  );
}
