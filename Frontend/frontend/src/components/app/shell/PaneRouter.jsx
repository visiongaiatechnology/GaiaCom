import React from 'react';

import PaneDashboardChat from './panes/PaneDashboardChat';
import PaneGroups from './panes/PaneGroups';
import PaneChannels from './panes/PaneChannels';
import PaneNetworkHealth from './panes/PaneNetworkHealth';
import PaneComposer from './panes/PaneComposer';
import PaneReader from './panes/PaneReader';
import PaneProfile from './panes/PaneProfile';
import PaneStorage from './panes/PaneStorage';
import PaneGovernance from './panes/PaneGovernance';
import PaneGsn from './panes/PaneGsn';

/**
 * PaneRouter — dispatches the workspace content panes in their original DOM order.
 * Each slice receives the unchanged AppMainContent props object, so the pane routing
 * conditions and the per-pane prop sets stay exactly as they were.
 */
export default function PaneRouter(props) {
  return (
    <>
      <PaneDashboardChat {...props} />
      <PaneGroups {...props} />
      <PaneChannels {...props} />
      <PaneNetworkHealth {...props} />
      <PaneComposer {...props} />
      <PaneReader {...props} />
      <PaneProfile {...props} />
      <PaneStorage {...props} />
      <PaneGovernance {...props} />
      <PaneGsn {...props} />
    </>
  );
}
