import React from 'react';
import AbuseHead from './abuse/ui/AbuseHead';
import MyReportsTab from './abuse/tabs/MyReportsTab';
import ReviewerQueueTab from './abuse/tabs/ReviewerQueueTab';
import OperatorPanelTab from './abuse/tabs/OperatorPanelTab';
import TransparencyTab from './abuse/tabs/TransparencyTab';
import useAbuseCenter from './abuse/hooks/useAbuseCenter';

/**
 * Governance & abuse center (VGT GLASS 2100).
 *
 * Composition-only shell. State, API calls and every handler live in
 * `components/chat/abuse/**`. Tab visibility and role gating are unchanged:
 * the reviewer queue needs a reviewer role, the operator panel an operator role.
 */
export default function AbuseCenter({ activeIdentity, triggerAlert, t }) {
  const abuse = useAbuseCenter({ activeIdentity, triggerAlert, t });

  const disclosure = {
    busy: abuse.busy,
    disclosureRole: abuse.disclosureRole,
    setDisclosureRole: abuse.setDisclosureRole,
    disclosurePackageText: abuse.disclosurePackageText,
    setDisclosurePackageText: abuse.setDisclosurePackageText,
    gaiasEyesTTL: abuse.gaiasEyesTTL,
    setGaiasEyesTTL: abuse.setGaiasEyesTTL,
    gaiasEyesKey: abuse.gaiasEyesKey,
    requestTargetRole: abuse.requestTargetRole,
    setRequestTargetRole: abuse.setRequestTargetRole,
    requestReason: abuse.requestReason,
    setRequestReason: abuse.setRequestReason,
    handleDisclosureSubmit: abuse.handleDisclosureSubmit,
    handleCreateGaiasEyesKey: abuse.handleCreateGaiasEyesKey,
    handleRequestDisclosure: abuse.handleRequestDisclosure,
    isReviewer: abuse.isReviewer,
    isOperator: abuse.isOperator
  };

  return (
    <section className="vgt-abuse-pane" aria-labelledby="vgt-abuse-title">
      <AbuseHead
        activeTab={abuse.activeTab}
        setActiveTab={abuse.setActiveTab}
        isReviewer={abuse.isReviewer}
        isOperator={abuse.isOperator}
        t={t}
      />

      <div className="vgt-abuse-body">
        {abuse.loading && !abuse.selectedCase ? (
          <p className="vgt-empty-note" role="status">{t('ac_loading') || 'Lade Daten …'}</p>
        ) : null}
        {abuse.error ? (
          <p className="vgt-inline-status is-error" role="alert">{abuse.error}</p>
        ) : null}

        {abuse.activeTab === 'my_reports' ? (
          <MyReportsTab
            myReports={abuse.myReports}
            selectedCase={abuse.selectedCase}
            caseDetail={abuse.caseDetail}
            onSelectCase={abuse.handleSelectCase}
            appealReason={abuse.appealReason}
            setAppealReason={abuse.setAppealReason}
            appealStatement={abuse.appealStatement}
            setAppealStatement={abuse.setAppealStatement}
            handleAppealSubmit={abuse.handleAppealSubmit}
            busy={abuse.busy}
            disclosure={disclosure}
            t={t}
          />
        ) : null}

        {abuse.activeTab === 'reviewer_queue' && abuse.isReviewer ? (
          <ReviewerQueueTab
            reviewerCases={abuse.reviewerCases}
            selectedCase={abuse.selectedCase}
            caseDetail={abuse.caseDetail}
            onSelectCase={abuse.handleSelectCase}
            reviewCategory={abuse.reviewCategory}
            setReviewCategory={abuse.setReviewCategory}
            reviewSeverity={abuse.reviewSeverity}
            setReviewSeverity={abuse.setReviewSeverity}
            reviewAction={abuse.reviewAction}
            setReviewAction={abuse.setReviewAction}
            reviewReason={abuse.reviewReason}
            setReviewReason={abuse.setReviewReason}
            handleReviewSubmit={abuse.handleReviewSubmit}
            busy={abuse.busy}
            disclosure={disclosure}
            t={t}
          />
        ) : null}

        {abuse.activeTab === 'operator_panel' && abuse.isOperator ? (
          <OperatorPanelTab
            operatorCases={abuse.operatorCases}
            selectedCase={abuse.selectedCase}
            onSelectCase={abuse.handleSelectCase}
            opTargetType={abuse.opTargetType}
            setOpTargetType={abuse.setOpTargetType}
            opTargetId={abuse.opTargetId}
            setOpTargetId={abuse.setOpTargetId}
            opSuspend={abuse.opSuspend}
            setOpSuspend={abuse.setOpSuspend}
            opReason={abuse.opReason}
            setOpReason={abuse.setOpReason}
            handleOperatorActionSubmit={abuse.handleOperatorActionSubmit}
            handleSnapshotTrigger={abuse.handleSnapshotTrigger}
            busy={abuse.busy}
            queueError={abuse.error}
            queueLoading={abuse.loading}
            t={t}
          />
        ) : null}

        {abuse.activeTab === 'public_transparency' ? (
          <TransparencyTab transparency={abuse.transparency} />
        ) : null}
      </div>
    </section>
  );
}
