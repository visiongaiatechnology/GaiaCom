import ListPane from '../../layout/ListPane';
import React from 'react';
import { buildInitialKeyHistory } from '../../../utils/keyHistory';
import { displayGaiaID } from '../../../utils/gaiaAddress';
import { parseToGaiaID } from '../../../utils/gaiaAddress';

/*
 * List column host: forwards the exact ListPane prop set (moved verbatim).
 */
export default function AppListPane({ui, auth, data, derived, t}) {
  const {
    activeIdentity, activeProfileSection, contacts, currentMenu, setActiveProfileSection, setContacts,
    setCurrentMenu, setMailListCollapsed, setMobileMenuOpen, setPublicChannelCreatorOpen, showConfirm,
    triggerAlert,
  } = ui;
  const { user } = auth;
  const {
    driveRecords, driveUnlocked, prepareDriveRecordForChatShare, selectedDriveRecord,
    setSelectedDriveRecord,
  } = data.drive;
  const { gaiaDropInbox, gaiaDropLoading, handleSelectDrop, loadGaiaDropInbox, selectedDrop, setSelectedDrop } = data.drop;
  const {
    activeDraftIdRef, labelsList, mailboxLabel, mailboxSearch, saveLabel,
    selectedMail, setComposeBody, setComposeReplyTo, setComposeSubject, setComposeTo, setIsComposing,
    setIsSmtpMode, setMailboxLabel, setMailboxSearch, setSelectedMail, snoozeMail,
    updateMailboxState,
  } = data.emails;
  const {
    activeChatContact, activeRoom, chatMessages, fetchRooms, handleClearDirectChat, handleDeleteGroup,
    handleLeaveRoom, rooms, setActiveChatContact, setActiveRoom, setChatMessages,
    setShowCreateGroupModal, setShowJoinGroupModal,
  } = data.chat;
  const { openContactProfile } = data.contactActions;
  const {
    activePublicChannel, publicChannels, publicChannelsLoading, refreshPublicChannels,
    setActivePublicChannel,
  } = data.publicChannels;
  const { activeMailsList, formatBadgeCount, getUnreadChatCount, getUnreadRoomCount } = derived;

  return (
    <ListPane
          currentMenu={currentMenu}
          setCurrentMenu={setCurrentMenu}
          contacts={contacts}
          setContacts={setContacts}
          rooms={rooms}
          activeRoom={activeRoom}
          setActiveRoom={setActiveRoom}
          publicChannels={publicChannels}
          activePublicChannel={activePublicChannel}
          setActivePublicChannel={setActivePublicChannel}
          setPublicChannelCreatorOpen={setPublicChannelCreatorOpen}
          publicChannelsLoading={publicChannelsLoading}
          refreshPublicChannels={refreshPublicChannels}
          activeChatContact={activeChatContact}
          setActiveChatContact={setActiveChatContact}
          selectedMail={selectedMail}
          setSelectedMail={setSelectedMail}
          setIsComposing={setIsComposing}
          setComposeTo={setComposeTo}
          setComposeSubject={setComposeSubject}
          setComposeBody={setComposeBody}
          setComposeReplyTo={setComposeReplyTo}
          setMobileMenuOpen={setMobileMenuOpen}
          activeMailsList={activeMailsList}
          getUnreadChatCount={getUnreadChatCount}
          getUnreadRoomCount={getUnreadRoomCount}
          formatBadgeCount={formatBadgeCount}
          setMailListCollapsed={setMailListCollapsed}
          openContactProfile={openContactProfile}
          driveUnlocked={driveUnlocked}
          driveRecords={driveRecords}
          prepareDriveRecordForChatShare={prepareDriveRecordForChatShare}
          selectedDriveRecord={selectedDriveRecord}
          setSelectedDriveRecord={setSelectedDriveRecord}
          gaiaDropInbox={gaiaDropInbox}
          selectedDrop={selectedDrop}
          setSelectedDrop={handleSelectDrop}
          activeIdentity={activeIdentity}
          loadGaiaDropInbox={loadGaiaDropInbox}
          gaiaDropLoading={gaiaDropLoading}
          user={user}
          t={t}
          displayGaiaID={displayGaiaID}
          parseToGaiaID={parseToGaiaID}
          buildInitialKeyHistory={buildInitialKeyHistory}
          triggerAlert={triggerAlert}
          showConfirm={showConfirm}
          setShowCreateGroupModal={setShowCreateGroupModal}
          setShowJoinGroupModal={setShowJoinGroupModal}
          activeProfileSection={activeProfileSection}
          setActiveProfileSection={setActiveProfileSection}
          handleClearDirectChat={handleClearDirectChat}
          handleLeaveRoom={handleLeaveRoom}
          handleDeleteGroup={handleDeleteGroup}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          fetchRooms={fetchRooms}
          mailboxSearch={mailboxSearch}
          setMailboxSearch={setMailboxSearch}
          mailboxLabel={mailboxLabel}
          setMailboxLabel={setMailboxLabel}
          labelsList={labelsList}
          updateMailboxState={updateMailboxState}
          snoozeMail={snoozeMail}
          saveLabel={saveLabel}
          activeDraftIdRef={activeDraftIdRef}
          setIsSmtpMode={setIsSmtpMode}
        />
  );
}
