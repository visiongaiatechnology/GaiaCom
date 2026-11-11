import React from 'react';
import HumanProofDialog from '../common/HumanProofDialog';
import SecurityHead from './security/ui/SecurityHead';
import SecurityStatusTab from './security/tabs/SecurityStatusTab';
import SecurityEventsTab from './security/tabs/SecurityEventsTab';
import SecurityPassportTab from './security/tabs/SecurityPassportTab';
import NodeOperatorTab from './security/tabs/NodeOperatorTab';
import IdentityAdminTab from './security/tabs/IdentityAdminTab';
import NodeSystemTab from './security/tabs/NodeSystemTab';
import useSecurityCenter from './security/hooks/useSecurityCenter';
import useHumanProof from './security/hooks/useHumanProof';

/**
 * Security Center (VGT GLASS 2100).
 *
 * Composition-only shell. Data loading, filters, exports, acknowledgements and
 * node actions live in `components/chat/security/**`; every API call and every
 * handler from the previous implementation is retained.
 */
export default function SecurityCenter({ activeIdentity, derivedKeys, t, triggerAlert }) {
  const security = useSecurityCenter({ activeIdentity, triggerAlert, t });
  const proof = useHumanProof(activeIdentity);

  return (
    <section className="vgt-sec-pane" aria-labelledby="vgt-sec-title">
      <SecurityHead
        activeTab={security.activeTab}
        setActiveTab={security.setActiveTab}
        isOperator={security.isOperator}
        nodeOperatorError={security.nodeOperatorError}
        t={t}
      />

      <div className="vgt-sec-body">
        {security.loading ? (
          <p className="vgt-empty-note" role="status">Lade Sicherheitsdaten …</p>
        ) : (
          <div className="vgt-sec-stack">
            {security.summaryError ? (
              <div className="vgt-notice vgt-notice--danger" role="alert" aria-labelledby="vgt-sec-load-error-title">
                <div>
                  <strong id="vgt-sec-load-error-title">Sicherheitsdaten nicht geladen</strong>
                  <p className="vgt-body vgt-body--sm">{security.summaryError}</p>
                  <p className="vgt-caption">
                    Es werden bewusst keine Ersatzwerte angezeigt. Prüfe die Verbindung und lade erneut.
                  </p>
                  <div className="vgt-profile-form__actions">
                    <button type="button" className="btn-secondary" onClick={security.loadData}>
                      {t('sc_btn_load_again') || 'Erneut laden'}</button>
                  </div>
                </div>
              </div>
            ) : null}

            {security.activeTab === 'status' ? (
              <SecurityStatusTab
                summary={security.summary}
                events={security.events}
                eventsLoaded={security.eventsLoaded}
                handleAcknowledge={security.handleAcknowledge}
                t={t}
              />
            ) : null}

            {security.activeTab === 'events' ? (
              <SecurityEventsTab
                events={security.events}
                filteredEvents={security.filteredEvents}
                filterSeverity={security.filterSeverity}
                setFilterSeverity={security.setFilterSeverity}
                filterCategory={security.filterCategory}
                setFilterCategory={security.setFilterCategory}
                handleAcknowledge={security.handleAcknowledge}
                handleExport={security.handleExport}
                loadData={security.loadData}
                loading={security.loading}
                loadError={security.eventsError || security.summaryError}
                t={t}
              />
            ) : null}

            {security.activeTab === 'passport' ? (
              <SecurityPassportTab
                activeIdentity={activeIdentity}
                derivedKeys={derivedKeys}
                humanProof={proof.humanProof}
                trustPassport={proof.trustPassport}
                passportError={proof.passportError}
                onOpenHumanProof={() => proof.setShowHumanProofDialog(true)}
                onRefresh={proof.refresh}
                t={t}
              />
            ) : null}

            {security.activeTab === 'node_operator' ? (
              <NodeOperatorTab
                nodeSummary={security.nodeSummary}
                nodeEvents={security.nodeEvents}
                nodeOperatorError={security.nodeOperatorError}
                isOperator={security.isOperator}
                t={t}
              />
            ) : null}

            {security.activeTab === 'identity_admin' && security.isOperator ? (
              <IdentityAdminTab
                isOperator={security.isOperator}
                t={t}
                triggerAlert={triggerAlert}
              />
            ) : null}

            {security.activeTab === 'node_system' && security.isOperator ? (
              <NodeSystemTab
                nodeRegistry={security.nodeRegistry}
                nodeRegistryError={security.nodeRegistryError}
                nodeSecrets={security.nodeSecrets}
                handleGenerateNodeSecrets={security.handleGenerateNodeSecrets}
                handlePingMainNode={security.handlePingMainNode}
                handleRegistryStatus={security.handleRegistryStatus}
                t={t}
              />
            ) : null}
          </div>
        )}
      </div>

      <HumanProofDialog
        show={proof.showHumanProofDialog}
        onClose={() => proof.setShowHumanProofDialog(false)}
        activeIdentity={activeIdentity}
        derivedKeys={derivedKeys}
        profile={{
          displayName: activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.GaiaID
        }}
        triggerAlert={triggerAlert}
        onVerified={proof.handleVerified}
      />
    </section>
  );
}
