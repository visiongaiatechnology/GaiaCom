import React, { Suspense, lazy } from 'react';
const ComposerPane = lazy(() => import('../../../chat/ComposerPane'));
import PaneFallback from '../PaneFallback';

/**
 * PaneComposer — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneComposer(props) {
  const {
    composeBody,
    composeError,
    composeScheduledFor,
    composeSubject,
    composeTo,
    contacts,
    currentMenu,
    fileInputRef,
    handleFileUpload,
    handleSendMail,
    isComposing,
    isSavingDraft,
    isSmtpMode,
    mailSettings,
    setComposeBody,
    setComposeScheduledFor,
    setComposeSubject,
    setComposeTo,
    setIsComposing,
    setIsSmtpMode,
    t,
    uploadFile,
    uploadProgress,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {isComposing && currentMenu !== 'chat' && currentMenu !== 'profile' && currentMenu !== 'groups' && currentMenu !== 'public_channels' && currentMenu !== 'network_health' && (
          <ComposerPane
            isSmtpMode={isSmtpMode}
            setIsSmtpMode={setIsSmtpMode}
            composeTo={composeTo}
            setComposeTo={setComposeTo}
            composeSubject={composeSubject}
            setComposeSubject={setComposeSubject}
            composeBody={composeBody}
            setComposeBody={setComposeBody}
            setComposeScheduledFor={setComposeScheduledFor}
            composeScheduledFor={composeScheduledFor}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            uploadFile={uploadFile}
            uploadProgress={uploadProgress}
            composeError={composeError}
            handleSendMail={handleSendMail}
            setIsComposing={setIsComposing}
            contacts={contacts}
            mailSettings={mailSettings}
            isSavingDraft={isSavingDraft}
            t={t}
          />
        )}
        </Suspense>
    </>
  );
}
