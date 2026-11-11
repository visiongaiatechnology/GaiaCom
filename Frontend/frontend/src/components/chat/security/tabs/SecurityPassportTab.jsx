import React from 'react';
import Icon from '../../../ui/Icon';
import GaiaPassportCard from '../../../common/GaiaPassportCard';
import VerificationBadges from '../../../common/VerificationBadges';
import { unavailable } from '../utils/securityFormat';

/**
 * Gaia Passport tab.
 *
 * The passport card is rendered only when the server actually returned a
 * passport. Previously a zero-valued fallback object was passed in, which
 * displayed "Trust Age 0 Tage / Abuse Score 0" as if it were measured data.
 */
export default function SecurityPassportTab({
  activeIdentity,
  derivedKeys,
  humanProof,
  trustPassport,
  passportError,
  onOpenHumanProof,
  onRefresh,
  t
}) {
  const fingerprint = derivedKeys?.sign?.public || '';
  const displayName = activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.GaiaID || '';
  // SEC-FE FE-09: only a server-validated proof may be labelled "Serverbestätigt";
  // a local-only proof must state its provenance instead of looking verified.
  // Mirrors GaiaPassportCard.resolveTrustState: a live server passport wins, and a
  // locally stored record counts only when the dialog persisted serverVerified=true
  // (never when the server rejected it).
  const liveVerified =
    (trustPassport?.isHumanVerified === true && Boolean(trustPassport?.humanProof));
  const localServerVerified =
    humanProof?.serverVerified === true && humanProof?.serverConfirmation !== 'rejected';
  const proofRejected = humanProof?.serverConfirmation === 'rejected';
  const serverVerified = liveVerified || localServerVerified;
  const proofStatusLabel = serverVerified
    ? 'Serverbestätigt'
    : proofRejected
      ? 'Vom Server abgelehnt'
      : (humanProof ? 'Lokal erstellt, nicht serverbestätigt' : 'Nicht verifiziert');

  return (
    <div className="vgt-sec-passport">
      <div className="vgt-sec-passport__card">
        {trustPassport ? (
          <GaiaPassportCard
            profile={{
              displayName,
              gaiaId: activeIdentity?.GaiaID,
              avatar: ''
            }}
            trustPassport={trustPassport}
            humanProof={humanProof}
            isOwnProfile
            onStartHumanProof={onOpenHumanProof}
          />
        ) : (
          <section className="vgt-sec-unavailable" aria-labelledby="vgt-passport-unavailable-title">
            <span className="vgt-sec-unavailable__mark" aria-hidden="true">
              <Icon name="seal" size={24} />
            </span>
            <h2 className="vgt-h4" id="vgt-passport-unavailable-title">Trust Passport {unavailable(t)}</h2>
            <p className="vgt-body vgt-body--sm">
              {passportError || 'Der Server hat keinen Trust Passport für diese Identität zurückgegeben.'}
            </p>
            <dl className="vgt-sec-proof-list">
              <div>
                <dt>{t('onboarding_sec_identity_title') || 'Identität'}</dt>
                <dd>{activeIdentity?.GaiaID || unavailable(t)}</dd>
              </div>
              <div>
                <dt>Signatur-Fingerprint</dt>
                <dd className="vgt-mono">{fingerprint || unavailable(t)}</dd>
              </div>
              <div>
                <dt>Human Proof</dt>
                <dd>{proofStatusLabel}</dd>
              </div>
            </dl>
            <div className="vgt-profile-form__actions">
              <button type="button" className="btn-secondary" onClick={onRefresh}>
                <Icon name="refresh" size={14} />
                Erneut laden
              </button>
            </div>
          </section>
        )}
      </div>

      <section className="vgt-sec-proof" aria-labelledby="vgt-sec-proof-title">
        <span className="vgt-eyebrow">{t('sc_human_proof_poc') || 'Human Proof PoC'}</span>
        <h2 className="vgt-h4" id="vgt-sec-proof-title">{t('sc_sha256_ceremony') || 'SHA-256 Ceremony'}</h2>
        <p className="vgt-body vgt-body--sm">
          {t('sc_ceremony_desc') ||
            'Die Ceremony läuft lokal im Browser-Worker, wird mit deinem Identitätsschlüssel signiert und nach Serverprüfung im Trust Passport gespeichert.'}
        </p>
        <dl className="vgt-sec-proof-list">
          <div>
            <dt>{t('sc_col_status') || 'Status'}</dt>
            <dd>{proofStatusLabel}</dd>
          </div>
          <div>
            <dt>{t('sc_algorithm') || 'Algorithmus'}</dt>
            <dd>{t('sc_sha256_pow_desc') || 'SHA-256 chained proof-of-work'}</dd>
          </div>
          <div>
            <dt>{t('sc_signature') || 'Signatur'}</dt>
            <dd>{t('sc_ed25519_desc') || 'Ed25519 Identity Key'}</dd>
          </div>
          <div>
            <dt>{t('sc_scope') || 'Scope'}</dt>
            <dd>{t('sc_scope_desc') || 'Node-gespeicherter Gaia Passport'}</dd>
          </div>
          {humanProof?.challengeHash ? (
            <div>
              <dt>Proof-ID</dt>
              <dd className="vgt-mono vgt-sec-proof__hash">{humanProof.challengeHash}</dd>
            </div>
          ) : null}
        </dl>
        <div className="vgt-profile-form__actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenHumanProof}
            disabled={!activeIdentity || !derivedKeys}
          >
            <Icon name="verified" size={16} />
            {serverVerified
              ? (t('sc_btn_renew_human_proof') || 'Human Proof erneuern')
              : humanProof
                ? 'Serverbestätigung erneut versuchen'
                : (t('sc_btn_verify_human') || 'Ich bin ein Mensch verifizieren')}
          </button>
        </div>
      </section>

      <section className="vgt-sec-proof" aria-labelledby="vgt-sec-attestations-title">
        <span className="vgt-eyebrow">Attestierungen</span>
        <h2 className="vgt-h4" id="vgt-sec-attestations-title">Verifizierungs-Abzeichen</h2>
        <p className="vgt-body vgt-body--sm">
          Abzeichen sind signierte Aussagen eines Ausstellers (z. B. deines Node-Operators),
          keine globale Garantie. Der Client prüft Signatur, Ablauf und Widerruf lokal.
        </p>
        <div className="vgt-sec-attestations">
          <VerificationBadges
            gaiaID={activeIdentity?.GaiaID}
            showIssuer
            showExpired
          />
        </div>
        <p className="vgt-caption">
          Noch keine Abzeichen sichtbar? Dein Node-Operator kann Mensch-, Organisations- oder
          Rollen-Abzeichen ausstellen; jede Ausstellung wird mit Aussteller und Ablauf angezeigt.
        </p>
      </section>
    </div>
  );
}
