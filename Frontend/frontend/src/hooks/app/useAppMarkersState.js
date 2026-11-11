import { useState, useRef } from 'react';

/* Unread markers, boot/onboarding state, snapshot refs and modal states (moved verbatim). */
export default function useAppMarkersState() {
  // User Profile hook state will be initialized after useGaiaAuth (see below)
  // Placeholder state for messageMeta and unread markers

  // messageMeta state is managed by useMessageMeta hook (declared after useGaiaAuth)
  const [activeDirectUnreadMarker, setActiveDirectUnreadMarker] = useState(null);
  const [activeGroupUnreadMarker, setActiveGroupUnreadMarker] = useState(null);
  const [showBootSequence, setShowBootSequence] = useState(false);
  const [showFirstRunOnboarding, setShowFirstRunOnboarding] = useState(false);
  const directUnreadSnapshotKeyRef = useRef('');
  const groupUnreadSnapshotKeyRef = useRef('');
  const chatKeyCheckRef = useRef('');
  const knownChatNotificationIdsRef = useRef(new Set());
  const chatNotificationsPrimedRef = useRef(false);
  const bootSequenceSeenRef = useRef('');
  const onboardingSeenKeyRef = useRef('');

  // Contact modal & key-change state
  const [contactProfile, setContactProfile] = useState(null);
  const [keyChangeWarning, setKeyChangeWarning] = useState(null);
  const [keyChangeConfirmInput, setKeyChangeConfirmInput] = useState('');

  const fileInputRef = useRef(null);

  return {
    activeDirectUnreadMarker,
    setActiveDirectUnreadMarker,
    activeGroupUnreadMarker,
    setActiveGroupUnreadMarker,
    showBootSequence,
    setShowBootSequence,
    showFirstRunOnboarding,
    setShowFirstRunOnboarding,
    directUnreadSnapshotKeyRef,
    groupUnreadSnapshotKeyRef,
    chatKeyCheckRef,
    knownChatNotificationIdsRef,
    chatNotificationsPrimedRef,
    bootSequenceSeenRef,
    onboardingSeenKeyRef,
    contactProfile,
    setContactProfile,
    keyChangeWarning,
    setKeyChangeWarning,
    keyChangeConfirmInput,
    setKeyChangeConfirmInput,
    fileInputRef,
  };
}
