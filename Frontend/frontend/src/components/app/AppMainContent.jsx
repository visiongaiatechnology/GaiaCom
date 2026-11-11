import React from 'react';
import Icon from '../ui/Icon';
import PaneRouter from './shell/PaneRouter';

/**
 * AppMainContent — workspace content column wrapper (VGT GLASS 2100).
 *
 * Owns only the layout chrome of the working surface: the pane surface element,
 * its contextual mobile-menu affordance and the collapsed-list expand handle.
 * Pane routing lives in `./shell/PaneRouter`, which receives this component's
 * unchanged props object — every pane therefore keeps its exact prop set while
 * the file stays inside the VGT 500-line rule.
 */
export default function AppMainContent(props) {
  const {
    hasActiveContent,
    currentMenu,
    setMobileMenuOpen,
    t,
    mailListCollapsed,
    setMailListCollapsed
  } = props;

  return (
    <>
      {/* COLUMN 3: READER / COMPOSER / PROFILE / CHAT PANE */}
      <main
        id="vgt-workspace-main"
        tabIndex={-1}
        className={`mail-content-pane nebula-content-frame vgt-pane-surface nebula-view-${currentMenu}`}
      >
        {hasActiveContent && currentMenu !== 'chat' && currentMenu !== 'groups' && currentMenu !== 'public_channels' && currentMenu !== 'gaiadrop' && currentMenu !== 'vault' && currentMenu !== 'gsn' && (
          <button
            type="button"
            className="mobile-floating-menu mobile-menu-toggle vgt-pane-menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            {t('menu') || 'Menu'}
          </button>
        )}
        {mailListCollapsed && (
          <button
            type="button"
            className="vgt-pane-expand"
            onClick={() => setMailListCollapsed(false)}
            title="Liste ausklappen"
            aria-label="Liste ausklappen"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        )}

        <PaneRouter {...props} />
      </main>
    </>
  );
}
