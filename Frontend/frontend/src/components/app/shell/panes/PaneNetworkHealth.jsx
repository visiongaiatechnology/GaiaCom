import React, { Suspense, lazy } from 'react';
const NetworkHealthDashboard = lazy(() => import('../../../public/NetworkHealthDashboard'));
import PaneFallback from '../PaneFallback';

/**
 * PaneNetworkHealth — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneNetworkHealth(props) {
  const {
    currentMenu,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'network_health' && (
          <NetworkHealthDashboard embedded />
        )}
        </Suspense>
    </>
  );
}
