// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../utils/i18n';

const avatarChoices = ['🤖', '🛡️', '⚡', '🌐', '💎', '🚀'];

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
  const [draftAvatar, setDraftAvatar] = useState(profileAvatar || '🤖');
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

  return (
    <div className="first-run-overlay" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
      <section className="first-run-shell">
        <div className="first-run-progress" aria-label={t('onboarding_setup_kicker') || 'Onboarding'}>
          {steps.map((step, index) => (
            <button key={step.key} type="button"
              className={`first-run-step ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
              onClick={() => { if (index <= stepIndex) setStepIndex(index); }}>
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </button>
          ))}
        </div>
        <div className="first-run-content">
          <header className="first-run-header">
            <span className="first-run-kicker">{t('onboarding_setup_kicker') || 'GaiaCom Initial Setup'}</span>
            <h2 id="first-run-title">
              {currentStep.key === 'profile' && (t('onboarding_profile_title') || 'Mach GaiaCom zu deinem Raum.')}
              {currentStep.key === 'security' && (t('onboarding_security_title') || 'Was GaiaCom gerade für dich schützt.')}
              {currentStep.key === 'backup' && (t('onboarding_backup_title') || 'Ein Backup ist dein echter Notausgang.')}
              {currentStep.key === 'launch' && (t('onboarding_launch_title') || 'Bereit. Was willst du zuerst tun?')}
            </h2>
            <p>
              {currentStep.key === 'profile' && (t('onboarding_profile_desc') || 'Dein Anzeigename und Avatar bleiben lokal steuerbar.')}
              {currentStep.key === 'security' && (t('onboarding_security_desc') || 'GaiaCom trennt Identität, Schlüssel, Nachrichten und Netzwerkstatus.')}
              {currentStep.key === 'backup' && (t('onboarding_backup_desc') || 'Ohne Wiederherstellungsdaten kann niemand deine Identität retten.')}
              {currentStep.key === 'launch' && (t('onboarding_launch_desc') || 'Du kannst direkt loslegen oder den Rundgang beenden.')}
            </p>
          </header>

          {currentStep.key === 'profile' && (
            <div className="first-run-profile-grid">
              <div className="first-run-avatar-preview" aria-hidden="true">
                {draftAvatar.startsWith('data:image/') ? <img src={draftAvatar} alt="" /> : <span>{draftAvatar}</span>}
              </div>
              <div className="first-run-form">
                <label htmlFor="first-run-display-name">{t('onboarding_display_name') || 'Anzeigename'}</label>
                <input id="first-run-display-name" type="text" value={draftName} maxLength={42}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={t('onboarding_display_name_placeholder') || 'Wie soll GaiaCom dich anzeigen?'} />
                <div className="first-run-avatar-list" aria-label={t('onboarding_select_avatar') || 'Avatar auswählen'}>
                  {avatarChoices.map((avatar) => (
                    <button key={avatar} type="button"
                      className={`first-run-avatar-choice ${draftAvatar === avatar ? 'active' : ''}`}
                      onClick={() => setDraftAvatar(avatar)} aria-label={`Avatar ${avatar}`}>
                      {avatar}
                    </button>
                  ))}
                </div>
                <code>{identityLabel}</code>
              </div>
            </div>
          )}

          {currentStep.key === 'security' && (
            <div className="first-run-info-grid">
              <article><strong>{t('onboarding_sec_identity_title') || 'Identität'}</strong><span>{t('onboarding_sec_identity_desc') || 'Deine Gaia-ID ist dein Netzwerkanker.'}</span></article>
              <article><strong>{t('onboarding_sec_messages_title') || 'Nachrichten'}</strong><span>{t('onboarding_sec_messages_desc') || 'Inhalte werden lokal entschlüsselt.'}</span></article>
              <article><strong>{t('onboarding_sec_network_title') || 'Netzwerk'}</strong><span>{t('onboarding_sec_network_desc') || 'Security Center und Abuse Center machen Risiken sichtbar.'}</span></article>
              <article><strong>{t('onboarding_sec_transparency_title') || 'Transparenz'}</strong><span>{t('onboarding_sec_transparency_desc') || 'Schreibt sicherheitsrelevante Ereignisse ins Protokoll.'}</span></article>
            </div>
          )}

          {currentStep.key === 'backup' && (
            <div className="first-run-backup-panel">
              <div>
                <strong>{t('onboarding_backup_notice_title') || 'Wichtig für normale Nutzer'}</strong>
                <p>{t('onboarding_backup_notice_desc') || 'Speichere deine Wiederherstellungsdaten getrennt von diesem Gerät.'}</p>
              </div>
              <label className="first-run-check">
                <input type="checkbox" checked={backupConfirmed} onChange={(e) => setBackupConfirmed(e.target.checked)} />
                <span>{t('onboarding_backup_consent') || 'Ich weiß, dass mein Backup für Wiederherstellung entscheidend ist.'}</span>
              </label>
            </div>
          )}

          {currentStep.key === 'launch' && (
            <div className="first-run-action-grid">
              <button type="button" onClick={onOpenInbox}><strong>{t('onboarding_inbox_title') || 'Posteingang'}</strong><span>{t('onboarding_inbox_desc') || 'Mails lesen.'}</span></button>
              <button type="button" onClick={onOpenChat}><strong>{t('onboarding_contacts_title') || 'Kontakte'}</strong><span>{t('onboarding_contacts_desc') || 'Ersten Kontakt prüfen.'}</span></button>
              <button type="button" onClick={onOpenChannels}><strong>{t('onboarding_channels_title') || 'Channels'}</strong><span>{t('onboarding_channels_desc') || 'Öffentliche Frequenzen entdecken.'}</span></button>
              <button type="button" onClick={onOpenSecurity}><strong>{t('onboarding_security_title_card') || 'Security Center'}</strong><span>{t('onboarding_security_desc_card') || 'GaiaShield Status ansehen.'}</span></button>
            </div>
          )}
        </div>

        <footer className="first-run-footer">
          <button type="button" className="first-run-skip-btn" onClick={onSkip}>{t('onboarding_later') || 'Später'}</button>
          <div>
            {stepIndex > 0 && <button type="button" className="btn-secondary" onClick={goBack}>{t('onboarding_back') || 'Zurück'}</button>}
            <button type="button" className="btn-primary" onClick={goNext} disabled={!canContinue}>
              {stepIndex === steps.length - 1 ? (t('onboarding_complete_setup') || 'Setup abschließen') : (t('onboarding_continue') || 'Weiter')}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
