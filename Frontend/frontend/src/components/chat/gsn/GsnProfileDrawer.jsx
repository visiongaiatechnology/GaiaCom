import React from 'react';
import Icon from '../../ui/Icon';
import VerificationBadges from '../../common/VerificationBadges';
import GaiaPassportCard from '../../common/GaiaPassportCard';
import AvatarMark from '../profile/ui/AvatarMark';
import { safeWebsiteUrl } from '../../../utils/safeHttpUrl';
import { displayGaiaID } from '../../../utils/gaiaAddress';

function realCount(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : '0';
}

function localHandle(gaiaId) {
  const raw = String(gaiaId || '').replace(/^@+/, '');
  const localPart = raw.split(/[:@]/)[0];
  return localPart ? `@${localPart}` : '';
}

/**
 * GSN profile drawer. Shows the real identity/GSN profile values only; profile
 * editing is not duplicated here – it belongs to the GaiaCom profile settings,
 * which keeps one avatar and one identity surface.
 *
 * Layout: identity hero -> primary actions -> real stats strip -> federated
 * identity/trust card -> optional about facts. The old unscoped definition list
 * (stats / passport / actions stacked without rhythm) is gone.
 */
export default function GsnProfileDrawer({
  activeProfile,
  loadingProfile,
  activeTrustSummary,
  activeHumanProof,
  isOwnActiveProfile,
  setActiveProfile,
  setShowHumanProofDialog,
  followUser,
  unfollowUser,
  handleOpenReportModal,
  onEditProfile,
  t
}) {
  if (!activeProfile) return null;

  const displayName = activeProfile.displayName || activeProfile.gaiaId || 'Profil';
  const handle = localHandle(activeProfile.gaiaId);
  const federatedId = displayGaiaID(activeProfile.gaiaId || '');
  const safeWebsite = safeWebsiteUrl(activeProfile.website);
  const stats = [
    { key: 'posts', label: 'Beiträge', value: realCount(activeProfile.postsCount) },
    { key: 'followers', label: t('gsn_followers') || 'Follower', value: realCount(activeProfile.followersCount) },
    { key: 'following', label: t('gsn_following') || 'Folge ich', value: realCount(activeProfile.followingCount) }
  ];
  const badges = [
    activeProfile.isVerifiedOperator && { key: 'operator', icon: 'verified', label: 'Operator' },
    activeProfile.isVerifiedGovernance && { key: 'governance', icon: 'shieldCheck', label: 'Governance' },
    activeProfile.isVerifiedPassport && { key: 'passport', icon: 'seal', label: 'Passport' }
  ].filter(Boolean);

  return (
    <aside className="vgt-gsn-drawer vgt-gsn-profile-drawer" aria-label={t('gsn_profile') || 'Benutzerprofil'}>
      <header className="vgt-gsn-drawer__head">
        <div className="vgt-gsn-drawer__heading">
          <span className="vgt-eyebrow">GSN Social</span>
          <h2 className="vgt-h3">{t('gsn_profile') || 'Profil'}</h2>
        </div>
        <button
          type="button"
          className="btn-icon"
          onClick={() => setActiveProfile(null)}
          aria-label="Profil schließen"
          title="Profil schließen"
        >
          <Icon name="close" size={18} />
        </button>
      </header>

      <div className="vgt-gsn-drawer__body vgt-scroll-page">
        {loadingProfile ? (
          <div className="vgt-state" role="status">
            <Icon name="spinner" size={18} />
            <span>Lade Profil…</span>
          </div>
        ) : (
          <div className="vgt-gsn-profile">
            <header className="vgt-gsn-profile__hero">
              <div className="vgt-gsn-profile__banner" aria-hidden="true">
                <img src="/ui/aurora_mountains_cinematic.png" alt="" />
              </div>
              <div className="vgt-gsn-profile__hero-body">
                <AvatarMark
                  avatar={activeProfile.avatar || ''}
                  displayName={displayName}
                  variant="profile"
                  className="vgt-gsn-profile__avatar"
                />
                <div className="vgt-gsn-profile__identity">
                  <h3 className="vgt-gsn-profile__name">{displayName}</h3>
                  {handle && <span className="vgt-gsn-profile__handle">{handle}</span>}
                  <VerificationBadges gaiaID={activeProfile.gaiaId} showIssuer />
                  {badges.length > 0 && (
                    <div className="vgt-gsn-profile__badges">
                      {badges.map(badge => (
                        <span key={badge.key} className={`vgt-badge${badge.key === 'operator' ? ' vgt-badge--seal' : ''}`}>
                          <Icon name={badge.icon} size={12} />
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="vgt-gsn-profile__actions">
              {isOwnActiveProfile ? (
                <button type="button" className="btn-secondary vgt-gsn-profile__action" onClick={onEditProfile}>
                  <Icon name="edit" size={15} />
                  {t('gsn_edit_profile') || 'Profil bearbeiten'}
                </button>
              ) : (
                <>
                  {activeProfile.isFollowing ? (
                    <button
                      type="button"
                      className="btn-secondary vgt-gsn-profile__action"
                      onClick={() => unfollowUser(activeProfile.gaiaId)}
                    >
                      <Icon name="minus" size={15} />
                      {t('gsn_unfollow') || 'Entfolgen'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary vgt-gsn-profile__action"
                      onClick={() => followUser(activeProfile.gaiaId)}
                    >
                      <Icon name="plus" size={15} />
                      {t('gsn_follow') || 'Folgen'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="vgt-gsn-profile__report"
                    onClick={() => handleOpenReportModal('user', activeProfile.gaiaId)}
                  >
                    <Icon name="alertTriangle" size={15} />
                    {t('gsn_report') || 'Melden'}
                  </button>
                </>
              )}
            </div>

            <dl className="vgt-gsn-profile__stats" aria-label="Profil-Kennzahlen">
              {stats.map(stat => (
                <div key={stat.key} className="vgt-gsn-profile__stat">
                  <dt>{stat.label}</dt>
                  <dd className="vgt-numeric">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <section className="vgt-gsn-profile__section" aria-labelledby="gsn-profile-passport">
              <h4 className="vgt-gsn-profile__section-title" id="gsn-profile-passport">
                <Icon name="shieldCheck" size={15} />
                Vertrauen &amp; Verifikation
              </h4>
              <GaiaPassportCard
                profile={activeProfile}
                trustSummary={activeTrustSummary}
                humanProof={activeHumanProof}
                isOwnProfile={isOwnActiveProfile}
                onStartHumanProof={() => setShowHumanProofDialog(true)}
                hideWebsite
              />
            </section>

            <section className="vgt-gsn-profile__section" aria-labelledby="gsn-profile-about">
              <h4 className="vgt-gsn-profile__section-title" id="gsn-profile-about">
                <Icon name="user" size={15} />
                Über dieses Profil
              </h4>
              <dl className="vgt-gsn-profile__facts">
                {activeProfile.description && (
                  <div className="vgt-gsn-profile__fact">
                    <dt>Beschreibung</dt>
                    <dd className="vgt-gsn-profile__bio">{activeProfile.description}</dd>
                  </div>
                )}
                {activeProfile.website && (
                  <div className="vgt-gsn-profile__fact">
                    <dt>Website</dt>
                    <dd>
                      {safeWebsite ? (
                        <a className="vgt-link" href={safeWebsite} target="_blank" rel="noopener noreferrer">
                          {activeProfile.website}
                          <Icon name="external" size={13} />
                        </a>
                      ) : (
                        activeProfile.website
                      )}
                    </dd>
                  </div>
                )}
                <div className="vgt-gsn-profile__fact">
                  <dt>Föderierte Gaia-ID</dt>
                  <dd><code className="vgt-mono vgt-gsn-profile__gaia-id">{federatedId || '—'}</code></dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
