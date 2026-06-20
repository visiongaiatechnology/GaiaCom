import os

app_path = r"c:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM\Frontend\frontend\src\App.js"

with open(app_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Original line count:", len(lines))

# 1. Find where imports end and insert the new ones
import_end_idx = -1
for idx, line in enumerate(lines):
    if line.startswith('import '):
        import_end_idx = idx

if import_end_idx == -1:
    print("Error: import statements not found.")
    exit(1)

new_imports = [
    "import NavigationSidebar from './components/layout/NavigationSidebar';\n",
    "import ListPane from './components/layout/ListPane';\n",
    "import ChatPane from './components/chat/ChatPane';\n",
    "import GroupChatPane from './components/chat/GroupChatPane';\n",
    "import ComposerPane from './components/chat/ComposerPane';\n",
    "import ReaderPane from './components/chat/ReaderPane';\n",
    "import ProfilePane from './components/chat/ProfilePane';\n",
    "import AddContactModal from './components/modals/AddContactModal';\n",
    "import QuantumShieldModal from './components/modals/QuantumShieldModal';\n",
    "import CreateGroupModal from './components/modals/CreateGroupModal';\n",
    "import JoinGroupModal from './components/modals/JoinGroupModal';\n",
    "import CreateChannelModal from './components/modals/CreateChannelModal';\n",
    "import KeyChangeWarningModal from './components/modals/KeyChangeWarningModal';\n",
]

# 2. Find where main return statement starts
main_return_idx = -1
paren_count = 0
for idx in range(len(lines) - 1, -1, -1):
    line = lines[idx]
    paren_count += line.count(')')
    paren_count -= line.count('(')
    if 'return (' in line and paren_count <= 0:
        main_return_idx = idx
        break

if main_return_idx == -1:
    print("Error: main return statement not found.")
    exit(1)

print("Main return starts at line:", main_return_idx + 1)

# Construct the new file content
header_part = lines[:import_end_idx + 1] + new_imports + lines[import_end_idx + 1:main_return_idx]

new_return_jsx = """  return (
    <div className={`app-container ${mobileMenuOpen ? 'mobile-menu-open' : ''} ${hasActiveContent ? 'mobile-content-active' : ''} ${mailListCollapsed ? 'mail-list-collapsed' : ''}`}>
      
      {/* COLUMN 1: NAVIGATION & QUANTUM WIDGET */}
      <NavigationSidebar
        activeIdentity={activeIdentity}
        displayGaiaID={displayGaiaID}
        currentMenu={currentMenu}
        setCurrentMenu={setCurrentMenu}
        setIsComposing={setIsComposing}
        setSelectedMail={setSelectedMail}
        unreadEmailsCount={unreadEmailsCount}
        unreadChatsTotal={unreadChatsTotal}
        unreadRoomsTotal={unreadRoomsTotal}
        contacts={contacts}
        activeChatContact={activeChatContact}
        setActiveChatContact={setActiveChatContact}
        rooms={rooms}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        identities={identities}
        setShowWizard={setShowWizard}
        isLightMode={isLightMode}
        setIsLightMode={setIsLightMode}
        language={language}
        changeLanguage={changeLanguage}
        handleLock={handleLock}
        handleLogout={handleLogout}
        setShowQuantumShieldModal={setShowQuantumShieldModal}
        serverVersion={serverVersion}
        serverConsensus={serverConsensus}
        setMobileMenuOpen={setMobileMenuOpen}
        t={t}
        formatBadgeCount={formatBadgeCount}
      />

      {/* COLUMN 2: LIST PANE */}
      {!mailListCollapsed && (
        <ListPane
          currentMenu={currentMenu}
          contacts={contacts}
          setContacts={setContacts}
          rooms={rooms}
          activeRoom={activeRoom}
          setActiveRoom={setActiveRoom}
          activeChatContact={activeChatContact}
          setActiveChatContact={setActiveChatContact}
          selectedMail={selectedMail}
          setSelectedMail={setSelectedMail}
          setIsComposing={setIsComposing}
          setComposeTo={setComposeTo}
          setComposeSubject={setComposeSubject}
          setComposeBody={setComposeBody}
          setComposeReplyTo={setComposeReplyTo}
          activeMailsList={activeMailsList}
          readMessageIds={readMessageIds}
          getUnreadChatCount={getUnreadChatCount}
          getUnreadRoomCount={getUnreadRoomCount}
          formatBadgeCount={formatBadgeCount}
          setMailListCollapsed={setMailListCollapsed}
          setContactProfile={setContactProfile}
          user={user}
          t={t}
          displayGaiaID={displayGaiaID}
          parseToGaiaID={parseToGaiaID}
          buildInitialKeyHistory={buildInitialKeyHistory}
          triggerAlert={triggerAlert}
        />
      )}

      {/* COLUMN 3: READER / COMPOSER / PROFILE / CHAT PANE */}
      <main className="mail-content-pane" style={{ position: 'relative' }}>
        {mailListCollapsed && (
          <button 
            className="mail-list-expand-handle"
            onClick={() => setMailListCollapsed(false)}
            title="Liste ausklappen"
            style={{
              position: 'absolute',
              left: '0',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '60px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderLeft: 'none',
              borderRadius: '0 8px 8px 0',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              fontSize: '0.8rem',
              boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            ▶
          </button>
        )}

        {/* CHAT MODE */}
        {currentMenu === 'chat' && (
          <ChatPane
            activeChatContact={activeChatContact}
            chatMessages={chatMessages}
            activeIdentity={activeIdentity}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            handleSendChatMessage={handleSendChatMessage}
            setActiveChatContact={setActiveChatContact}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            handleDeleteChatMessage={handleDeleteChatMessage}
            handleClearDirectChat={handleClearDirectChat}
            openContactProfile={openContactProfile}
            t={t}
            displayGaiaID={displayGaiaID}
          />
        )}

        {/* GROUP CHAT */}
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
          />
        )}

        {/* COMPOSER MODE */}
        {isComposing && currentMenu !== 'chat' && currentMenu !== 'profile' && currentMenu !== 'groups' && (
          <ComposerPane
            isSmtpMode={isSmtpMode}
            setIsSmtpMode={setIsSmtpMode}
            composeTo={composeTo}
            setComposeTo={setComposeTo}
            composeSubject={composeSubject}
            setComposeSubject={setComposeSubject}
            composeBody={composeBody}
            setComposeBody={setComposeBody}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            uploadFile={uploadFile}
            uploadProgress={uploadProgress}
            composeError={composeError}
            handleSendMail={handleSendMail}
            setIsComposing={setIsComposing}
            t={t}
          />
        )}

        {/* READER MODE */}
        <ReaderPane
          selectedMail={selectedMail}
          activeIdentity={activeIdentity}
          handleReplyMail={handleReplyMail}
          handleExportDisclosurePackage={handleExportDisclosurePackage}
          handleReportMail={handleReportMail}
          setSelectedMail={setSelectedMail}
          isComposing={isComposing}
          currentMenu={currentMenu}
          openContactProfile={openContactProfile}
          t={t}
        />

        {/* PROFILE MODE */}
        {currentMenu === 'profile' && (
          <ProfilePane
            activeIdentity={activeIdentity}
            displayGaiaID={displayGaiaID}
            profileAvatar={profileAvatar}
            setProfileAvatar={setProfileAvatar}
            profileDisplayName={profileDisplayName}
            setProfileDisplayName={setProfileDisplayName}
            profileBio={profileBio}
            setProfileBio={setProfileBio}
            saveProfile={saveProfile}
            handleAvatarFileChange={handleAvatarFileChange}
            currentPasswordInput={currentPasswordInput}
            setCurrentPasswordInput={setCurrentPasswordInput}
            newPasswordInput={newPasswordInput}
            setNewPasswordInput={setNewPasswordInput}
            confirmPasswordInput={confirmPasswordInput}
            setConfirmPasswordInput={setConfirmPasswordInput}
            passwordChangeError={passwordChangeError}
            handleChangePassword={handleChangePassword}
            areKeysUnlocked={areKeysUnlocked}
            profilePasswordInput={profilePasswordInput}
            setProfilePasswordInput={setProfilePasswordInput}
            handleUnlockProfileKeys={handleUnlockProfileKeys}
            profileUnlockError={profileUnlockError}
            derivedKeys={derivedKeys}
            mnemonic={mnemonic}
            setAreKeysUnlocked={setAreKeysUnlocked}
            setCurrentMenu={setCurrentMenu}
            t={t}
          />
        )}
      </main>

      {/* CUSTOM ALERTS MODALS */}
      {alertConfig && (
        <div className="popup-overlay">
          <div className="popup-card glass-panel" style={{ borderColor: alertConfig.type === 'danger' ? 'var(--danger)' : alertConfig.type === 'warning' ? 'var(--warning)' : 'var(--accent-cyan)' }}>
            <div className="popup-icon" style={{ 
              color: alertConfig.type === 'danger' ? 'var(--danger)' : alertConfig.type === 'warning' ? 'var(--warning)' : 'var(--accent-cyan)',
              background: alertConfig.type === 'danger' ? 'var(--danger-glow)' : alertConfig.type === 'warning' ? 'var(--warning-glow)' : 'rgba(0, 242, 254, 0.1)'
            }}>
              {alertConfig.type === 'danger' ? '✖' : alertConfig.type === 'warning' ? '⚠️' : '✓'}
            </div>
            <div className="popup-title">{alertConfig.title}</div>
            <div className="popup-text">{alertConfig.text}</div>
            <button className="btn-primary" onClick={() => setAlertConfig(null)}>{t('close') || 'Schließen'}</button>
          </div>
        </div>
      )}

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

      {/* MODAL: GROUP SETTINGS */}
      {showGroupSettingsModal && (
        <GroupSettingsModal
          name={editGroupName}
          description={editGroupDescription}
          avatar={editGroupAvatar}
          onNameChange={setEditGroupName}
          onDescriptionChange={setEditGroupDescription}
          onAvatarChange={setEditGroupAvatar}
          onSubmit={handleUpdateGroupSettings}
          onClose={() => setShowGroupSettingsModal(false)}
          onDelete={handleDeleteGroup}
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
    </div>
  );
}

export default App;
"""

with open(app_path, 'w', encoding='utf-8') as f:
    f.writelines(header_part)
    f.write(new_return_jsx)

print("App.js refactored successfully.")
