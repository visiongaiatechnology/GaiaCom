// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState } from 'react';
import GaiaPassportCard from '../common/GaiaPassportCard';
import DecryptedAvatar from '../chat/gsn/DecryptedAvatar';
import { getHumanProof } from '../../utils/humanProof';

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
  const abuseScore = contactProfile.abuseScore || { score: 0, escalationLevel: 0 };
  const keyHistory = contactProfile.keyHistory || [];
  const humanProof = trustPassport.humanProof || getHumanProof(contactProfile.gaiaID);
  const fingerprint = trustPassport.fingerprint || contactProfile.publicKey?.slice(0, 64) || 'Unbekannt';
  const websiteHref = (() => {
    if (!contactProfile.website) return '';
    try {
      const rawValue = contactProfile.website.startsWith('http') ? contactProfile.website : `https://${contactProfile.website}`;
      const parsed = new URL(rawValue);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch (_) {
      return '';
    }
  })();

  let reputationClass = 'status-success';
  let reputationLabel = t('vertrauenswuerdig') || 'Vertrauenswuerdig';
  if (abuseScore.score > 10 && abuseScore.score <= 50) {
    reputationClass = 'status-warning';
    reputationLabel = t('auffaellig') || 'Auffaellig';
  } else if (abuseScore.score > 50) {
    reputationClass = 'status-danger';
    reputationLabel = t('gesperrt_verdaechtig') || 'Gesperrt / Verdaechtig';
  }

  const handleCopyFingerprint = () => {
    if (!fingerprint || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(fingerprint).catch(() => {});
  };

  return (
    <div className="popup-overlay contact-profile-overlay">
      <div className="popup-card glass-panel contact-profile-modal">
        <div className="contact-profile-header">
          <div>
            <div className="contact-profile-eyebrow">GaiaCOM Trust Passport</div>
            <h2 className="contact-profile-title">{contactProfile.displayName}</h2>
            <div className="contact-profile-id">{displayGaiaID(contactProfile.gaiaID)}</div>
          </div>
          <button type="button" className="chat-icon-btn" onClick={onClose} aria-label="Schliessen">
            {'\u2715'}
          </button>
        </div>

        <div className="contact-profile-hero">
          <DecryptedAvatar avatarJson={contactProfile.avatar || ''} displayName={contactProfile.displayName || contactProfile.gaiaID} variant="profile" />
          <div className="contact-profile-hero-copy">
            <div className="contact-profile-status-row">
              <span className="contact-profile-status-label">Reputation</span>
              <strong className={reputationClass}>{reputationLabel}</strong>
            </div>
            <div className="contact-profile-status-row">
              <span className="contact-profile-status-label">Abuse Score</span>
              <strong>{abuseScore.score} / Lvl {abuseScore.escalationLevel}</strong>
            </div>
            <div className="contact-profile-status-row">
              <span className="contact-profile-status-label">Trust Age</span>
              <strong>{trustPassport.trustAgeDays !== undefined ? `${trustPassport.trustAgeDays} ${t('tage') || 'Tage'}` : `0 ${t('tage') || 'Tage'}`}</strong>
            </div>
          </div>
        </div>

        <div className="settings-tabs contact-profile-tabs">
          <button type="button" className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
            Info
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'crypto' ? 'active' : ''}`} onClick={() => setActiveTab('crypto')}>
            Verschluesselung
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            Settings
          </button>
        </div>

        {activeTab === 'info' && (
          <>
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

            <div className="contact-profile-grid">
              <div className="contact-profile-panel">
                <span>Echter Name</span>
                <strong>{contactProfile.realName || 'Nicht angegeben'}</strong>
              </div>
              <div className="contact-profile-panel">
                <span>Node Reputation</span>
                <strong>{trustPassport.nodeReputation || 'local-verified'}</strong>
              </div>
              <div className="contact-profile-panel">
                <span>Webseite</span>
                {contactProfile.website && websiteHref ? (
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer">{contactProfile.website}</a>
                ) : (
                  <strong>Nicht angegeben</strong>
                )}
              </div>
              <div className="contact-profile-panel">
                <span>Key Status</span>
                <strong>{keyHistory[0]?.confirmed ? (t('bestaetigt') || 'Bestaetigt') : (t('unbestaetigt') || 'Unbestaetigt')}</strong>
              </div>
            </div>
            <div className="contact-profile-panel">
              <div className="contact-profile-panel-header">
                <span>Profilnotiz</span>
              </div>
              <p className="contact-profile-bio">{contactProfile.bio || 'Keine Bio hinterlegt.'}</p>
            </div>
          </>
        )}

        {activeTab === 'crypto' && (
          <>
            <div className="contact-profile-panel">
              <div className="contact-profile-panel-header">
                <span>{t('cryptographic_fingerprint') || 'Kryptographischer Fingerprint'}</span>
                <button type="button" className="btn-secondary compact-btn" onClick={handleCopyFingerprint}>
                  {t('copy') || 'Kopieren'}
                </button>
              </div>
              <code className="contact-profile-fingerprint">{fingerprint}</code>
            </div>

            <div className="contact-profile-panel">
              <div className="contact-profile-panel-header">
                <span>{t('key_transparency') || 'Key Transparency'}</span>
              </div>
              <div className="contact-profile-history gaia-scrollbar">
                {keyHistory.length === 0 ? (
                  <div className="contact-profile-history-empty">
                    {t('no_key_history') || 'Keine Schluessel-Historie aufgezeichnet.'}
                  </div>
                ) : (
                  keyHistory.map((historyEntry, index) => (
                    <div key={`${historyEntry.fingerprint || historyEntry.publicKey || index}-${index}`} className="contact-profile-history-item">
                      <div className="contact-profile-history-top">
                        <strong>{historyEntry.type ? historyEntry.type.toUpperCase() : 'IDENTITY_KEY'}</strong>
                        <span className={historyEntry.confirmed ? 'status-success' : 'status-warning'}>
                          {historyEntry.confirmed ? (t('bestaetigt') || 'Bestaetigt') : (t('unbestaetigt') || 'Unbestaetigt')}
                        </span>
                      </div>
                      <code>FP: {historyEntry.fingerprint || `${historyEntry.publicKey?.slice(0, 32) || ''}...`}</code>
                      <small>
                        Aktiv von: {historyEntry.firstSeenAt ? new Date(historyEntry.firstSeenAt).toLocaleDateString() : 'Anfang'} - {historyEntry.lastSeenAt ? new Date(historyEntry.lastSeenAt).toLocaleDateString() : 'Aktiv'}
                      </small>
                      {historyEntry.warning && (
                        <div className="contact-profile-warning">
                          {t('warnung') || 'Warnung'}: {historyEntry.warning}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <div className="contact-profile-panel">
            <div className="contact-profile-panel-header">
              <span>Chat Aktionen</span>
            </div>
            {showChatActions ? (
              <div className="contact-profile-actions">
                <button type="button" className="btn-secondary compact-btn" onClick={onToggleBlock}>
                  {contactProfile.blocked ? 'Kontakt freigeben' : 'Kontakt blockieren'}
                </button>
                <button type="button" className="btn-secondary compact-btn" onClick={onReport}>
                  Melden
                </button>
                <button type="button" className="btn-secondary compact-btn" onClick={onClearChat}>
                  Chat leeren
                </button>
                <button type="button" className="btn-secondary compact-btn" onClick={onCloseChat}>
                  Chat schliessen
                </button>
              </div>
            ) : (
              <div className="contact-profile-history-empty">Keine Chat-Aktion fuer diesen Kontakt aktiv.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactProfileModal;
