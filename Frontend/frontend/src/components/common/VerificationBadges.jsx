import React from 'react';
import Icon from '../ui/Icon';
import useAttestations from '../../hooks/useAttestations';
import { describeAttestationType, formatAttestationDate } from '../../utils/attestations';

/**
 * Issuer-attributed verification badges for an identity.
 *
 * Rendering rules (truthfulness):
 * - only signature-verified, currently valid attestations get the "valid" look
 * - expired / revoked / invalid-signature entries are shown muted/danger or
 *   hidden from the compact variant — never as a green check
 * - the tooltip/aria-label always names the issuer and the expiry, because a
 *   badge is a claim by an issuer, not a global truth
 */
function issuerLabel(issuerGaiaID) {
  const raw = String(issuerGaiaID || '').replace(/^@+/, '');
  if (!raw) return 'unbekannter Aussteller';
  const [, domain] = raw.split(/[:@]/);
  return domain || raw;
}

function buildTitle(record) {
  const meta = record.typeMeta || describeAttestationType(record.type);
  const issuer = issuerLabel(record.issuer_gaia_id || record.issuer);
  const expiry = record.expires_at ? `, gültig bis ${formatAttestationDate(record.expires_at)}` : '';
  if (record.isRevoked) return `${meta.label} · widerrufen (Aussteller: ${issuer})`;
  if (record.isExpired) return `${meta.label} · abgelaufen (Aussteller: ${issuer}${expiry})`;
  if (!record.signatureValid) return `${meta.label} · Signatur nicht gegen den Node-Schlüssel bestätigt (Aussteller: ${issuer})`;
  return `${meta.label} · Signatur gültig · Aussteller: ${issuer}${expiry}`;
}

export function AttestationBadge({ record, compact = false, showIssuer = false }) {
  const meta = record.typeMeta || describeAttestationType(record.type);
  const title = buildTitle(record);
  const tone = record.tone || 'valid';
  return (
    <span
      className={`vgt-attest-badge vgt-attest-badge--${tone}${compact ? ' is-compact' : ''}`}
      title={title}
      aria-label={title}
      role="img"
    >
      <Icon name={meta.icon} size={compact ? 13 : 14} aria-hidden="true" />
      {compact ? null : <span className="vgt-attest-badge__label">{meta.short}</span>}
      {!compact && showIssuer ? (
        <span className="vgt-attest-badge__issuer">{issuerLabel(record.issuer_gaia_id || record.issuer)}</span>
      ) : null}
    </span>
  );
}

export default function VerificationBadges({
  gaiaID,
  attestations,
  loading,
  compact = false,
  showIssuer = false,
  showExpired = false,
  className = ''
}) {
  const hookState = useAttestations(attestations ? '' : gaiaID);
  const list = Array.isArray(attestations) ? attestations : hookState.attestations;
  const isLoading = typeof loading === 'boolean' ? loading : (!attestations && hookState.loading);
  if (isLoading || !Array.isArray(list) || list.length === 0) return null;

  const visible = list.filter(record => {
    if (record.status === 'valid' && record.signatureValid) return true;
    return showExpired;
  });
  if (visible.length === 0) return null;

  return (
    <span className={['vgt-attest-badges', className].filter(Boolean).join(' ')}>
      {visible.map(record => (
        <AttestationBadge
          key={record.id || `${record.type}-${record.issued_at || ''}`}
          record={record}
          compact={compact}
          showIssuer={showIssuer}
        />
      ))}
    </span>
  );
}
