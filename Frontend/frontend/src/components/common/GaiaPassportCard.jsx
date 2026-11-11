import React from 'react';
import DecryptedAvatar from '../chat/gsn/DecryptedAvatar';
import Icon from '../ui/Icon';
import { safeWebsiteUrl } from '../../utils/safeHttpUrl';

/**
 * Trust states. A passport is only "verified" when the server said so: either a
 * live trust passport carries `isHumanVerified === true` together with a
 * server-validated `humanProof` (`identity_service.go:279-284`), or the local
 * record was written by the verified branch of `HumanProofDialog` after a
 * `200 { status: "ok", trustPassport.humanProof }` response.
 * Every other case is a distinct, text-labelled state and never "verified".
 */
const STATE_PRESENTATION = {
  verified: {
    tone: 'signed',
    icon: 'verified',
    label: 'Human verifiziert',
    className: 'is-verified'
  },
  pending: {
    tone: 'idle',
    icon: 'clock',
    label: 'Human ausstehend',
    className: 'is-pending'
  },
  localOnly: {
    tone: 'warn',
    icon: 'alertTriangle',
    label: 'Nicht serverbestätigt',
    className: 'is-local-only'
  },
  unconfirmed: {
    tone: 'warn',
    icon: 'alertTriangle',
    label: 'Serverbestätigung fehlt',
    className: 'is-unconfirmed'
  },
  rejected: {
    tone: 'danger',
    icon: 'alertOctagon',
    label: 'Serverprüfung abgelehnt',
    className: 'is-rejected'
  },
  unavailable: {
    tone: 'idle',
    icon: 'info',
    label: 'Passport nicht verfügbar',
    className: 'is-unavailable'
  }
};

function resolveTrustState({ humanProof, trustPassport, trustSummary, proofStatus }) {
  if (proofStatus && STATE_PRESENTATION[proofStatus]) return proofStatus;

  const liveVerified =
    (trustPassport?.isHumanVerified === true && Boolean(trustPassport?.humanProof)) ||
    (trustSummary?.isHumanVerified === true && Boolean(trustSummary?.humanProof));
  if (liveVerified) return 'verified';

  if (humanProof) {
    if (humanProof.serverConfirmation === 'rejected') return 'rejected';
    if (humanProof.serverConfirmation === 'missing' || humanProof.serverConfirmation === 'failed') return 'unconfirmed';
    if (humanProof.serverVerified === true) return 'verified';
    return 'localOnly';
  }

  const hasPassportData = Boolean(
    trustPassport?.fingerprint ||
      trustSummary?.fingerprint ||
      trustPassport?.trustAgeDays !== undefined ||
      trustSummary?.trustAgeDays !== undefined
  );
  return hasPassportData ? 'pending' : 'unavailable';
}

function shortId(value, left = 6, right = 4) {
  const text = String(value || '');
  if (!text) return '—';
  if (text.length <= left + right + 3) return text;
  return `${text.slice(0, left)}...${text.slice(-right)}`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * VGT GLASS 2100 — trust credential card (Gaia Passport).
 *
 * Public API unchanged (one optional `proofStatus` override added). Presentation
 * and state logic are data-first: fabricated defaults are gone, verification is
 * server-gated, and pending / local-only / unconfirmed / rejected / unavailable
 * are visually and textually distinct.
 */
export default function GaiaPassportCard({
  profile,
  trustPassport = {},
  trustSummary = null,
  humanProof = null,
  isOwnProfile = false,
  onStartHumanProof,
  proofStatus,
  hideWebsite = false,
  className = ''
}) {
  const state = resolveTrustState({ humanProof, trustPassport, trustSummary, proofStatus });
  const presentation = STATE_PRESENTATION[state];
  const verified = state === 'verified';

  const displayName = profile?.displayName || profile?.name || profile?.username || profile?.gaiaId || 'Gaia User';
  const gaiaId = profile?.gaiaId || profile?.gaiaID || profile?.GaiaID || '';
  const realName = profile?.realName || 'Freiwillig nicht angegeben';
  const website = profile?.website || '';
  const safeWebsite = safeWebsiteUrl(website);
  const trustAgeDays = toFiniteNumber(trustSummary?.trustAgeDays ?? trustPassport?.trustAgeDays);
  const abuseScoreValue = trustSummary?.abuseScore ?? trustPassport?.abuseScore?.score ?? trustPassport?.abuseScore;
  const abuseScore = toFiniteNumber(abuseScoreValue);
  const proofSuite = humanProof?.signatureSuite || '';
  const serial = humanProof?.challengeHash || trustPassport?.fingerprint || '';
  const issuedAt = formatDate(humanProof?.completedAt || trustPassport?.humanVerifiedAt);
  const serverError = humanProof?.serverError || '';

  const proofValue = verified
    ? (proofSuite || 'Serverbestätigt')
    : humanProof
      ? 'Lokal vorhanden, nicht serverbestätigt'
      : 'Nicht verifiziert';

  return (
    <section className={`vgt-apass ${presentation.className} ${className}`.trim()}>
      <header className="vgt-apass__head">
        <div>
          <p className="vgt-label">GAIACOM FEDERATED IDENTITY</p>
          <h3 className="vgt-h4">{displayName}</h3>
          <code className="vgt-id">{gaiaId || 'Gaia-ID nicht gesetzt'}</code>
        </div>
        <span className={`vgt-status vgt-status--${presentation.tone}`}>
          <Icon name={presentation.icon} size={14} />
          {presentation.label}
        </span>
      </header>

      <div className="vgt-apass__identity">
        <div className="vgt-apass__photo">
          <DecryptedAvatar avatarJson={profile?.avatar || ''} displayName={displayName} variant="profile" />
        </div>
        <dl className="vgt-apass__fields">
          <div>
            <dt>Echter Name</dt>
            <dd>{realName}</dd>
          </div>
          <div>
            <dt>Trust Age</dt>
            <dd>
              {trustAgeDays === null ? 'Nicht verfügbar' : (
                <>
                  <span className="vgt-numeric">{trustAgeDays}</span> Tage
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>Abuse Score</dt>
            <dd className={abuseScore === null ? undefined : 'vgt-numeric'}>
              {abuseScore === null ? 'Nicht verfügbar' : abuseScore}
            </dd>
          </div>
          <div>
            <dt>Human Proof</dt>
            <dd>{proofValue}</dd>
          </div>
        </dl>
      </div>

      <dl className="vgt-apass__meta">
        <div>
          <dt>Ausgestellt</dt>
          <dd className="vgt-numeric">{issuedAt || '—'}</dd>
        </div>
        <div>
          <dt>Serie / Fingerprint</dt>
          <dd><code className="vgt-mono">{shortId(serial, 8, 6)}</code></dd>
        </div>
        {website && !hideWebsite ? (
          <div>
            <dt>Webseite</dt>
            <dd>
              {safeWebsite ? (
                <a
                  className="vgt-link"
                  href={safeWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {website}
                </a>
              ) : (
                website
              )}
            </dd>
          </div>
        ) : null}
      </dl>

      {state === 'unavailable' ? (
        <p className="vgt-apass__notice vgt-apass__notice--neutral">
          Für diese Identität liegt kein Trust Passport vom Server vor. Es werden keine Ersatzwerte angezeigt.
        </p>
      ) : null}

      {state === 'localOnly' ? (
        <p className="vgt-apass__notice vgt-apass__notice--warn">
          Ein lokaler Human-Proof liegt vor, wurde aber nicht serverseitig bestätigt. Ohne Serverbestätigung gilt
          dieser Passport nicht als verifiziert.
        </p>
      ) : null}

      {state === 'unconfirmed' ? (
        <p className="vgt-apass__notice vgt-apass__notice--warn">
          Die Serverbestätigung fehlt{serverError ? `: ${serverError}` : '.'} Der lokal gesicherte Proof wird nicht
          als verifiziert angezeigt.
        </p>
      ) : null}

      {state === 'rejected' ? (
        <p className="vgt-apass__notice vgt-apass__notice--danger">
          Der Server hat den Human-Proof abgelehnt{serverError ? `: ${serverError}` : '.'} Eine erneute Verifizierung
          ist erforderlich.
        </p>
      ) : null}

      {state === 'pending' ? (
        <p className="vgt-apass__notice vgt-apass__notice--neutral">
          Human-Proof noch nicht abgeschlossen. Der Passport ist nicht human-verifiziert.
        </p>
      ) : null}

      {isOwnProfile && !verified ? (
        <footer className="vgt-apass__foot">
          <button type="button" className="btn-primary" onClick={onStartHumanProof}>
            <Icon name="fingerprint" size={16} />
            {state === 'pending' ? 'Mensch verifizieren' : 'Erneut verifizieren'}
          </button>
        </footer>
      ) : null}
    </section>
  );
}
