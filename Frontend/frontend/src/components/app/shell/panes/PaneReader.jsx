import React, { Suspense, lazy } from 'react';
const ReaderPane = lazy(() => import('../../../chat/ReaderPane'));
import PaneFallback from '../PaneFallback';

/**
 * PaneReader — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneReader(props) {
  const {
    activeIdentity,
    contacts,
    currentMenu,
    handleExportDisclosurePackage,
    handleReplyMail,
    handleReportMail,
    isComposing,
    labelsList,
    openContactProfile,
    saveLabel,
    selectedMail,
    selectedMailProof,
    setSelectedMail,
    snoozeMail,
    t,
    updateMailboxState,
  } = props;

  const readerHiddenMenus = new Set([
    'dashboard',
    'chat',
    'profile',
    'groups',
    'vault',
    'gaiadrop',
    'network_health',
    'public_channels',
    'abuse_center',
    'security_center',
    'gsn'
  ]);
  const shouldRenderReader = !isComposing && !readerHiddenMenus.has(currentMenu);

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {shouldRenderReader && (
          <ReaderPane
            selectedMail={selectedMail}
            selectedMailProof={selectedMailProof}
            activeIdentity={activeIdentity}
            contacts={contacts}
            handleReplyMail={handleReplyMail}
            handleExportDisclosurePackage={handleExportDisclosurePackage}
            handleReportMail={handleReportMail}
            setSelectedMail={setSelectedMail}
            isComposing={isComposing}
            currentMenu={currentMenu}
            openContactProfile={openContactProfile}
            t={t}
            updateMailboxState={updateMailboxState}
            snoozeMail={snoozeMail}
            labelsList={labelsList}
            saveLabel={saveLabel}
          />
        )}
        </Suspense>
    </>
  );
}
