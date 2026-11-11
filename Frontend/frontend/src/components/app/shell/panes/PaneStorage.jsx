import React, { Suspense, lazy } from 'react';
const DrivePane = lazy(() => import('../../../chat/DrivePane'));
const DropPane = lazy(() => import('../../../chat/DropPane'));
import PaneFallback from '../PaneFallback';

/**
 * PaneStorage — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneStorage(props) {
  const {
    activeIdentity,
    currentMenu,
    displayGaiaID,
    draftBody,
    draftCategory,
    draftTitle,
    driveError,
    drivePasswordInput,
    driveRecords,
    driveUnlocked,
    driveUploadProgress,
    gaiaDropError,
    gaiaDropInbox,
    gaiaDropLoading,
    handleAddFile,
    handleAddNote,
    handleCloudDownload,
    handleCloudUpload,
    handleDeleteDrop,
    handleDeleteRecord,
    handleDownloadFile,
    handleLockDrive,
    handleUnlockDrive,
    loadGaiaDropInbox,
    selectedDriveRecord,
    selectedDrop,
    setDraftBody,
    setDraftCategory,
    setDraftTitle,
    setDrivePasswordInput,
    setMobileMenuOpen,
    setSelectedDriveRecord,
    setSelectedDrop,
    t,
    triggerAlert,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'vault' && (
          <DrivePane
            driveUnlocked={driveUnlocked}
            drivePasswordInput={drivePasswordInput}
            setDrivePasswordInput={setDrivePasswordInput}
            driveError={driveError}
            driveRecords={driveRecords}
            selectedDriveRecord={selectedDriveRecord}
            setSelectedDriveRecord={setSelectedDriveRecord}
            draftTitle={draftTitle}
            setDraftTitle={setDraftTitle}
            draftCategory={draftCategory}
            setDraftCategory={setDraftCategory}
            draftBody={draftBody}
            setDraftBody={setDraftBody}
            driveUploadProgress={driveUploadProgress}
            handleUnlockDrive={handleUnlockDrive}
            handleLockDrive={handleLockDrive}
            handleAddNote={handleAddNote}
            handleAddFile={handleAddFile}
            handleDownloadFile={handleDownloadFile}
            handleCloudUpload={handleCloudUpload}
            handleCloudDownload={handleCloudDownload}
            handleDeleteRecord={handleDeleteRecord}
            t={t}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
        </Suspense>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'gaiadrop' && (
          <DropPane
            gaiaDropInbox={gaiaDropInbox}
            gaiaDropLoading={gaiaDropLoading}
            gaiaDropError={gaiaDropError}
            selectedDrop={selectedDrop}
            setSelectedDrop={setSelectedDrop}
            loadGaiaDropInbox={loadGaiaDropInbox}
            activeIdentity={activeIdentity}
            displayGaiaID={displayGaiaID}
            handleDeleteDrop={handleDeleteDrop}
            t={t}
            triggerAlert={triggerAlert}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
        </Suspense>
    </>
  );
}
