import React from 'react';
import Icon from '../../ui/Icon';

function greetingForHour(hour) {
  if (hour < 5) return 'Gute Nacht';
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export default function DashboardHeader({ activeIdentity, displayGaiaID, onNewRoom, onOpenInbox, onOpenChats, t }) {
  const [copied, setCopied] = React.useState(false);

  const identityName =
    activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.name || '';
  const gaiaId = activeIdentity
    ? (displayGaiaID ? displayGaiaID(activeIdentity.GaiaID || activeIdentity.gaiaID) : (activeIdentity.GaiaID || activeIdentity.gaiaID))
    : '';

  const greeting = greetingForHour(new Date().getHours());

  const copyIdentity = React.useCallback(() => {
    if (!gaiaId || !navigator.clipboard) return;
    navigator.clipboard.writeText(gaiaId).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => setCopied(false)
    );
  }, [gaiaId]);

  return (
    <header className="vgt-dash-head">
      <div className="vgt-dash-head__copy">
        <p className="vgt-eyebrow">{t('kommandozentrale') || 'Kommandozentrale'}</p>
        <h1 className="vgt-h1">
          {greeting}
          {identityName ? <>, <span className="vgt-title-em">{identityName}</span></> : null}.
        </h1>
        <div className="vgt-dash-head__identity">
          {gaiaId ? (
            <>
              <span className="vgt-label">{t('onboarding_sec_identity_title') || 'Identität'}</span>
              <code className="vgt-id">{gaiaId}</code>
              <button type="button" className="btn-ghost vgt-dash-head__copy" onClick={copyIdentity}>
                <Icon name={copied ? 'check' : 'copy'} size={14} />
                {copied ? (t('auth_copied') || 'Kopiert') : (t('copy') || 'Kopieren')}
              </button>
            </>
          ) : (
            <span className="vgt-caption">Keine aktive Identität ausgewählt.</span>
          )}
        </div>
      </div>

      <div className="vgt-dash-head__sidebar">
        <p className="vgt-caption">Alle Kennzahlen auf dieser Seite stammen aus deiner aktuellen Sitzung.</p>
        <div className="vgt-dash-head__actions">
          <button type="button" className="btn-secondary" onClick={onOpenInbox}>
            <Icon name="inbox" size={16} />
            {t('onboarding_inbox_title') || 'Posteingang'}
          </button>
          <button type="button" className="btn-secondary" onClick={onOpenChats}>
            <Icon name="chat" size={16} />
            {t('quanten_chat') || 'Chats'}
          </button>
          <button type="button" className="btn-primary" onClick={onNewRoom}>
            <Icon name="plus" size={16} />
            {t('new_room') || 'Neuer Raum'}
          </button>
        </div>
      </div>
    </header>
  );
}
