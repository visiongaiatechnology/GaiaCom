import React from 'react';
import Icon from '../../../ui/Icon';
import ProfileSection from '../ui/ProfileSection';

export default function ProfileLegalSection({ t }) {
  return (
    <ProfileSection
      eyebrow="Datenschutz"
      title={t('privacy_imprint_title') || 'Datenschutz & Impressum'}
      description={
        t('privacy_imprint_profile_desc') ||
        'GaiaCOM verarbeitet Kommunikationsinhalte nach dem Prinzip Datenminimierung, Ende-zu-Ende-Verschlüsselung und lokaler Schlüsselkontrolle.'
      }
    >
      <div className="vgt-profile-stack">
        <dl className="vgt-proof-grid">
          <div>
            <dt>E2EE</dt>
            <dd>{t('gdpr_reason_e2ee') || 'Private Inhalte bleiben nur für vorgesehene Empfänger entschlüsselbar.'}</dd>
          </div>
          <div>
            <dt>{t('zero_knowledge') || 'Zero Knowledge'}</dt>
            <dd>{t('gdpr_reason_zero_knowledge') || 'Private Schlüssel und Recovery-Daten bleiben lokal unter Nutzerkontrolle.'}</dd>
          </div>
          <div>
            <dt>{t('data_minimization') || 'Datenminimierung'}</dt>
            <dd>{t('gdpr_reason_minimal') || 'Metadaten werden nur für Routing, Zustellung und Sicherheitsnachweise genutzt.'}</dd>
          </div>
          <div>
            <dt>{t('erasability') || 'Löschbarkeit'}</dt>
            <dd>{t('gdpr_reason_delete') || 'Account-Löschung entfernt Konto, Identitäten, lokale Sitzungen und serverseitig zuordenbare Daten.'}</dd>
          </div>
        </dl>

        <div className="vgt-profile-form__actions">
          <a
            className="btn-primary"
            href="https://gaiacom.de/impressum/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="external" size={16} />
            {t('open_privacy_imprint') || 'Impressum und Datenschutz öffnen'}
          </a>
        </div>
      </div>
    </ProfileSection>
  );
}
