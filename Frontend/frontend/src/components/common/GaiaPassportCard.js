// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import DecryptedAvatar from '../chat/gsn/DecryptedAvatar';

function shortId(value, left = 6, right = 4) {
  const text = String(value || '');
  if (text.length <= left + right + 3) return text || 'UNSET';
  return `${text.slice(0, left)}...${text.slice(-right)}`;
}

function formatDate(value) {
  if (!value) return 'Nicht verifiziert';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nicht verifiziert';
  return date.toLocaleDateString();
}

export default function GaiaPassportCard({
  profile,
  trustPassport = {},
  trustSummary = null,
  humanProof = null,
  isOwnProfile = false,
  onStartHumanProof,
  className = ''
}) {
  const displayName = profile?.displayName || profile?.name || profile?.username || profile?.gaiaId || 'Gaia User';
  const gaiaId = profile?.gaiaId || profile?.gaiaID || profile?.GaiaID || '';
  const realName = profile?.realName || 'Freiwillig nicht angegeben';
  const website = profile?.website || '';
  const abuseScore = trustSummary?.abuseScore ?? trustPassport?.abuseScore?.score ?? trustPassport?.abuseScore ?? 0;
  const trustAgeDays = trustSummary?.trustAgeDays ?? trustPassport?.trustAgeDays ?? 0;
  const proofActive = Boolean(humanProof);
  const proofSuite = humanProof?.signatureSuite || (proofActive ? 'Ed25519' : 'Nicht verifiziert');
  const serial = humanProof?.challengeHash || trustPassport?.fingerprint || gaiaId;
  const mrzName = String(displayName).toUpperCase().replace(/[^A-Z0-9]+/g, '<').slice(0, 24);
  const mrzId = `${shortId(gaiaId, 18, 8).toUpperCase()}<PQ<SHA256<${proofActive ? 'HUMAN' : 'PENDING'}`;

  return (
    <section className={`gaia-passport-card ${proofActive ? 'verified' : 'unverified'} ${className}`}>
      <div className="gaia-passport-orbit" aria-hidden="true" />
      <div className="gaia-passport-topline">
        <span>GAIACOM FEDERATED IDENTITY</span>
        <strong>{proofActive ? 'HUMAN READY' : 'HUMAN PENDING'}</strong>
      </div>

      <div className="gaia-passport-main">
        <div className="gaia-passport-photo">
          <DecryptedAvatar avatarJson={profile?.avatar || ''} displayName={displayName} variant="profile" />
        </div>
        <div className="gaia-passport-fields">
          <div className="gaia-passport-field wide">
            <span>Name / Display</span>
            <strong>{displayName}</strong>
          </div>
          <div className="gaia-passport-field">
            <span>Gaia ID</span>
            <strong>{gaiaId}</strong>
          </div>
          <div className="gaia-passport-field">
            <span>Echter Name</span>
            <strong>{realName}</strong>
          </div>
          <div className="gaia-passport-field">
            <span>Trust Age</span>
            <strong>{trustAgeDays} Tage</strong>
          </div>
          <div className="gaia-passport-field">
            <span>Abuse Score</span>
            <strong>{abuseScore}</strong>
          </div>
        </div>
      </div>

      <div className="gaia-passport-strip">
        <div>
          <span>Human Proof</span>
          <strong>{proofActive ? proofSuite : 'Nicht verifiziert'}</strong>
        </div>
        <div>
          <span>Issued</span>
          <strong>{formatDate(humanProof?.completedAt)}</strong>
        </div>
        <div>
          <span>Serial</span>
          <strong>{shortId(serial, 8, 6)}</strong>
        </div>
      </div>

      <div className="gaia-passport-footer">
        <div className="gaia-passport-mrz">
          {`GC<${mrzName}`}<br />
          {mrzId}
        </div>
        {website && (
          <a className="gaia-passport-site" href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer">
            Webseite
          </a>
        )}
        {isOwnProfile && !proofActive && (
          <button type="button" className="btn-primary gaia-passport-verify-btn" onClick={onStartHumanProof}>
            Mensch verifizieren
          </button>
        )}
      </div>
    </section>
  );
}
