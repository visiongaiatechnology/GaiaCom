import React, { useEffect, useState } from 'react';
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
  parseJsonRecord,
  recommendationLabel,
  severityLabel
} from '../utils/abuseFormat';

const IMPACTFUL_ACTIONS = new Set(['quarantine', 'suspend', 'timeout']);

/**
 * Reviewer queue.
 *
 * The case detail only shows evidence the server returned (comment, message
 * hash, disclosure packages, reviews, appeal, audit events). Signature
 * verification is performed server-side and is not claimed here.
 */
export default function ReviewerQueueTab({
  reviewerCases,
  selectedCase,
  caseDetail,
  onSelectCase,
  reviewCategory,
  setReviewCategory,
  reviewSeverity,
  setReviewSeverity,
  reviewAction,
  setReviewAction,
  reviewReason,
  setReviewReason,
  handleReviewSubmit,
  busy,
  disclosure,
  t
}) {
  const [impactConfirmed, setImpactConfirmed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const requiresImpactConfirmation = IMPACTFUL_ACTIONS.has(reviewAction);

  useEffect(() => {
    setImpactConfirmed(false);
  }, [reviewAction, selectedCase?.id]);

  const statuses = Array.from(
    new Set((reviewerCases || []).map(item => item.status).filter(Boolean))
  );
  const visibleCases = (reviewerCases || []).filter(
    item => statusFilter === 'all' || item.status === statusFilter
  );

  const caseRecord = caseDetail?.case;
  const reviews = Array.isArray(caseDetail?.reviews) ? caseDetail.reviews : [];
  const auditEvents = Array.isArray(caseDetail?.events) ? caseDetail.events : [];
  const appeal = caseDetail?.appeal;
  const proofComment = parseJsonRecord(caseRecord?.gaiaProof, {})?.comment;
  const proofVerdict = typeof caseRecord?.proofVerified === 'boolean'
    ? caseRecord.proofVerified
    : (typeof caseDetail?.proofVerified === 'boolean' ? caseDetail.proofVerified : null);
  const proofSuite = caseRecord?.proofSuite || caseDetail?.proofSuite || '';
  const proofScope = caseRecord?.proofScope || caseDetail?.proofScope || '';
  // The backend decides what it can actually verify (proofScope). The UI must
  // render exactly that scope and never imply a signature verification that the
  // stored data cannot support.
  const proofSummary = proofVerdict === null
    ? 'Kein serverseitiges Urteil vorhanden'
    : proofScope === 'integrity-hash'
      ? `${proofVerdict ? 'Integrität bestätigt (Hash-Bindung)' : 'Integrität fehlgeschlagen'}${proofSuite ? ` · ${proofSuite}` : ''}`
      : `${proofVerdict ? 'Gültig' : 'Ungültig'}${proofSuite ? ` (${proofSuite})` : ''}`;
  const proofScopeLabel = proofScope === 'integrity-hash'
    ? 'Hash-Bindung der gespeicherten Falldaten (keine Signaturprüfung hinterlegt)'
    : proofScope === 'unparseable'
      ? 'Proof-Daten nicht lesbar'
      : 'Kein Prüfumfang verfügbar';

  return (
    <div className="vgt-abuse-split">
      <div className="vgt-abuse-list">
        <h2 className="vgt-h4">Offene Meldungen</h2>
        <div className="vgt-abuse-list__filter">
          <label className="input-label" htmlFor="vgt-review-status-filter">Status filtern</label>
          <select
            id="vgt-review-status-filter"
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
              ? 'Keine ausstehenden Fälle in der Warteschlange.'
              : 'Kein Fall entspricht dem gewählten Status.'
          }
        />
      </div>

      <div className="vgt-abuse-detail">
        {selectedCase && caseDetail ? (
          <article className="vgt-abuse-case" aria-labelledby="vgt-review-case-title">
            <header className="vgt-abuse-case__head">
              <div>
                <span className="vgt-eyebrow">Minimierte Fallansicht</span>
                <h2 className="vgt-h3" id="vgt-review-case-title">{formatCaseId(selectedCase.id)}</h2>
              </div>
              <CaseStatusPill status={caseRecord?.status || selectedCase.status} />
            </header>

            <dl className="vgt-abuse-facts">
              <div>
                <dt>Kategorie</dt>
                <dd>{categoryLabel(caseRecord?.category || selectedCase.category)}</dd>
              </div>
              <div>
                <dt>Schweregrad</dt>
                <dd>{severityLabel(caseRecord?.severity || selectedCase.severity)}</dd>
              </div>
              <div>
                <dt>Gemeldet auf Node</dt>
                <dd>{caseRecord?.reportedNode || UNAVAILABLE}</dd>
              </div>
              <div>
                <dt>Gemeldeter Inhalt (Hash)</dt>
                <dd className="vgt-mono vgt-break">{caseRecord?.reportedIdentityHash || UNAVAILABLE}</dd>
              </div>
              <div>
                <dt>Nachrichten-Hash</dt>
                <dd className="vgt-mono vgt-break">{caseRecord?.messageHash || UNAVAILABLE}</dd>
              </div>
              <div>
                <dt>Proof-Prüfung</dt>
                <dd>{proofSummary}</dd>
              </div>
              <div>
                <dt>Prüfumfang</dt>
                <dd>{proofScopeLabel}</dd>
              </div>
              <div>
                <dt>Erstellt</dt>
                <dd>{formatDateTime(caseRecord?.createdAt || selectedCase.createdAt)}</dd>
              </div>
            </dl>

            {proofComment ? (
              <section className="vgt-abuse-panel" aria-labelledby="vgt-report-comment-title">
                <div className="vgt-abuse-panel__head">
                  <Icon name="chat" size={18} />
                  <h3 className="vgt-h4" id="vgt-report-comment-title">Meldekommentar des Nutzers</h3>
                </div>
                <p className="vgt-body vgt-body--sm">{proofComment}</p>
              </section>
            ) : null}

            {appeal ? (
              <section className="vgt-abuse-panel" aria-labelledby="vgt-review-appeal-title">
                <div className="vgt-abuse-panel__head">
                  <Icon name="reply" size={18} />
                  <h3 className="vgt-h4" id="vgt-review-appeal-title">Einspruch eingereicht</h3>
                </div>
                <dl className="vgt-abuse-facts">
                  <div>
                    <dt>Grund</dt>
                    <dd>{appeal.reason || UNAVAILABLE}</dd>
                  </div>
                  <div>
                    <dt>Aussage</dt>
                    <dd>{appeal.statement || UNAVAILABLE}</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            {reviews.length > 0 ? (
              <section className="vgt-abuse-panel" aria-labelledby="vgt-review-existing-title">
                <div className="vgt-abuse-panel__head">
                  <Icon name="users" size={18} />
                  <h3 className="vgt-h4" id="vgt-review-existing-title">
                    Bestehende Reviews ({reviews.length})
                  </h3>
                </div>
                <ul className="vgt-row-list">
                  {reviews.map(review => (
                    <li className="vgt-row" key={review.id}>
                      <div className="vgt-row__main">
                        <strong>Reviewer {formatCaseId(review.reviewerIdentity)}</strong>
                        <span className="vgt-row__meta">
                          Empfehlung: {recommendationLabel(review.recommendation)} · Kategorie: {categoryLabel(review.categoryVote)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {auditEvents.length > 0 ? (
              <section className="vgt-abuse-panel" aria-labelledby="vgt-case-audit-title">
                <div className="vgt-abuse-panel__head">
                  <Icon name="activity" size={18} />
                  <h3 className="vgt-h4" id="vgt-case-audit-title">Fallprotokoll</h3>
                </div>
                <ul className="vgt-row-list">
                  {auditEvents.map(event => (
                    <li className="vgt-row" key={event.id}>
                      <div className="vgt-row__main">
                        <strong>{event.eventType || UNAVAILABLE}</strong>
                        <span className="vgt-row__meta">{event.details || 'Keine Details protokolliert.'}</span>
                      </div>
                      <span className="vgt-caption vgt-numeric">{formatDateTime(event.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <DisclosurePanel {...disclosure} caseDetail={caseDetail} />

            {(caseRecord?.status || selectedCase.status) !== 'closed' ? (
              <section className="vgt-abuse-panel" aria-labelledby="vgt-review-form-title">
                <div className="vgt-abuse-panel__head">
                  <Icon name="shieldCheck" size={18} />
                  <h3 className="vgt-h4" id="vgt-review-form-title">Eigene Fallprüfung abgeben</h3>
                </div>
                <p className="vgt-caption">
                  Das Review wird signiert an den Fall übermittelt. Empfehlungen mit Sperr- oder
                  Quarantäne-Wirkung werden erst nach ausdrücklicher Bestätigung gesendet.
                </p>
                <form className="vgt-abuse-form" onSubmit={handleReviewSubmit}>
                  <div className="vgt-abuse-form-row">
                    <ProfileField id="vgt-review-category" label="Kategorie-Stimme">
                      <select
                        className="input-field"
                        value={reviewCategory}
                        onChange={event => setReviewCategory(event.target.value)}
                      >
                        <option value="spam">Spam / Abuse</option>
                        <option value="phishing">Betrug / Phishing</option>
                        <option value="malware">Malware / Angriff</option>
                        <option value="harassment">Belästigung</option>
                        <option value="illegal_content">Illegale Inhalte</option>
                        <option value="threat">Akute Bedrohung</option>
                        <option value="other">Sonstiges</option>
                      </select>
                    </ProfileField>
                    <ProfileField id="vgt-review-severity" label="Schweregrad-Stimme">
                      <select
                        className="input-field"
                        value={reviewSeverity}
                        onChange={event => setReviewSeverity(event.target.value)}
                      >
                        <option value="low">Niedrig</option>
                        <option value="medium">Mittel</option>
                        <option value="high">Hoch</option>
                        <option value="critical">Kritisch</option>
                      </select>
                    </ProfileField>
                  </div>

                  <ProfileField
                    id="vgt-review-action"
                    label="Moderations-Empfehlung"
                    hint="Empfehlungen werden serverseitig gewichtet; diese Stimme allein sperrt nichts."
                  >
                    <select
                      className="input-field"
                      value={reviewAction}
                      onChange={event => setReviewAction(event.target.value)}
                    >
                      <option value="warn">Warnen / Freigeben (Warnlabel)</option>
                      <option value="quarantine">In Quarantäne verschieben</option>
                      <option value="suspend">Kanal / Inhalt sperren (Suspension)</option>
                      <option value="reject">Meldung ablehnen (False Report)</option>
                    </select>
                  </ProfileField>

                  <ProfileField
                    id="vgt-review-reason"
                    label="Sachliche Begründung (öffentlich im Log)"
                    hint="Objektiv, ausschließlich auf Basis der vorliegenden Nachweise."
                    required
                  >
                    <textarea
                      className="input-field"
                      value={reviewReason}
                      onChange={event => setReviewReason(event.target.value)}
                      placeholder="Geben Sie eine objektive Begründung basierend auf den Proofs an …"
                      required
                    />
                  </ProfileField>

                  {requiresImpactConfirmation ? (
                    <label className="vgt-consent" htmlFor="vgt-review-impact-confirm">
                      <input
                        id="vgt-review-impact-confirm"
                        type="checkbox"
                        checked={impactConfirmed}
                        onChange={event => setImpactConfirmed(event.target.checked)}
                      />
                      <span>
                        Mir ist bewusst, dass die Empfehlung „{recommendationLabel(reviewAction)}“ Inhalte
                        oder Kanäle sperren kann und als signiertes Review im Fallprotokoll bleibt.
                      </span>
                    </label>
                  ) : null}

                  <div className="vgt-profile-form__actions">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={busy || (requiresImpactConfirmation && !impactConfirmed)}
                    >
                      {busy ? 'Signiere …' : 'Review signieren & abschicken'}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <p className="vgt-empty-note">Dieser Fall ist geschlossen; neue Reviews sind nicht mehr möglich.</p>
            )}
          </article>
        ) : (
          <p className="vgt-empty-note">
            Wähle links eine Meldung zur Prüfung aus. Die Detailansicht erscheint erst, wenn der
            Server die minimierte Fallansicht freigibt.
          </p>
        )}
      </div>
    </div>
  );
}
