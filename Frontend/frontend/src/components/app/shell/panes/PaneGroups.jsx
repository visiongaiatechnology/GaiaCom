import React, { Suspense, lazy } from 'react';
const GroupChatPane = lazy(() => import('../../../chat/GroupChatPane'));
import PaneFallback from '../PaneFallback';

/**
 * PaneGroups — pane slice of the workspace content router (VGT GLASS 2100).
 * Props are forwarded unchanged from AppMainContent; routing conditions are untouched.
 */
export default function PaneGroups(props) {
  const {
    activeChannel,
    activeGroupUnreadMarker,
    activeIdentity,
    activeRoom,
    channels,
    chatInputText,
    chatMessages,
    contacts,
    currentMenu,
    displayGaiaID,
    fetchRooms,
    getSenderRoles,
    handleClearGroupChannel,
    handleCreateJoinRequest,
    handleCreateRoomInviteLink,
    handleDeleteChatMessage,
    handleGetJoinRequests,
    handleGetModerationLogs,
    handleJoinViaInviteLink,
    handleKickMember,
    handleLeaveRoom,
    handleModerateJoinRequest,
    handleOpenGroupSettings,
    handleSearchPublicRooms,
    handleSendGroupMessage,
    handleTransferOwnership,
    handleUpdateMemberRole,
    joinRequests,
    messageMeta,
    messageReplyTarget,
    moderationLogs,
    openContactProfile,
    pinnedMessageIds,
    publicRoomsSearchResult,
    reactToMessage,
    setActiveChannel,
    setActiveRoom,
    setChatInputText,
    setInboxEmails,
    setMessageReplyTarget,
    setMobileMenuOpen,
    setSentEmails,
    setShowCreateChannelModal,
    slowModeCooldowns,
    t,
    toggleMessagePin,
    toggleMessageSaved,
    triggerAlert,
  } = props;

  return (
    <>
        <Suspense fallback={<PaneFallback />}>
        {currentMenu === 'groups' && (
          <GroupChatPane
            activeRoom={activeRoom}
            channels={channels}
            activeChannel={activeChannel}
            setActiveChannel={setActiveChannel}
            chatMessages={chatMessages}
            activeIdentity={activeIdentity}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            handleSendGroupMessage={handleSendGroupMessage}
            handleUpdateMemberRole={handleUpdateMemberRole}
            handleLeaveRoom={handleLeaveRoom}
            setShowCreateChannelModal={setShowCreateChannelModal}
            triggerAlert={triggerAlert}
            displayGaiaID={displayGaiaID}
            t={t}
            openContactProfile={openContactProfile}
            handleOpenGroupSettings={handleOpenGroupSettings}
            handleDeleteChatMessage={(msgId) => handleDeleteChatMessage(msgId, setInboxEmails, setSentEmails)}
            handleClearGroupChannel={handleClearGroupChannel}
            setActiveRoom={setActiveRoom}
            setMobileMenuOpen={setMobileMenuOpen}
            messageMeta={messageMeta}
            onToggleMessagePin={toggleMessagePin}
            onToggleMessageSaved={toggleMessageSaved}
            onReactToMessage={reactToMessage}
            unreadMarker={activeGroupUnreadMarker}
            messageReplyTarget={messageReplyTarget}
            setMessageReplyTarget={setMessageReplyTarget}
            getSenderRoles={getSenderRoles}
            contacts={contacts}
            fetchRooms={fetchRooms}
            slowModeCooldowns={slowModeCooldowns}
            pinnedMessageIds={pinnedMessageIds}
            handleKickMember={handleKickMember}
            handleTransferOwnership={handleTransferOwnership}
            handleGetJoinRequests={handleGetJoinRequests}
            handleModerateJoinRequest={handleModerateJoinRequest}
            handleGetModerationLogs={handleGetModerationLogs}
            handleSearchPublicRooms={handleSearchPublicRooms}
            handleCreateRoomInviteLink={handleCreateRoomInviteLink}
            handleJoinViaInviteLink={handleJoinViaInviteLink}
            handleCreateJoinRequest={handleCreateJoinRequest}
            joinRequests={joinRequests}
            moderationLogs={moderationLogs}
            publicRoomsSearchResult={publicRoomsSearchResult}
          />
        )}
        </Suspense>
    </>
  );
}
