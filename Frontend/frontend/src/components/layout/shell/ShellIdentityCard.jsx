import React from 'react';
import Icon from '../../ui/Icon';
import { tr } from './shellRailFormat';

/**
 * Identity block at the top of the navigation rail.
 *
 * It shows only what the application actually knows: the active identity name,
 * its formatted Gaia address when available and the number of loaded identities.
 * There is deliberately no encryption/security status here — the rail must not
 * assert a trust state it does not receive as data (the Security Center is the
 * surface that renders measured security state). The compact action opens the
 * identity assistant and only appears while no identity exists, matching the
 * previous sidebar behaviour.
 */
export default function ShellIdentityCard({
  activeIdentity,
  identities = [],
  displayGaiaID,
  onOpenIdentityAssistant,
  t
}) {
  const rawName = activeIdentity
    ? (activeIdentity.DisplayName || activeIdentity.displayName || '')
    : '';
  const name = rawName ? `@${rawName}`.replace('@@', '@') : '@Gast';
  const rawAddress = activeIdentity ? (activeIdentity.GaiaID || activeIdentity.gaiaID || '') : '';
  const address = rawAddress && typeof displayGaiaID === 'function'
    ? displayGaiaID(rawAddress)
    : '';
  const initial = (name.replace(/^@/, '').charAt(0) || 'G').toUpperCase();
  const showAssistant = identities.length === 0;

  return (
    <section className="vgt-rail__identity" aria-label={tr(t, 'active_identity', 'Aktive Identität')}>
      <div className="vgt-identity__row">
        <span className="vgt-identity__avatar" aria-hidden="true">{initial}</span>
        <span className="vgt-identity__text">
          <span className="vgt-identity__name">{name}</span>
          {address ? <span className="vgt-identity__id">{address}</span> : null}
        </span>
      </div>

      {identities.length > 1 ? (
        <div className="vgt-identity__meta">
          <span className="vgt-identity__count">
            {identities.length} {tr(t, 'identities', 'Identitäten')}
          </span>
        </div>
      ) : null}

      {showAssistant ? (
        <button type="button" className="btn-secondary vgt-identity__action" onClick={onOpenIdentityAssistant}>
          <Icon name="fingerprint" size={16} />
          {tr(t, 'identitaets_assistent', 'Identitäts-Assistent')}
        </button>
      ) : null}
    </section>
  );
}
