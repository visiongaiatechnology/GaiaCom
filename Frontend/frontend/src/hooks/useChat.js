// useChat — fixed-order orchestrator.
// State/ref hooks and effects stay in this file in their original order; the
// non-hook action closures live in ./chat/* and are created below.
// Behaviour, storage keys, API calls and the returned object are unchanged.
import { useState, useEffect, useRef } from 'react';
import { safeJsonParse } from '../utils/safeJson';
import { parseToGaiaID } from '../utils/gaiaAddress';
import { createRoomActions } from './chat/roomActions';
import { createModerationActions } from './chat/moderationActions';
import { createDirectActions } from './chat/directActions';
import { createGroupActions } from './chat/groupActions';
import { createChatUploadAction } from './chat/uploadAction';

export default function useChat({
  activeIdentity,
  derivedKeys,
  deviceKeyVault,
  contacts,
  setContacts,
  user,
  triggerAlert,
  showConfirm,
  showConfirmThreeButtons,
  t,
  pollEmails,
  verifyRecipientsAndRun
}) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const activeRoomRef = useRef(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescriptionInput, setGroupDescriptionInput] = useState('');
  const [groupAvatarInput, setGroupAvatarInput] = useState('\u{1F916}');
  const [isCrisisRoomInput, setIsCrisisRoomInput] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const [editGroupIsCrisis, setEditGroupIsCrisis] = useState(false);
  const [editGroupIsPrivate, setEditGroupIsPrivate] = useState(false);
  const [editGroupReadOnly, setEditGroupReadOnly] = useState(false);
  const [editGroupSlowModeSeconds, setEditGroupSlowModeSeconds] = useState(0);
  const [editGroupTopSecret, setEditGroupTopSecret] = useState(false);
  const [slowModeCooldowns, setSlowModeCooldowns] = useState({});
  const [moderationLogs, setModerationLogs] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [publicRoomsSearchResult, setPublicRoomsSearchResult] = useState([]);
  const [pinnedMessageIds, setPinnedMessageIds] = useState([]);
  const [joinGroupHashInput, setJoinGroupHashInput] = useState('');
  const [newChannelNameInput, setNewChannelNameInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [activeChatContact, setActiveChatContact] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageReplyTarget, setMessageReplyTarget] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [directTopSecretByGaia, setDirectTopSecretByGaia] = useState({});
  const activeDirectTopSecret = !!(activeChatContact?.gaiaID && directTopSecretByGaia[parseToGaiaID(activeChatContact.gaiaID)]);

  const roomActions = createRoomActions({
    user,
    activeIdentity,
    derivedKeys,
    activeRoom,
    activeChannel,
    activeRoomRef,
    triggerAlert,
    showConfirm,
    t,
    groupNameInput,
    groupDescriptionInput,
    groupAvatarInput,
    isCrisisRoomInput,
    joinGroupHashInput,
    newChannelNameInput,
    editGroupName,
    editGroupDescription,
    editGroupAvatar,
    editGroupIsCrisis,
    editGroupIsPrivate,
    editGroupReadOnly,
    editGroupSlowModeSeconds,
    editGroupTopSecret,
    setRooms,
    setActiveRoom,
    setChannels,
    setActiveChannel,
    setPinnedMessageIds,
    setShowCreateGroupModal,
    setShowJoinGroupModal,
    setShowCreateChannelModal,
    setShowGroupSettingsModal,
    setEditGroupName,
    setEditGroupDescription,
    setEditGroupAvatar,
    setEditGroupIsCrisis,
    setEditGroupIsPrivate,
    setEditGroupReadOnly,
    setEditGroupSlowModeSeconds,
    setEditGroupTopSecret,
    setGroupNameInput,
    setGroupDescriptionInput,
    setGroupAvatarInput,
    setIsCrisisRoomInput,
    setJoinGroupHashInput,
    setNewChannelNameInput
  });

  const { fetchPinnedMessages, fetchChannels } = roomActions;

  const moderationActions = createModerationActions({
    activeRoom,
    activeChannel,
    activeIdentity,
    triggerAlert,
    fetchRooms: roomActions.fetchRooms,
    fetchPinnedMessages: roomActions.fetchPinnedMessages,
    setJoinRequests,
    setModerationLogs,
    setPublicRoomsSearchResult,
    setActiveRoom
  });

  const directActions = createDirectActions({
    user,
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    activeChatContact,
    activeDirectTopSecret,
    chatInputText,
    chatMessages,
    messageReplyTarget,
    setChatInputText,
    setChatMessages,
    setContacts,
    setActiveChatContact,
    setDirectTopSecretByGaia,
    setMessageReplyTarget,
    triggerAlert,
    showConfirmThreeButtons,
    t,
    pollEmails,
    verifyRecipientsAndRun
  });

  const groupActions = createGroupActions({
    activeRoom,
    activeChannel,
    activeIdentity,
    derivedKeys,
    deviceKeyVault,
    chatInputText,
    chatMessages,
    slowModeCooldowns,
    messageReplyTarget,
    setChatInputText,
    setChatMessages,
    setSlowModeCooldowns,
    setMessageReplyTarget,
    triggerAlert,
    showConfirm,
    t,
    pollEmails,
    verifyRecipientsAndRun
  });

  const uploadAction = createChatUploadAction({
    activeIdentity,
    setUploadProgress,
    triggerAlert
  });

  // Sync activeRoom with its ref
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    setMessageReplyTarget(null);
  }, [activeChatContact, activeChannel]);

  useEffect(() => {
    if (!user?.id) {
      setDirectTopSecretByGaia({});
      return;
    }
    const stored = safeJsonParse(localStorage.getItem(`direct_top_secret_${user.id}`), {});
    setDirectTopSecretByGaia(stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {});
  }, [user?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlowModeCooldowns(prev => {
        const next = { ...prev };
        let changed = false;
        Object.entries(next).forEach(([cid, val]) => {
          if (val > 0) {
            next[cid] = val - 1;
            changed = true;
          } else {
            delete next[cid];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchPinnedMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, activeChannel]);

  // Fetch channels when activeRoom changes
  useEffect(() => {
    if (activeRoom) {
      fetchChannels(activeRoom.ID);
    } else {
      setChannels([]);
      setActiveChannel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);

  return {
    rooms, setRooms,
    activeRoom, setActiveRoom,
    channels, setChannels,
    activeChannel, setActiveChannel,
    showCreateGroupModal, setShowCreateGroupModal,
    showJoinGroupModal, setShowJoinGroupModal,
    showCreateChannelModal, setShowCreateChannelModal,
    showGroupSettingsModal, setShowGroupSettingsModal,
    groupNameInput, setGroupNameInput,
    groupDescriptionInput, setGroupDescriptionInput,
    groupAvatarInput, setGroupAvatarInput,
    isCrisisRoomInput, setIsCrisisRoomInput,
    editGroupName, setEditGroupName,
    editGroupDescription, setEditGroupDescription,
    editGroupAvatar, setEditGroupAvatar,
    editGroupIsCrisis, setEditGroupIsCrisis,
    editGroupIsPrivate, setEditGroupIsPrivate,
    editGroupReadOnly, setEditGroupReadOnly,
    editGroupSlowModeSeconds, setEditGroupSlowModeSeconds,
    editGroupTopSecret, setEditGroupTopSecret,
    slowModeCooldowns,
    moderationLogs,
    joinRequests,
    publicRoomsSearchResult,
    pinnedMessageIds,
    joinGroupHashInput, setJoinGroupHashInput,
    newChannelNameInput, setNewChannelNameInput,
    chatMessages, setChatMessages,
    activeChatContact, setActiveChatContact,
    activeDirectTopSecret,
    setDirectTopSecretEnabled: directActions.setDirectTopSecretEnabled,
    chatInputText, setChatInputText,
    showEmojiPicker, setShowEmojiPicker,
    messageReplyTarget, setMessageReplyTarget,
    uploadProgress,
    fetchRooms: roomActions.fetchRooms,
    fetchChannels: roomActions.fetchChannels,
    handleCreateRoom: roomActions.handleCreateRoom,
    handleJoinRoom: roomActions.handleJoinRoom,
    handleLeaveRoom: roomActions.handleLeaveRoom,
    handleCreateChannel: roomActions.handleCreateChannel,
    handleUpdateMemberRole: roomActions.handleUpdateMemberRole,
    handleOpenGroupSettings: roomActions.handleOpenGroupSettings,
    handleUpdateGroupSettings: roomActions.handleUpdateGroupSettings,
    handleDeleteGroup: roomActions.handleDeleteGroup,
    handleSendChatMessage: directActions.handleSendChatMessage,
    handleSendGroupMessage: groupActions.handleSendGroupMessage,
    handleDeleteChatMessage: directActions.handleDeleteChatMessage,
    handleEditChatMessage: directActions.handleEditChatMessage,
    handleClearDirectChat: directActions.handleClearDirectChat,
    handleClearGroupChannel: groupActions.handleClearGroupChannel,
    uploadChatFile: uploadAction.uploadChatFile,
    toggleBlockContact: directActions.toggleBlockContact,
    handleToggleMessagePin: moderationActions.handleToggleMessagePin,
    handleKickMember: moderationActions.handleKickMember,
    handleTransferOwnership: moderationActions.handleTransferOwnership,
    handleGetJoinRequests: moderationActions.handleGetJoinRequests,
    handleModerateJoinRequest: moderationActions.handleModerateJoinRequest,
    handleGetModerationLogs: moderationActions.handleGetModerationLogs,
    handleSearchPublicRooms: moderationActions.handleSearchPublicRooms,
    handleCreateRoomInviteLink: moderationActions.handleCreateRoomInviteLink,
    handleJoinViaInviteLink: moderationActions.handleJoinViaInviteLink,
    handleCreateJoinRequest: moderationActions.handleCreateJoinRequest
  };
}
