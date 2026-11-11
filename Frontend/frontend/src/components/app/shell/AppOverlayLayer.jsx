import AppFeedbackModals from '../AppFeedbackModals';
import AppModalLayer from '../AppModalLayer';
import React from 'react';
import { displayGaiaID } from '../../../utils/gaiaAddress';

/*
 * Modal/feedback layer host: forwards the exact AppFeedbackModals + AppModalLayer prop sets (moved verbatim).
 */
export default function AppOverlayLayer({ui, markers, auth, data, t}) {
  const {
    activeIdentity, alertConfig, confirmConfig, currentMenu, setAlertConfig, setConfirmConfig,
    setShowQuantumShieldModal, showConfirm, showQuantumShieldModal, triggerAlert,
  } = ui;
  const { contactProfile, keyChangeConfirmInput, keyChangeWarning, setContactProfile, setKeyChangeConfirmInput } = markers;
  const {
    activeChatContact, activeRoom, editGroupAvatar, editGroupDescription, editGroupIsCrisis,
    editGroupIsPrivate, editGroupName, editGroupReadOnly, editGroupSlowModeSeconds, editGroupTopSecret,
    groupAvatarInput, groupDescriptionInput, groupNameInput, handleClearDirectChat, handleCreateChannel,
    handleCreateRoom, handleCreateRoomInviteLink, handleDeleteGroup, handleGetJoinRequests,
    handleGetModerationLogs, handleJoinRoom, handleKickMember, handleModerateJoinRequest,
    handleTransferOwnership, handleUpdateGroupSettings, handleUpdateMemberRole, isCrisisRoomInput,
    joinGroupHashInput, joinRequests, moderationLogs, newChannelNameInput, setActiveChatContact,
    setEditGroupAvatar, setEditGroupDescription, setEditGroupIsCrisis, setEditGroupIsPrivate,
    setEditGroupName, setEditGroupReadOnly, setEditGroupSlowModeSeconds, setEditGroupTopSecret,
    setGroupAvatarInput, setGroupDescriptionInput, setGroupNameInput, setIsCrisisRoomInput,
    setJoinGroupHashInput, setNewChannelNameInput, setShowCreateChannelModal, setShowCreateGroupModal,
    setShowGroupSettingsModal, setShowJoinGroupModal, showCreateChannelModal, showCreateGroupModal,
    showGroupSettingsModal, showJoinGroupModal,
  } = data.chat;
  const {
    addDiscoveredContact, discoverError, discoverGaiaId, discoveredContact, handleDiscoverSubmit,
    handleReportContactAbuse, handleToggleContactBlock, setDiscoverGaiaId, setShowAddContact,
    showAddContact,
  } = data.contactActions;

  return (
    <>

      <AppModalLayer
        contactProfile={contactProfile}
        setContactProfile={setContactProfile}
        showAddContact={showAddContact}
        setShowAddContact={setShowAddContact}
        discoverGaiaId={discoverGaiaId}
        setDiscoverGaiaId={setDiscoverGaiaId}
        handleDiscoverSubmit={handleDiscoverSubmit}
        discoverError={discoverError}
        discoveredContact={discoveredContact}
        addDiscoveredContact={addDiscoveredContact}
        displayGaiaID={displayGaiaID}
        t={t}
        triggerAlert={triggerAlert}
        showConfirm={showConfirm}
        showQuantumShieldModal={showQuantumShieldModal}
        setShowQuantumShieldModal={setShowQuantumShieldModal}
        showCreateGroupModal={showCreateGroupModal}
        setShowCreateGroupModal={setShowCreateGroupModal}
        groupNameInput={groupNameInput}
        setGroupNameInput={setGroupNameInput}
        groupDescriptionInput={groupDescriptionInput}
        setGroupDescriptionInput={setGroupDescriptionInput}
        groupAvatarInput={groupAvatarInput}
        setGroupAvatarInput={setGroupAvatarInput}
        handleCreateRoom={handleCreateRoom}
        isCrisisRoomInput={isCrisisRoomInput}
        setIsCrisisRoomInput={setIsCrisisRoomInput}
        showJoinGroupModal={showJoinGroupModal}
        setShowJoinGroupModal={setShowJoinGroupModal}
        joinGroupHashInput={joinGroupHashInput}
        setJoinGroupHashInput={setJoinGroupHashInput}
        handleJoinRoom={handleJoinRoom}
        showCreateChannelModal={showCreateChannelModal}
        setShowCreateChannelModal={setShowCreateChannelModal}
        newChannelNameInput={newChannelNameInput}
        setNewChannelNameInput={setNewChannelNameInput}
        handleCreateChannel={handleCreateChannel}
        showGroupSettingsModal={showGroupSettingsModal}
        setShowGroupSettingsModal={setShowGroupSettingsModal}
        editGroupName={editGroupName}
        setEditGroupName={setEditGroupName}
        editGroupDescription={editGroupDescription}
        setEditGroupDescription={setEditGroupDescription}
        editGroupAvatar={editGroupAvatar}
        setEditGroupAvatar={setEditGroupAvatar}
        editGroupIsCrisis={editGroupIsCrisis}
        setEditGroupIsCrisis={setEditGroupIsCrisis}
        editGroupIsPrivate={editGroupIsPrivate}
        setEditGroupIsPrivate={setEditGroupIsPrivate}
        editGroupReadOnly={editGroupReadOnly}
        setEditGroupReadOnly={setEditGroupReadOnly}
        editGroupSlowModeSeconds={editGroupSlowModeSeconds}
        setEditGroupSlowModeSeconds={setEditGroupSlowModeSeconds}
        editGroupTopSecret={editGroupTopSecret}
        setEditGroupTopSecret={setEditGroupTopSecret}
        handleUpdateGroupSettings={handleUpdateGroupSettings}
        handleDeleteGroup={handleDeleteGroup}
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
        keyChangeWarning={keyChangeWarning}
        keyChangeConfirmInput={keyChangeConfirmInput}
        setKeyChangeConfirmInput={setKeyChangeConfirmInput}
        activeChatContact={activeChatContact}
        currentMenu={currentMenu}
        onToggleContactBlock={handleToggleContactBlock}
        onReportContact={handleReportContactAbuse}
        onClearActiveChat={handleClearDirectChat}
        onCloseActiveChat={() => {
          setContactProfile(null);
          setActiveChatContact(null);
        }}
      />
      <AppFeedbackModals
        alertConfig={alertConfig}
        setAlertConfig={setAlertConfig}
        confirmConfig={confirmConfig}
        setConfirmConfig={setConfirmConfig}
        t={t}
      />
    </>
  );
}
