import React from 'react';
import Icon from '../../ui/Icon';

/**
 * Verified-channel badge (server truth only).
 *
 * `channel.isVerified` comes from the persisted channel record
 * (`public_channels.is_verified`, set by the role-gated node-operator action in
 * Backend/governance/service.go `NodeOperatorVerifyChannel`). The verifying
 * authority is resolved from the live credential registry, never from a static
 * file. When the registry is unreachable the UI says "Verifizierung nicht
 * verfügbar" instead of inventing an operator identity.
 */
export default function ChannelVerificationBadge({ channel, verification, ct, displayGaiaID }) {
  if (!channel?.isVerified) return null;

  const status = verification?.status || 'loading';
  const operators = verification?.operators || [];
  const unavailableTitle = verification?.error
    ? `Registry nicht lesbar: ${verification.error}`
    : 'Die Verifizierungs-Registry ist aktuell nicht erreichbar.';

  if (status === 'loading' || status === 'idle') {
    return (
      <span className="vgt-status vgt-status--idle" role="status">
        <Icon name="spinner" size={12} />
        Verifizierung wird geprüft
      </span>
    );
  }

  if (status === 'denied') {
    return (
      <span className="vgt-status vgt-status--warn" title="Keine Berechtigung, die Verifizierungs-Registry zu lesen.">
        <Icon name="shieldAlert" size={12} />
        Verifizierung nicht verfügbar
      </span>
    );
  }

  if (status === 'unavailable') {
    return (
      <span className="vgt-status vgt-status--warn" title={unavailableTitle}>
        <Icon name="shieldAlert" size={12} />
        Verifizierung nicht verfügbar
      </span>
    );
  }

  if (operators.length === 0) {
    return (
      <span
        className="vgt-status vgt-status--warn"
        title="Der Kanal ist serverseitig als verifiziert markiert, aber in der aktuellen Registry ist kein gültiger Node-Operator-Credential vorhanden."
      >
        <Icon name="shieldAlert" size={12} />
        Verifiziert – Aussteller nicht in der Registry
      </span>
    );
  }

  const primary = operators[0];
  const primaryLabel = displayGaiaID(primary.gaiaId);
  const extra = operators.length - 1;
  const credentialDetail = operators
    .map(operator => `${displayGaiaID(operator.gaiaId)} (Issuer: ${operator.issuer || 'unbekannt'}, gültig bis ${operator.validUntil || 'unbekannt'})`)
    .join(' · ');

  return (
    <span className="vgt-badge vgt-badge--seal" title={`Live-Credential-Registry · ${credentialDetail}`}>
      <Icon name="seal" size={14} />
      {String(ct('verified_by')).replace(/^[^A-Za-zÄÖÜäöü]+/, '').trim()} {primaryLabel}
      {extra > 0 ? ` +${extra}` : ''}
    </span>
  );
}
