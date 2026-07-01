// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';
import GroupSettingsModal from '../chat/GroupSettingsModal';
import AddContactModal from '../modals/AddContactModal';
import QuantumShieldModal from '../modals/QuantumShieldModal';
import CreateGroupModal from '../modals/CreateGroupModal';
import JoinGroupModal from '../modals/JoinGroupModal';
import CreateChannelModal from '../modals/CreateChannelModal';
import KeyChangeWarningModal from '../modals/KeyChangeWarningModal';
import ContactProfileModal from '../modals/ContactProfileModal';

export default function AppModalLayer({
  contactProfile,
  setContactProfile,
  showAddContact,
  setShowAddContact,
  discoverGaiaId,
  setDiscoverGaiaId,
  handleDiscoverSubmit,
  discoverError,
  discoveredContact,
  addDiscoveredContact,
  displayGaiaID,
  t,
  triggerAlert,
  showConfirm,
  showQuantumShieldModal,
  setShowQuantumShieldModal,
  showCreateGroupModal,
  setShowCreateGroupModal,
  groupNameInput,
  setGroupNameInput,
  groupDescriptionInput,
  setGroupDescriptionInput,
  groupAvatarInput,
  setGroupAvatarInput,
  handleCreateRoom,
  isCrisisRoomInput,
  setIsCrisisRoomInput,
  showJoinGroupModal,
  setShowJoinGroupModal,
  joinGroupHashInput,
  setJoinGroupHashInput,
  handleJoinRoom,
  showCreateChannelModal,
  setShowCreateChannelModal,
  newChannelNameInput,
  setNewChannelNameInput,
  handleCreateChannel,
  showGroupSettingsModal,
  setShowGroupSettingsModal,
  editGroupName,
  setEditGroupName,
  editGroupDescription,
  setEditGroupDescription,
  editGroupAvatar,
  setEditGroupAvatar,
  editGroupIsCrisis,
  setEditGroupIsCrisis,
  editGroupIsPrivate,
  setEditGroupIsPrivate,
  editGroupReadOnly,
  setEditGroupReadOnly,
  editGroupSlowModeSeconds,
  setEditGroupSlowModeSeconds,
  editGroupTopSecret,
  setEditGroupTopSecret,
  handleUpdateGroupSettings,
  handleDeleteGroup,
  handleUpdateMemberRole,
  handleKickMember,
  handleTransferOwnership,
  handleGetJoinRequests,
  handleModerateJoinRequest,
  joinRequests,
  handleGetModerationLogs,
  moderationLogs,
  handleCreateRoomInviteLink,
  activeRoom,
  activeIdentity,
  keyChangeWarning,
  keyChangeConfirmInput,
  setKeyChangeConfirmInput,
  activeChatContact,
  currentMenu,
  onToggleContactBlock,
  onReportContact,
  onClearActiveChat,
  onCloseActiveChat
}) {
  const showActiveChatActions = !!(
    contactProfile &&
    activeChatContact &&
    currentMenu === 'chat' &&
    String(contactProfile.gaiaID || '').toLowerCase() === String(activeChatContact.gaiaID || '').toLowerCase()
  );

  return (
    <>
      {/* MODAL: CONTACT PROFILE (TRUST PASSPORT) */}
      <ContactProfileModal
        show={!!contactProfile}
        onClose={() => setContactProfile(null)}
        contactProfile={contactProfile}
        displayGaiaID={displayGaiaID}
        t={t}
        showChatActions={showActiveChatActions}
        onToggleBlock={showActiveChatActions ? () => onToggleContactBlock(contactProfile.gaiaID) : null}
        onReport={showActiveChatActions ? () => onReportContact(contactProfile.gaiaID) : null}
        onClearChat={showActiveChatActions ? onClearActiveChat : null}
        onCloseChat={showActiveChatActions ? onCloseActiveChat : null}
      />

      {/* MODAL: ADD CONTACT */}
      <AddContactModal
        show={showAddContact}
        onClose={() => setShowAddContact(false)}
        discoverGaiaId={discoverGaiaId}
        setDiscoverGaiaId={setDiscoverGaiaId}
        handleDiscoverSubmit={handleDiscoverSubmit}
        discoverError={discoverError}
        discoveredContact={discoveredContact}
        addDiscoveredContact={addDiscoveredContact}
        displayGaiaID={displayGaiaID}
        t={t}
      />

      {/* MODAL: QUANTUM SHIELD EXPLANATION */}
      <QuantumShieldModal
        show={showQuantumShieldModal}
        onClose={() => setShowQuantumShieldModal(false)}
        t={t}
      />

      {/* MODAL: CREATE GROUP */}
      <CreateGroupModal
        show={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        groupNameInput={groupNameInput}
        setGroupNameInput={setGroupNameInput}
        groupDescriptionInput={groupDescriptionInput}
        setGroupDescriptionInput={setGroupDescriptionInput}
        groupAvatarInput={groupAvatarInput}
        setGroupAvatarInput={setGroupAvatarInput}
        handleCreateRoom={handleCreateRoom}
        isCrisisRoomInput={isCrisisRoomInput}
        setIsCrisisRoomInput={setIsCrisisRoomInput}
        t={t}
      />

      {/* MODAL: JOIN GROUP */}
      <JoinGroupModal
        show={showJoinGroupModal}
        onClose={() => setShowJoinGroupModal(false)}
        joinGroupHashInput={joinGroupHashInput}
        setJoinGroupHashInput={setJoinGroupHashInput}
        handleJoinRoom={handleJoinRoom}
        t={t}
      />

      {/* MODAL: CREATE CHANNEL */}
      <CreateChannelModal
        show={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        newChannelNameInput={newChannelNameInput}
        setNewChannelNameInput={setNewChannelNameInput}
        handleCreateChannel={handleCreateChannel}
        t={t}
      />

      {showGroupSettingsModal && (
        <GroupSettingsModal
          name={editGroupName}
          description={editGroupDescription}
          avatar={editGroupAvatar}
          isCrisis={editGroupIsCrisis}
          onIsCrisisChange={setEditGroupIsCrisis}
          onNameChange={setEditGroupName}
          onDescriptionChange={setEditGroupDescription}
          onAvatarChange={setEditGroupAvatar}
          onSubmit={handleUpdateGroupSettings}
          onClose={() => setShowGroupSettingsModal(false)}
          onDelete={handleDeleteGroup}
          isPrivate={editGroupIsPrivate}
          onIsPrivateChange={setEditGroupIsPrivate}
          readOnly={editGroupReadOnly}
          onReadOnlyChange={setEditGroupReadOnly}
          slowModeSeconds={editGroupSlowModeSeconds}
          onSlowModeSecondsChange={setEditGroupSlowModeSeconds}
          topSecret={editGroupTopSecret}
          onTopSecretChange={setEditGroupTopSecret}
          handleUpdateMemberRole={handleUpdateMemberRole}
          handleKickMember={handleKickMember}
          handleTransferOwnership={handleTransferOwnership}
          handleGetJoinRequests={handleGetJoinRequests}
          handleModerateJoinRequest={handleModerateJoinRequest}
          joinRequests={joinRequests}
          handleGetModerationLogs={handleGetModerationLogs}
          moderationLogs={moderationLogs}
          handleCreateRoomInviteLink={handleCreateRoomInviteLink}
          activeRoom={activeRoom}
          activeIdentity={activeIdentity}
          displayGaiaID={displayGaiaID}
          t={t}
          triggerAlert={triggerAlert}
          showConfirm={showConfirm}
        />
      )}

      {/* KEY CHANGE WARNING MODAL */}
      <KeyChangeWarningModal
        warning={keyChangeWarning}
        confirmInput={keyChangeConfirmInput}
        setConfirmInput={setKeyChangeConfirmInput}
        displayGaiaID={displayGaiaID}
        t={t}
      />
    </>
  );
}
