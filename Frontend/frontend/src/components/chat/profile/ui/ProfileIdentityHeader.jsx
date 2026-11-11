import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../../ui/Icon';
import AvatarMark from './AvatarMark';
import { GOVERNANCE_ROLE_LABELS } from '../sectionsConfig';

/**
 * Identity header: the one stable object at the top of the workspace.
 *
 * Everything shown here comes from real props/API state. Missing values are
 * labelled as unavailable instead of being replaced by a decorative default.
 */
export default function ProfileIdentityHeader({
  activeIdentity,
  displayGaiaID,
  displayName,
  avatar,
  areKeysUnlocked,
  deviceKeyVault,
  roles,
  rolesError
}) {
  const [copyState, setCopyState] = useState('idle');
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const gaiaId = activeIdentity?.GaiaID || '';
  const formattedGaiaId = gaiaId && typeof displayGaiaID === 'function' ? displayGaiaID(gaiaId) : gaiaId;
  const identityActive = activeIdentity ? activeIdentity.IsActive !== false : null;

  const copyGaiaId = async () => {
    if (!formattedGaiaId) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(formattedGaiaId);
      setCopyState('copied');
    } catch (_) {
      setCopyState('error');
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState('idle'), 2400);
  };

  const copyLabel = copyState === 'copied'
    ? 'GaiaID kopiert'
    : copyState === 'error'
      ? 'Kopieren nicht möglich'
      : 'GaiaID kopieren';

  return (
    <header className="vgt-profile-head">
      <div className="vgt-profile-head__identity">
        <AvatarMark avatar={avatar} displayName={displayName} variant="profile" className="vgt-profile-head__avatar" />
        <div className="vgt-profile-head__text">
          <span className="vgt-eyebrow">Identität</span>
          <h1 className="vgt-h2" id="vgt-profile-title">
            {displayName || 'Unbenannte Identität'}
          </h1>
          <div className="vgt-profile-head__id">
            <code className="vgt-id">{formattedGaiaId || 'GaiaID nicht verfügbar'}</code>
            {formattedGaiaId ? (
              <button
                type="button"
                className="btn-icon"
                onClick={copyGaiaId}
                aria-label={copyLabel}
                title={copyLabel}
              >
                <Icon name={copyState === 'copied' ? 'check' : 'copy'} size={15} />
              </button>
            ) : null}
            <span className="vgt-sr-only" role="status" aria-live="polite">
              {copyState === 'copied'
                ? 'GaiaID in die Zwischenablage kopiert.'
                : copyState === 'error'
                  ? 'Kopieren in die Zwischenablage ist nicht möglich.'
                  : ''}
            </span>
          </div>
          <div className="vgt-profile-head__chips">
            {identityActive === null ? (
              <span className="vgt-status vgt-status--idle">Identität nicht geladen</span>
            ) : identityActive ? (
              <span className="vgt-status vgt-status--ok">Identität aktiv</span>
            ) : (
              <span className="vgt-status vgt-status--warn">Identität inaktiv</span>
            )}
            {rolesError ? (
              <span className="vgt-status vgt-status--idle">Rollen nicht verfügbar</span>
            ) : roles && roles.length > 0 ? (
              roles.map(role => (
                <span className="vgt-status vgt-status--signed" key={role}>
                  {GOVERNANCE_ROLE_LABELS[role] || role}
                </span>
              ))
            ) : (
              <span className="vgt-status vgt-status--idle">Keine Governance-Rolle</span>
            )}
          </div>
        </div>
      </div>

      <dl className="vgt-profile-head__facts">
        <div>
          <dt>Lokale Schlüssel</dt>
          <dd className={areKeysUnlocked ? 'is-ok' : 'is-idle'}>
            {areKeysUnlocked ? 'Entsperrt' : 'Gesperrt'}
          </dd>
        </div>
        <div>
          <dt>Geräteschlüssel</dt>
          <dd className={deviceKeyVault?.deviceKeyId ? 'is-ok' : 'is-idle'}>
            {deviceKeyVault?.deviceKeyId ? 'Registriert' : 'Nicht registriert'}
          </dd>
        </div>
      </dl>
    </header>
  );
}
