import React, { useMemo, useState } from 'react';
import Icon from '../ui/Icon';
import StepProgress from '../common/StepProgress';
import useDialogA11y from '../common/useDialogA11y';
import { useTranslation } from '../../utils/i18n';

const SECURITY_FACTS = [
  {
    icon: 'shieldCheck',
    titleKey: 'onboarding_sec_identity_title',
    titleFallback: 'Identität',
    textKey: 'onboarding_sec_identity_desc',
    textFallback: 'Deine Gaia-ID ist dein Netzwerkanker. Kontakte können Schlüsselwechsel erkennen.'
  },
  {
    icon: 'key',
    titleKey: 'onboarding_sec_messages_title',
    titleFallback: 'Nachrichten',
    textKey: 'onboarding_sec_messages_desc',
    textFallback: 'Inhalte werden lokal entschlüsselt.'
  },
  {
    icon: 'globe',
    titleKey: 'onboarding_sec_network_title',
    titleFallback: 'Netzwerk',
    textKey: 'onboarding_sec_network_desc',
    textFallback: 'Security Center und Abuse Center machen Risiken sichtbar.'
  },
  {
    icon: 'fileText',
    titleKey: 'onboarding_sec_transparency_title',
    titleFallback: 'Transparenz',
    textKey: 'onboarding_sec_transparency_desc',
    textFallback: 'Sicherheitsrelevante Ereignisse werden protokolliert.'
  }
];

const LAUNCH_TARGETS = [
  { key: 'inbox', icon: 'inbox', titleKey: 'onboarding_inbox_title', titleFallback: 'Posteingang', textKey: 'onboarding_inbox_desc', textFallback: 'Mails lesen.' },
  { key: 'chat', icon: 'chat', titleKey: 'onboarding_contacts_title', titleFallback: 'Kontakte', textKey: 'onboarding_contacts_desc', textFallback: 'Ersten Kontakt prüfen.' },
  { key: 'channels', icon: 'radio', titleKey: 'onboarding_channels_title', titleFallback: 'Channels', textKey: 'onboarding_channels_desc', textFallback: 'Öffentliche Frequenzen entdecken.' },
  { key: 'security', icon: 'shieldCheck', titleKey: 'onboarding_security_title_card', titleFallback: 'Security Center', textKey: 'onboarding_security_desc_card', textFallback: 'GaiaShield Status ansehen.' }
];

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map(part => part[0].toUpperCase()).join('');
}

/**
 * VGT GLASS 2100 — first-run onboarding.
 *
 * Task-first 4-step sheet. Purely presentational: profile save still goes
 * through `onProfileSave`, backup consent still gates the continue button, and
 * the four destination callbacks are unchanged. No completion statistics and
 * no fake progress are rendered.
 */
export default function FirstRunOnboarding({
  activeIdentity,
  displayGaiaID,
  profileDisplayName,
  profileAvatar,
  onProfileSave,
  onComplete,
  onSkip,
  onOpenInbox,
  onOpenChat,
  onOpenChannels,
  onOpenSecurity
}) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [draftName, setDraftName] = useState(profileDisplayName || activeIdentity?.DisplayName || activeIdentity?.displayName || '');
  const [draftAvatar, setDraftAvatar] = useState(profileAvatar || '');
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  const steps = [
    { key: 'profile', label: t('onboarding_step_profile') || 'Profil' },
    { key: 'security', label: t('onboarding_step_security') || 'Schutz' },
    { key: 'backup', label: t('onboarding_step_backup') || 'Backup' },
    { key: 'launch', label: t('onboarding_step_launch') || 'Start' }
  ];

  const currentStep = steps[stepIndex];
  const identityLabel = useMemo(() => {
    if (!activeIdentity) return t('onboarding_loading_gaia_id') || 'Gaia-ID wird geladen';
    return displayGaiaID(activeIdentity.GaiaID || activeIdentity.gaiaID || '');
  }, [activeIdentity, displayGaiaID, t]);

  const canContinue = currentStep.key !== 'backup' || backupConfirmed;
  const dialogRef = useDialogA11y(true, { onClose: onSkip });

  const handleAvatarFile = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setDraftAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveProfileAndContinue = () => {
    const cleanName = draftName.trim();
    onProfileSave({
      displayName: cleanName || profileDisplayName || activeIdentity?.DisplayName || activeIdentity?.displayName || 'GaiaCom User',
      avatar: draftAvatar
    });
    setStepIndex(1);
  };

  const goNext = () => {
    if (currentStep.key === 'profile') { saveProfileAndContinue(); return; }
    if (stepIndex < steps.length - 1) { setStepIndex(stepIndex + 1); return; }
    onComplete();
  };

  const goBack = () => { if (stepIndex > 0) setStepIndex(stepIndex - 1); };

  const launchHandlers = {
    inbox: onOpenInbox,
    chat: onOpenChat,
    channels: onOpenChannels,
    security: onOpenSecurity
  };

  return (
    <div className="vgt-overlay vgt-onboarding" role="presentation">
      <section
        ref={dialogRef}
        className="vgt-dialog vgt-onboarding__shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vgt-onboarding-title"
      >
        <header className="vgt-onboarding__head">
          <div>
            <p className="vgt-eyebrow">{t('onboarding_setup_kicker') || 'GaiaCom Einrichtung'}</p>
            <h2 className="vgt-h2" id="vgt-onboarding-title">
              {currentStep.key === 'profile' && (t('onboarding_profile_title') || 'Mach GaiaCom zu deinem Raum.')}
              {currentStep.key === 'security' && (t('onboarding_security_title') || 'Was GaiaCom für dich schützt.')}
              {currentStep.key === 'backup' && (t('onboarding_backup_title') || 'Ein Backup ist dein echter Notausgang.')}
              {currentStep.key === 'launch' && (t('onboarding_launch_title') || 'Bereit. Was willst du zuerst tun?')}
            </h2>
            <p className="vgt-body vgt-body--sm">
              {currentStep.key === 'profile' && (t('onboarding_profile_desc') || 'Anzeigename und Avatar bleiben lokal steuerbar.')}
              {currentStep.key === 'security' && (t('onboarding_security_desc') || 'GaiaCom trennt Identität, Schlüssel, Nachrichten und Netzwerkstatus.')}
              {currentStep.key === 'backup' && (t('onboarding_backup_desc') || 'Ohne Wiederherstellungsdaten kann niemand deine Identität retten.')}
              {currentStep.key === 'launch' && (t('onboarding_launch_desc') || 'Du kannst direkt loslegen oder den Rundgang beenden.')}
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onSkip} aria-label={t('onboarding_later') || 'Später'}>
            <Icon name="x" size={18} />
          </button>
        </header>

        <StepProgress steps={steps} currentIndex={stepIndex} ariaLabel={t('onboarding_setup_kicker') || 'Onboarding'} />

        <div className="vgt-onboarding__body">
          {currentStep.key === 'profile' ? (
            <div className="vgt-onboarding__profile">
              <div className="vgt-onboarding__avatar">
                {draftAvatar.startsWith('data:image/') ? (
                  <img src={draftAvatar} alt="" />
                ) : (
                  <span aria-hidden="true">{initialsOf(draftName)}</span>
                )}
              </div>
              <div className="vgt-onboarding__avatar-actions">
                <label className="btn-secondary vgt-onboarding__upload">
                  <Icon name="upload" size={16} />
                  {t('upload_avatar_btn') || 'Bild hochladen'}
                  <input type="file" accept="image/*" className="vgt-sr-only" onChange={handleAvatarFile} />
                </label>
                {draftAvatar ? (
                  <button type="button" className="btn-ghost" onClick={() => setDraftAvatar('')}>
                    <Icon name="trash" size={16} />
                    Avatar entfernen
                  </button>
                ) : null}
              </div>

              <div className="vgt-onboarding__field">
                <label className="input-label" htmlFor="vgt-onboarding-name">
                  {t('onboarding_display_name') || 'Anzeigename'}
                </label>
                <input
                  id="vgt-onboarding-name"
                  type="text"
                  className="input-field"
                  value={draftName}
                  maxLength={42}
                  onChange={event => setDraftName(event.target.value)}
                  placeholder={t('onboarding_display_name_placeholder') || 'Wie soll GaiaCom dich anzeigen?'}
                />
              </div>

              <div className="vgt-onboarding__identity">
                <span className="vgt-label">{t('onboarding_loading_gaia_id') || 'Gaia-ID'}</span>
                <code className="vgt-id">{identityLabel}</code>
              </div>
            </div>
          ) : null}

          {currentStep.key === 'security' ? (
            <dl className="vgt-onboarding__facts">
              {SECURITY_FACTS.map(fact => (
                <div key={fact.titleKey}>
                  <dt>
                    <span className="vgt-onboarding__fact-icon" aria-hidden="true"><Icon name={fact.icon} size={16} /></span>
                    {t(fact.titleKey) || fact.titleFallback}
                  </dt>
                  <dd>{t(fact.textKey) || fact.textFallback}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {currentStep.key === 'backup' ? (
            <div className="vgt-onboarding__backup">
              <div className="vgt-onboarding__backup-note">
                <Icon name="alertTriangle" size={18} />
                <div>
                  <strong>{t('onboarding_backup_notice_title') || 'Wichtig'}</strong>
                  <p>{t('onboarding_backup_notice_desc') || 'Speichere deine Wiederherstellungsdaten getrennt von diesem Gerät.'}</p>
                </div>
              </div>
              <label className="vgt-consent">
                <input
                  type="checkbox"
                  checked={backupConfirmed}
                  onChange={event => setBackupConfirmed(event.target.checked)}
                />
                <span>{t('onboarding_backup_consent') || 'Ich weiß, dass mein Backup entscheidend ist.'}</span>
              </label>
            </div>
          ) : null}

          {currentStep.key === 'launch' ? (
            <ul className="vgt-onboarding__launch">
              {LAUNCH_TARGETS.map(target => (
                <li key={target.key}>
                  <button type="button" className="vgt-onboarding__action" onClick={launchHandlers[target.key]}>
                    <span className="vgt-onboarding__action-icon" aria-hidden="true"><Icon name={target.icon} size={18} /></span>
                    <span className="vgt-onboarding__action-copy">
                      <strong>{t(target.titleKey) || target.titleFallback}</strong>
                      <small>{t(target.textKey) || target.textFallback}</small>
                    </span>
                    <Icon name="chevronRight" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <footer className="vgt-onboarding__foot">
          <button type="button" className="btn-ghost" onClick={onSkip}>
            {t('onboarding_later') || 'Später'}
          </button>
          <div className="vgt-onboarding__nav">
            {stepIndex > 0 ? (
              <button type="button" className="btn-secondary" onClick={goBack}>
                <Icon name="arrowLeft" size={16} />
                {t('onboarding_back') || 'Zurück'}
              </button>
            ) : null}
            <button type="button" className="btn-primary" onClick={goNext} disabled={!canContinue}>
              {stepIndex === steps.length - 1
                ? (t('onboarding_complete_setup') || 'Setup abschließen')
                : (t('onboarding_continue') || 'Weiter')}
              <Icon name={stepIndex === steps.length - 1 ? 'check' : 'arrowRight'} size={16} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
