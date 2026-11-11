import React from 'react';
import Icon from '../../../ui/Icon';
import ProfileField from '../../profile/ui/ProfileField';
import { DISCLOSURE_ROLE_LABELS, UNAVAILABLE, formatDateTime } from '../utils/abuseFormat';

/**
 * Voluntary, case-scoped disclosure (GaiasEyesKey).
 *
 * Evidence is only listed when the case detail actually contains disclosures or
 * requests. Signatures are not verified client-side here, so no "valid proof"
 * claim is rendered — only the returned hashes and roles.
 */
export default function DisclosurePanel({
  caseDetail,
  busy,
  disclosureRole,
  setDisclosureRole,
  disclosurePackageText,
  setDisclosurePackageText,
  gaiasEyesTTL,
  setGaiasEyesTTL,
  gaiasEyesKey,
  requestTargetRole,
  setRequestTargetRole,
  requestReason,
  setRequestReason,
  handleDisclosureSubmit,
  handleCreateGaiasEyesKey,
  handleRequestDisclosure,
  isReviewer,
  isOperator
}) {
  const disclosures = Array.isArray(caseDetail?.disclosures) ? caseDetail.disclosures : [];
  const disclosureRequests = Array.isArray(caseDetail?.disclosureRequests) ? caseDetail.disclosureRequests : [];
  const canRequestDisclosure = isReviewer || isOperator;

  return (
    <section className="vgt-abuse-panel" aria-labelledby="vgt-disclosure-title">
      <div className="vgt-abuse-panel__head">
        <Icon name="eye" size={18} />
        <div>
          <h3 className="vgt-h4" id="vgt-disclosure-title">GaiasEyesKey / Mutual Disclosure</h3>
          <p className="vgt-caption">
            Freiwillige, fallbezogene Beweispakete. Kein Account-Zugang, kein Senden, kein Löschen.
          </p>
        </div>
      </div>

      {disclosures.length > 0 ? (
        <div className="vgt-abuse-evidence">
          <h4 className="vgt-label">Freigegebene Pakete ({disclosures.length})</h4>
          <ul className="vgt-row-list">
            {disclosures.map(item => (
              <li className="vgt-row" key={item.id}>
                <div className="vgt-row__main">
                  <strong>{DISCLOSURE_ROLE_LABELS[item.disclosureRole] || item.disclosureRole}</strong>
                  <span className="vgt-row__meta vgt-mono">{item.ownerIdentity || 'Identität nicht angegeben'}</span>
                </div>
                <code className="vgt-id">{item.packageHash || UNAVAILABLE}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {disclosureRequests.length > 0 ? (
        <div className="vgt-abuse-evidence">
          <h4 className="vgt-label">Offenlegungsanfragen ({disclosureRequests.length})</h4>
          <ul className="vgt-row-list">
            {disclosureRequests.map(item => (
              <li className="vgt-row" key={item.id}>
                <div className="vgt-row__main">
                  <strong>{DISCLOSURE_ROLE_LABELS[item.targetRole] || item.targetRole}</strong>
                  <span className="vgt-row__meta">{item.reason || 'Kein Grund angegeben'}</span>
                </div>
                <span className="vgt-status vgt-status--idle">{item.status || UNAVAILABLE}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canRequestDisclosure ? (
        <div className="vgt-abuse-panel__inner">
          <h4 className="vgt-label">Offenlegung anfragen</h4>
          <div className="vgt-abuse-form-row">
            <ProfileField id="vgt-disclosure-request-role" label="Anfrage an">
              <select
                className="input-field"
                value={requestTargetRole}
                onChange={event => setRequestTargetRole(event.target.value)}
              >
                <option value="reporter">Melder</option>
                <option value="reported">Gemeldeter</option>
                <option value="owner">Owner</option>
                <option value="authority">Behörden-/Rechtsstelle</option>
              </select>
            </ProfileField>
            <ProfileField id="vgt-disclosure-request-reason" label="Anfragegrund">
              <input
                type="text"
                className="input-field"
                value={requestReason}
                onChange={event => setRequestReason(event.target.value)}
              />
            </ProfileField>
          </div>
          <div className="vgt-profile-form__actions">
            <button type="button" className="btn-secondary" disabled={busy} onClick={handleRequestDisclosure}>
              <Icon name="send" size={15} />
              Offenlegung anfragen
            </button>
          </div>
        </div>
      ) : null}

      <form className="vgt-abuse-panel__inner" onSubmit={handleDisclosureSubmit}>
        <h4 className="vgt-label">Beweispaket einreichen</h4>
        <div className="vgt-abuse-form-row">
          <ProfileField id="vgt-disclosure-role" label="Disclosure-Rolle">
            <select
              className="input-field"
              value={disclosureRole}
              onChange={event => setDisclosureRole(event.target.value)}
            >
              <option value="reporter">Melder</option>
              <option value="reported">Gemeldeter</option>
              <option value="owner">Eigener Nachweis</option>
              <option value="authority">Behörden-/Rechtsnachweis</option>
              <option value="other">Sonstiges</option>
            </select>
          </ProfileField>
          <ProfileField id="vgt-disclosure-ttl" label="GaiasEyesKey TTL">
            <select
              className="input-field"
              value={gaiasEyesTTL}
              onChange={event => setGaiasEyesTTL(Number(event.target.value))}
            >
              <option value={300}>5 Minuten</option>
              <option value={900}>15 Minuten</option>
              <option value={3600}>1 Stunde</option>
              <option value={86400}>24 Stunden</option>
            </select>
          </ProfileField>
        </div>

        <ProfileField
          id="vgt-disclosure-package"
          label="Signiertes JSON-Beweispaket"
          hint="Muss ein JSON-Objekt sein; die Signatur wird serverseitig geprüft."
        >
          <textarea
            className="input-field vgt-mono"
            value={disclosurePackageText}
            onChange={event => setDisclosurePackageText(event.target.value)}
            spellCheck="false"
            rows={8}
          />
        </ProfileField>

        <div className="vgt-profile-form__actions">
          <button type="submit" className="btn-secondary" disabled={busy}>
            <Icon name="paperclip" size={15} />
            Disclosure dem Fall anhängen
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={handleCreateGaiasEyesKey}>
            <Icon name="key" size={15} />
            GaiasEyesKey erzeugen
          </button>
        </div>
      </form>

      {gaiasEyesKey ? (
        <dl className="vgt-abuse-evidence vgt-abuse-evidence--key">
          <div>
            <dt>Typ</dt>
            <dd>{gaiasEyesKey.type || UNAVAILABLE}</dd>
          </div>
          <div>
            <dt>Gültig bis</dt>
            <dd>{formatDateTime(gaiasEyesKey.expiresAt)}</dd>
          </div>
          <div>
            <dt>Einmal-Token</dt>
            <dd className="vgt-mono vgt-break">{gaiasEyesKey.token || UNAVAILABLE}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
