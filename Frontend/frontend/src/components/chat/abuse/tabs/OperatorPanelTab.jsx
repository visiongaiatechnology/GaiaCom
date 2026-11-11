import React, { useEffect, useState } from 'react';
import Icon from '../../../ui/Icon';
import CaseList from '../ui/CaseList';
import CaseStatusPill from '../ui/CaseStatusPill';
import ProfileField from '../../profile/ui/ProfileField';
import {
  categoryLabel,
  formatCaseId,
  formatDateTime,
  severityLabel
} from '../utils/abuseFormat';

/**
 * Node-operator view of the abuse queue plus manual overrides.
 *
 * The queue is the real `/node/abuse/queue` response (previously fetched and
 * discarded). The consensus threshold is computed server-side from the active
 * governance policy and node user base, so it is described instead of being
 * displayed as a hard-coded number.
 */
export default function OperatorPanelTab({
  operatorCases,
  selectedCase,
  onSelectCase,
  opTargetType,
  setOpTargetType,
  opTargetId,
  setOpTargetId,
  opSuspend,
  setOpSuspend,
  opReason,
  setOpReason,
  handleOperatorActionSubmit,
  handleSnapshotTrigger,
  busy,
  queueError,
  queueLoading,
  t
}) {
  const [impactConfirmed, setImpactConfirmed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const destructive = opSuspend === true;

  useEffect(() => {
    setImpactConfirmed(false);
  }, [opSuspend, opTargetType]);

  const statuses = Array.from(
    new Set((operatorCases || []).map(item => item.status).filter(Boolean))
  );
  const visibleCases = (operatorCases || []).filter(
    item => statusFilter === 'all' || item.status === statusFilter
  );

  return (
    <div className="vgt-abuse-split">
      <div className="vgt-abuse-list">
        <h2 className="vgt-h4">Node-Abuse-Queue</h2>
        {queueError ? (
          <div className="vgt-notice vgt-notice--danger" role="alert">
            <div>
              <strong>Node-Queue nicht verfügbar</strong>
              <p className="vgt-body vgt-body--sm">{queueError}</p>
              <p className="vgt-caption">
                Mögliche Ursache: fehlende Node-Operator-Berechtigung oder nicht erreichbarer
                Governance-Endpunkt. Es wird bewusst keine Ersatzliste angezeigt.
              </p>
            </div>
          </div>
        ) : queueLoading ? (
          <p className="vgt-empty-note" role="status">Node-Queue wird geladen …</p>
        ) : null}
        <div className="vgt-abuse-list__filter">
          <label className="input-label" htmlFor="vgt-op-status-filter">Status filtern</label>
          <select
            id="vgt-op-status-filter"
            className="input-field"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="all">Alle Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <CaseList
          cases={visibleCases}
          selectedCaseId={selectedCase?.id}
          onSelect={onSelectCase}
          emptyNote={
            statusFilter === 'all'
              ? 'Der Node meldet keine Fälle in der Abuse-Queue.'
              : 'Kein Fall entspricht dem gewählten Status.'
          }
        />
      </div>

      <div className="vgt-abuse-detail">
        {selectedCase ? (
          <section className="vgt-abuse-case" aria-labelledby="vgt-op-case-title">
            <header className="vgt-abuse-case__head">
              <div>
                <span className="vgt-eyebrow">Ausgewählter Fall</span>
                <h2 className="vgt-h3" id="vgt-op-case-title">{formatCaseId(selectedCase.id)}</h2>
              </div>
              <CaseStatusPill status={selectedCase.status} />
            </header>
            <dl className="vgt-abuse-facts">
              <div>
                <dt>Kategorie</dt>
                <dd>{categoryLabel(selectedCase.category)}</dd>
              </div>
              <div>
                <dt>Schweregrad</dt>
                <dd>{severityLabel(selectedCase.severity)}</dd>
              </div>
              <div>
                <dt>Erstellt</dt>
                <dd>{formatDateTime(selectedCase.createdAt)}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <p className="vgt-empty-note">
            Wähle links einen Fall aus, um ihn mit der manuellen Überschreibung zu bearbeiten.
          </p>
        )}

        <section className="vgt-abuse-panel" aria-labelledby="vgt-op-override-title">
          <div className="vgt-abuse-panel__head">
            <Icon name="shieldAlert" size={18} />
            <div>
              <h3 className="vgt-h4" id="vgt-op-override-title">Manuelle Überschreibung</h3>
              <p className="vgt-caption">
                Diese Aktion wird mit deiner Identität verknüpft und im Audit-Protokoll vermerkt.
              </p>
            </div>
          </div>

          <form className="vgt-abuse-form" onSubmit={handleOperatorActionSubmit}>
            <ProfileField id="vgt-op-target-type" label={t('ac_target_type') || 'Ziel-Typ'}>
              <select
                className="input-field"
                value={opTargetType}
                onChange={event => setOpTargetType(event.target.value)}
              >
                <option value="channel">Kanal sperren / entsperren</option>
                <option value="appeal">Einspruch entscheiden</option>
              </select>
            </ProfileField>

            <ProfileField
              id="vgt-op-target-id"
              label={opTargetType === 'channel' ? 'Kanal-ID (UUID)' : 'Case-ID'}
              required
            >
              <input
                type="text"
                className="input-field"
                value={opTargetId}
                onChange={event => setOpTargetId(event.target.value)}
                placeholder="UUID oder Case-ID …"
                required
              />
            </ProfileField>

            <ProfileField
              id="vgt-op-decision"
              label={opTargetType === 'channel' ? 'Status' : 'Einspruchsentscheidung'}
            >
              <select
                className="input-field"
                value={opSuspend ? 'true' : 'false'}
                onChange={event => setOpSuspend(event.target.value === 'true')}
              >
                {opTargetType === 'channel' ? (
                  <>
                    <option value="true">Sperren (Suspend)</option>
                    <option value="false">Entsperren (Reinstate)</option>
                  </>
                ) : (
                  <>
                    <option value="true">Einspruch ablehnen (Reject)</option>
                    <option value="false">Einspruch annehmen (Approve)</option>
                  </>
                )}
              </select>
            </ProfileField>

            <ProfileField
              id="vgt-op-reason"
              label="Begründung für das Audit-Protokoll"
              hint="Sachlich und nachvollziehbar; wird dauerhaft gespeichert."
              required
            >
              <textarea
                className="input-field"
                value={opReason}
                onChange={event => setOpReason(event.target.value)}
                placeholder="Begründung für das Audit Log angeben …"
                required
              />
            </ProfileField>

            {destructive ? (
              <label className="vgt-consent" htmlFor="vgt-op-impact-confirm">
                <input
                  id="vgt-op-impact-confirm"
                  type="checkbox"
                  checked={impactConfirmed}
                  onChange={event => setImpactConfirmed(event.target.checked)}
                />
                <span>
                  Mir ist bewusst, dass diese Maßnahme sofort wirksam ist:{' '}
                  {opTargetType === 'channel'
                    ? 'der Kanal wird für alle Mitglieder gesperrt.'
                    : 'der Einspruch wird endgültig abgelehnt.'}
                </span>
              </label>
            ) : null}

            <div className="vgt-profile-form__actions">
              <button type="submit" className="btn-danger" disabled={busy || (destructive && !impactConfirmed)}>
                <Icon name="alertOctagon" size={16} />
                {busy ? 'Führe aus …' : 'Maßnahme anwenden'}
              </button>
            </div>
          </form>
        </section>

        <section className="vgt-abuse-panel" aria-labelledby="vgt-op-snapshot-title">
          <div className="vgt-abuse-panel__head">
            <Icon name="activity" size={18} />
            <div>
              <h3 className="vgt-h4" id="vgt-op-snapshot-title">Transparenz-Snapshot erzeugen</h3>
              <p className="vgt-caption">
                Erzeugt einen aggregierten, signierten Snapshot des lokalen Transparenz-Protokolls und
                stellt ihn öffentlich bereit.
              </p>
            </div>
          </div>
          <div className="vgt-profile-form__actions">
            <button type="button" className="btn-primary" onClick={handleSnapshotTrigger} disabled={busy}>
              <Icon name="download" size={16} />
              {busy ? 'Erzeuge …' : 'Snapshot erzeugen & signieren'}
            </button>
          </div>
          <dl className="vgt-abuse-facts">
            <div>
              <dt>Node-Policy</dt>
              <dd>Nicht verfügbar — kein öffentlicher Policy-Endpunkt vorhanden.</dd>
            </div>
            <div>
              <dt>Konsens-Schwelle</dt>
              <dd>Wird serverseitig aus aktiver Governance-Policy und Node-Nutzungsbasis berechnet; über keine API abrufbar.</dd>
            </div>
          </dl>
        </section>

      </div>
    </div>
  );
}
