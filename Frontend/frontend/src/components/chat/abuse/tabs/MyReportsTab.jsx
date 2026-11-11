import React from 'react';
import Icon from '../../../ui/Icon';
import CaseList from '../ui/CaseList';
import CaseStatusPill from '../ui/CaseStatusPill';
import DisclosurePanel from '../ui/DisclosurePanel';
import ProfileField from '../../profile/ui/ProfileField';
import {
  UNAVAILABLE,
  categoryLabel,
  formatCaseId,
  formatDateTime,
  severityLabel
} from '../utils/abuseFormat';

/**
 * Reporter view: own reports with master/detail layout, the real decision text
 * and the existing appeal flow. No fabricated queue counts.
 */
export default function MyReportsTab({
  myReports,
  selectedCase,
  caseDetail,
  onSelectCase,
  appealReason,
  setAppealReason,
  appealStatement,
  setAppealStatement,
  handleAppealSubmit,
  busy,
  disclosure,
  t
}) {
  const canAppeal = selectedCase?.status === 'actioned' || selectedCase?.status === 'closed';
  const appeal = caseDetail?.appeal;

  return (
    <div className="vgt-abuse-split">
      <div className="vgt-abuse-list">
        <h2 className="vgt-h4">
          {t('ac_reported_cases') || 'Gemeldete Fälle'}
        </h2>
        <CaseList
          cases={myReports}
          selectedCaseId={selectedCase?.id}
          onSelect={onSelectCase}
          emptyNote={
            t('ac_no_reports') ||
            'Sie haben noch keine Meldungen eingereicht. Meldungen entstehen über die Meldefunktion an Nachrichten und Inhalten.'
          }
        />
      </div>

      <div className="vgt-abuse-detail">
        {selectedCase ? (
          <article className="vgt-abuse-case" aria-labelledby="vgt-my-case-title">
            <header className="vgt-abuse-case__head">
              <div>
                <span className="vgt-eyebrow">Fall</span>
                <h2 className="vgt-h3" id="vgt-my-case-title">{formatCaseId(selectedCase.id)}</h2>
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
              <div>
                <dt>Entscheidung</dt>
                <dd>{selectedCase.decision || 'Noch keine Entscheidung'}</dd>
              </div>
            </dl>

            {canAppeal ? (
              <section className="vgt-abuse-panel" aria-labelledby="vgt-appeal-title">
                <div className="vgt-abuse-panel__head">
                  <Icon name="reply" size={18} />
                  <h3 className="vgt-h4" id="vgt-appeal-title">
                    {t('ac_appeal_submit') || 'Einspruch einlegen'}
                  </h3>
                </div>
                {appeal ? (
                  <dl className="vgt-abuse-facts">
                    <div>
                      <dt>{t('ac_appeal_status') || 'Status des Einspruchs'}</dt>
                      <dd>{appeal.status || UNAVAILABLE}</dd>
                    </div>
                    {appeal.decisionReason ? (
                      <div>
                        <dt>Begründung</dt>
                        <dd>{appeal.decisionReason}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <form className="vgt-abuse-form" onSubmit={handleAppealSubmit}>
                    <ProfileField
                      id="vgt-appeal-reason"
                      label={t('ac_appeal_reason') || 'Grund für den Einspruch'}
                    >
                      <select
                        className="input-field"
                        value={appealReason}
                        onChange={event => setAppealReason(event.target.value)}
                      >
                        <option value="false_positive">Fälschliche Meldung (False Positive)</option>
                        <option value="wrong_identity">Falsche Identität</option>
                        <option value="context_missing">Kontext fehlt</option>
                        <option value="other">Sonstiges</option>
                      </select>
                    </ProfileField>
                    <ProfileField
                      id="vgt-appeal-statement"
                      label={t('ac_appeal_statement') || 'Stellungnahme'}
                      hint="Sachliche Begründung; sie wird dem Fallprotokoll hinzugefügt."
                      required
                    >
                      <textarea
                        className="input-field"
                        value={appealStatement}
                        onChange={event => setAppealStatement(event.target.value)}
                        placeholder="Beschreiben Sie sachlich, warum die Maßnahme aufgehoben werden sollte …"
                        required
                      />
                    </ProfileField>
                    <div className="vgt-profile-form__actions">
                      <button type="submit" className="btn-primary" disabled={busy}>
                        {busy ? 'Sende …' : 'Einspruch einreichen'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            ) : null}

            {caseDetail ? <DisclosurePanel {...disclosure} caseDetail={caseDetail} /> : null}
          </article>
        ) : (
          <p className="vgt-empty-note">
            Wähle links eine Meldung, um Status, Entscheidung und den weiteren Verlauf zu sehen.
          </p>
        )}
      </div>
    </div>
  );
}
