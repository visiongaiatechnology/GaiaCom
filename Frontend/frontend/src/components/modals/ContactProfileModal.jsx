import React, { useState } from 'react';
import Icon from '../ui/Icon';
import DialogShell from './DialogShell';
import GaiaPassportCard from '../common/GaiaPassportCard';
import DecryptedAvatar from '../chat/gsn/DecryptedAvatar';
import VerificationBadges from '../common/VerificationBadges';
import { getHumanProof } from '../../utils/humanProof';
import { safeWebsiteUrl } from '../../utils/safeHttpUrl';

const TABS = [
  { id: 'info', label: 'Info', icon: 'user' },
  { id: 'crypto', label: 'Verschlüsselung', icon: 'lock' },
  { id: 'settings', label: 'Aktionen', icon: 'settings' }
];

/**
 * Contact trust profile: passport, reputation, abuse score, key transparency and
 * the chat actions for the active conversation. All values are the ones already
 * resolved by the app (trust passport / key history), no derived claims added.
 */
export const ContactProfileModal = ({
  show,
  onClose,
  contactProfile,
  displayGaiaID,
  t,
  showChatActions = false,
  onToggleBlock,
  onReport,
  onClearChat,
  onCloseChat
}) => {
  const [activeTab, setActiveTab] = useState('info');
  if (!show || !contactProfile) return null;

  const trustPassport = contactProfile.trustPassport || {};
  const keyHistory = contactProfile.keyHistory || [];
  const humanProof = trustPassport.humanProof || getHumanProof(contactProfile.gaiaID);
  const fingerprint = trustPassport.fingerprint || contactProfile.publicKey?.slice(0, 64) || 'Unbekannt';
  // SEC-FE FE-06: one shared http(s)-only helper for user-supplied websites.
  const websiteHref = safeWebsiteUrl(contactProfile.website) || '';

  // Trust values are only rendered when the server actually supplied them.
  // Missing passport data must never be displayed as "0" or as a green
  // trust verdict (audit-v3 FE-01, trust gate).
  const rawAbuseScore = typeof trustPassport.abuseScore === 'number'
    ? trustPassport.abuseScore
    : (trustPassport.abuseScore && typeof trustPassport.abuseScore === 'object'
      ? trustPassport.abuseScore.score
      : undefined);
  const abuseScoreValue = Number.isFinite(rawAbuseScore) ? rawAbuseScore : null;
  const abuseLevelValue = Number.isFinite(trustPassport.abuseScore?.escalationLevel)
    ? trustPassport.abuseScore.escalationLevel
    : null;
  const trustAgeDays = Number.isFinite(trustPassport.trustAgeDays) ? trustPassport.trustAgeDays : null;
  const serverReputationLabel = trustPassport.reputationLabel || trustPassport.nodeReputation || '';

  let reputationTone = 'vgt-status--idle';
  let reputationLabel = (t('unavailable') || 'Nicht verfügbar');
  if (abuseScoreValue !== null) {
    if (abuseScoreValue > 50) {
      reputationTone = 'vgt-status--danger';
      reputationLabel = t('gesperrt_verdaechtig') || 'Gesperrt / verdächtig';
    } else if (abuseScoreValue > 10) {
      reputationTone = 'vgt-status--warn';
      reputationLabel = t('auffaellig') || 'Auffällig';
    } else {
      reputationTone = 'vgt-status--ok';
      reputationLabel = t('vertrauenswuerdig') || 'Vertrauenswürdig';
    }
  } else if (serverReputationLabel) {
    // A label without a score carries no verdict we could tone — stay neutral.
    reputationLabel = String(serverReputationLabel);
  }

  const handleCopyFingerprint = () => {
    if (!fingerprint || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(fingerprint).catch(() => {});
  };

  return (
    <DialogShell
      id="contact-profile"
      eyebrow="GaiaCOM Trust Passport"
      title={contactProfile.displayName}
      onClose={onClose}
      closeLabel="Schließen"
      size="lg"
    >
      <div className="vgt-contact-hero">
        <div className="vgt-contact-hero__avatar-box">
          <DecryptedAvatar
            avatarJson={contactProfile.avatar || ''}
            displayName={contactProfile.displayName || contactProfile.gaiaID}
            variant="profile"
          />
        </div>
        <div className="vgt-contact-hero__copy">
          <span className="vgt-id">{displayGaiaID(contactProfile.gaiaID)}</span>
          <VerificationBadges gaiaID={contactProfile.gaiaID} showIssuer />
          <dl className="vgt-contact-hero__stats">
            <div>
              <dt>Reputation</dt>
              <dd>
                <span className={`vgt-status ${reputationTone}`}>{reputationLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Abuse Score</dt>
              <dd>
                {abuseScoreValue !== null ? (
                  <span className="vgt-numeric">
                    {abuseScoreValue}
                    {abuseLevelValue !== null ? ` / Lvl ${abuseLevelValue}` : ''}
                  </span>
                ) : (
                  <span className="vgt-caption">{t('unavailable') || (t('unavailable') || 'Nicht verfügbar')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('trust_age') || (t('trust_age') || 'Trust Age')}</dt>
              <dd>
                {trustAgeDays !== null ? (
                  <>
                    <span className="vgt-numeric">{trustAgeDays}</span> {t('tage') || (t('tage') || 'Tage')}
                  </>
                ) : (
                  <span className="vgt-caption">{t('unavailable') || (t('unavailable') || 'Nicht verfügbar')}</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="vgt-tabs" role="tablist" aria-label="Profilbereiche">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`vgt-tabs__item${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="vgt-contact-info">
          <GaiaPassportCard
            profile={{
              displayName: contactProfile.displayName,
              gaiaId: contactProfile.gaiaID,
              realName: contactProfile.realName,
              website: contactProfile.website,
              avatar: contactProfile.avatar
            }}
            trustPassport={trustPassport}
            humanProof={humanProof}
            className="contact-profile-passport-card"
          />

          <dl className="vgt-contact-facts">
            <div>
              <dt>Echter Name</dt>
              <dd>{contactProfile.realName || 'Nicht angegeben'}</dd>
            </div>
            <div>
              <dt>Node Reputation</dt>
              <dd>{trustPassport.nodeReputation || 'Nicht angegeben'}</dd>
            </div>
            <div>
              <dt>Webseite</dt>
              <dd>
                {contactProfile.website && websiteHref ? (
                  <a className="vgt-link" href={websiteHref} target="_blank" rel="noopener noreferrer">
                    {contactProfile.website}
                    <Icon name="external" size={13} />
                  </a>
                ) : (
                  'Nicht angegeben'
                )}
              </dd>
            </div>
            <div>
              <dt>Key Status</dt>
              <dd>
                <span className={`vgt-status ${keyHistory[0]?.confirmed ? 'vgt-status--ok' : 'vgt-status--warn'}`}>
                  {keyHistory[0]?.confirmed ? t('bestaetigt') || (t('bestaetigt') || 'Bestätigt') : t('unbestaetigt') || (t('unbestaetigt') || 'Unbestätigt')}
                </span>
              </dd>
            </div>
          </dl>

          <section className="vgt-contact-bio">
            <span className="vgt-label">Profilnotiz</span>
            <p className="vgt-body vgt-body--sm">{contactProfile.bio || 'Keine Bio hinterlegt.'}</p>
          </section>
        </div>
      )}

      {activeTab === 'crypto' && (
        <div className="vgt-contact-crypto">
          <section className="vgt-contact-panel">
            <header className="vgt-contact-panel__head">
              <span className="vgt-label">{t('cryptographic_fingerprint') || 'Kryptographischer Fingerprint'}</span>
              <button type="button" className="btn-action" onClick={handleCopyFingerprint}>
                <Icon name="copy" size={14} />
                {t('copy') || 'Kopieren'}
              </button>
            </header>
            <code className="vgt-contact-fingerprint vgt-mono">{fingerprint}</code>
          </section>

          <section className="vgt-contact-panel">
            <header className="vgt-contact-panel__head">
              <span className="vgt-label">{t('key_transparency') || 'Key Transparency'}</span>
            </header>
            {keyHistory.length === 0 ? (
              <p className="vgt-caption">{t('no_key_history') || 'Keine Schlüssel-Historie aufgezeichnet.'}</p>
            ) : (
              <ul className="vgt-key-history vgt-scroll-page">
                {keyHistory.map((entry, index) => (
                  <li key={`${entry.fingerprint || entry.publicKey || index}-${index}`} className="vgt-key-history__item">
                    <div className="vgt-key-history__head">
                      <strong>{entry.type ? String(entry.type).toUpperCase() : 'IDENTITY_KEY'}</strong>
                      <span className={`vgt-status ${entry.confirmed ? 'vgt-status--ok' : 'vgt-status--warn'}`}>
                        {entry.confirmed ? t('bestaetigt') || (t('bestaetigt') || 'Bestätigt') : t('unbestaetigt') || (t('unbestaetigt') || 'Unbestätigt')}
                      </span>
                    </div>
                    <code className="vgt-mono">{entry.fingerprint || `FP: ${String(entry.publicKey || '').slice(0, 32)}…`}</code>
                    <small className="vgt-caption">
                      Aktiv von {entry.firstSeenAt ? new Date(entry.firstSeenAt).toLocaleDateString() : 'Anfang'} bis{' '}
                      {entry.lastSeenAt ? new Date(entry.lastSeenAt).toLocaleDateString() : 'heute'}
                    </small>
                    {entry.warning && (
                      <p className="vgt-notice vgt-notice--warn">
                        <Icon name="alertTriangle" size={14} />
                        <span>{entry.warning}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="vgt-contact-actions">
          {showChatActions ? (
            <>
              <button type="button" className="vgt-dialog__list-item" onClick={onToggleBlock}>
                <Icon name={contactProfile.blocked ? 'unlock' : 'shieldOff'} size={17} />
                <span>{contactProfile.blocked ? 'Kontakt freigeben' : 'Kontakt blockieren'}</span>
              </button>
              <button type="button" className="vgt-dialog__list-item" onClick={onReport}>
                <Icon name="alertTriangle" size={17} />
                <span>{t('gsn_report') || 'Melden'}</span>
              </button>
              <button type="button" className="vgt-dialog__list-item" onClick={onClearChat}>
                <Icon name="trash" size={17} />
                <span>{t('clear_chat') || 'Chat leeren'}</span>
              </button>
              <button type="button" className="vgt-dialog__list-item" onClick={onCloseChat}>
                <Icon name="close" size={17} />
                <span>Chat schließen</span>
              </button>
            </>
          ) : (
            <p className="vgt-caption">Für diesen Kontakt ist aktuell keine Chat-Aktion verfügbar.</p>
          )}
        </div>
      )}
    </DialogShell>
  );
};

export default ContactProfileModal;
