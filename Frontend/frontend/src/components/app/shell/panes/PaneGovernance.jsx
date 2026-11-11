import React, { Suspense, lazy } from 'react';
const AbuseCenter = lazy(() => import('../../../chat/AbuseCenter'));
const SecurityCenter = lazy(() => import('../../../chat/SecurityCenter'));
import PaneFallback from '../PaneFallback';

/**
 * PaneGovernance — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneGovernance(props) {
  const {
    activeIdentity,
    currentMenu,
    derivedKeys,
    setMobileMenuOpen,
    t,
    triggerAlert,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'abuse_center' && (
          <AbuseCenter
            activeIdentity={activeIdentity}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
            t={t}
          />
        )}
        </Suspense>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'security_center' && (
          <SecurityCenter
            activeIdentity={activeIdentity}
            derivedKeys={derivedKeys}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
            t={t}
          />
        )}
        </Suspense>
    </>
  );
}
