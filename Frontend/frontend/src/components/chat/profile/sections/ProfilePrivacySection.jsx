import React from 'react';
import ProfileSection from '../ui/ProfileSection';
import ToggleRow from '../ui/ToggleRow';

export default function ProfilePrivacySection({
  user,
  privacyBusy,
  privacyError,
  submitAnonymousStatsPreference,
  t
}) {
  const statsEnabled = user?.allowAnonymousStats !== false;

  return (
    <ProfileSection
      eyebrow="Datenschutz"
      title="Privatsphäre"
      description="GaiaCom trägt nur anonyme Aggregat-Zähler zum öffentlichen Network-Health-Dashboard bei. GaiaIDs, Raumnamen, Themen, Online-Aktivität, Beziehungen und Nachrichtenzahlen pro Person werden nie veröffentlicht."
    >
      <div className="vgt-profile-stack">
        <ToggleRow
          id="vgt-privacy-anonymous-stats"
          label="Anonyme Netzwerkstatistiken"
          description="Zählt dieses Konto in anonymen Summen wie Accounts, Identitäten, Räume, Nachrichten in 24 h und GaiaDrops in 24 h."
          checked={statsEnabled}
          disabled={privacyBusy}
          onChange={event => submitAnonymousStatsPreference(event.target.checked)}
        />

        <dl className="vgt-proof-grid">
          <div>
            <dt>Erlaubt</dt>
            <dd>Aggregat-Zähler, Versionsverteilung, Node-Uptime, Federation-Health.</dd>
          </div>
          <div>
            <dt>Ausgeschlossen</dt>
            <dd>GaiaIDs, Raumnamen, Themen, Online-Zeitstempel, soziale Graphdaten, Aktivität pro Person.</dd>
          </div>
          <div>
            <dt>Standard</dt>
            <dd>Bei der Registrierung aktiv, damit das Netzwerk öffentliche Lebendigkeit ohne Profilbildung zeigt.</dd>
          </div>
          <div>
            <dt>Kontrolle</dt>
            <dd>Du kannst hier jederzeit widersprechen.</dd>
          </div>
        </dl>

        {privacyError ? <p className="vgt-inline-status is-error" role="alert">{privacyError}</p> : null}
        {privacyBusy ? <p className="vgt-caption" role="status">Präferenz wird gespeichert …</p> : null}
      </div>
    </ProfileSection>
  );
}
