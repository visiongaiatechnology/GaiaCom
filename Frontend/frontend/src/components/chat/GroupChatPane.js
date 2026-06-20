import React, { useState } from 'react';
import { renderMarkdown } from '../../utils/markdown';
import { parseToGaiaID } from '../../utils/gaiaAddress';

export const GroupChatPane = ({
  activeRoom,
  channels,
  activeChannel,
  setActiveChannel,
  chatMessages,
  activeIdentity,
  chatInputText,
  setChatInputText,
  handleSendGroupMessage,
  handleUpdateMemberRole,
  handleLeaveRoom,
  setShowCreateChannelModal,
  triggerAlert,
  displayGaiaID,
  t,
  openContactProfile,
  handleOpenGroupSettings,
  handleDeleteChatMessage,
  handleClearGroupChannel,
  setActiveRoom,
  setMobileMenuOpen
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isCrisis = activeRoom?.Description && activeRoom.Description.startsWith('[CRISIS]');

  const appendChatEmoji = (emoji) => {
    setChatInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (!activeRoom) {
    return (
      <aside className="group-sidebar" style={{ width: '100%', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        {t('keine_gruppe_ausgewaehlt') || 'Keine Gruppe ausgewählt.'}
      </aside>
    );
  }

  return (
    <div className="group-chat-layout" style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div className="detail-mobile-actions">
        <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
          Menu
        </button>
        <button type="button" className="mobile-back-btn" onClick={() => setActiveRoom(null)}>
          {t('gruppen_chats') || 'Gruppen'}
        </button>
        {activeChannel && (
          <button type="button" className="mobile-back-btn" onClick={() => setActiveChannel(null)}>
            {t('kanaele') || 'Kanaele'}
          </button>
        )}
      </div>
      {/* GROUP SIDEBAR (CHANNELS & MEMBERS) */}
      <aside className="group-sidebar" style={{ width: '260px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
        <div className="group-nav-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', borderBottom: '1px solid var(--border-color)', gap: '4px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {activeRoom.Name}
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {(activeRoom.CreatorID === activeIdentity?.ID || activeRoom.CreatedBy === activeIdentity?.ID || activeRoom.Members?.find(m => m.IdentityID === activeIdentity?.ID && m.Role === 'admin')) && (
              <button className="btn-action" style={{ padding: '2px 6px', fontSize: '0.65rem' }} onClick={() => setShowCreateChannelModal(true)}>
                {t('kanal_erstellen') || '+ Kanal'}
              </button>
            )}
            {(activeRoom.CreatorID === activeIdentity?.ID || activeRoom.CreatedBy === activeIdentity?.ID || activeRoom.Members?.find(m => m.IdentityID === activeIdentity?.ID && m.Role === 'admin')) && (
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '2px 5px', fontSize: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.8 }} 
                onClick={handleOpenGroupSettings}
                title={t('group_settings_title') || 'Einstellungen'}
              >
                ⚙️
              </button>
            )}
          </div>
        </div>
        
        {/* Channels Section */}
        <div className="channel-list">
          <div className="channel-header">
            <span>{t('kanaele') || '# Kanäle'}</span>
          </div>
          {channels.map(ch => (
            <div 
              key={ch.id} 
              className={`channel-item ${activeChannel?.id === ch.id ? 'active' : ''}`}
              onClick={() => setActiveChannel(ch)}
            >
              <span># {ch.name}</span>
            </div>
          ))}
        </div>

        {/* Members Section */}
        <div className="group-sidebar-title">{t('mitglieder') || 'Mitglieder'} ({activeRoom.Members?.length || 0})</div>
        <div className="group-members-list" style={{ flex: 1 }}>
          {activeRoom.Members?.map(m => {
            const isSelf = m.IdentityID === activeIdentity?.ID;
            const isAdmin = m.Role === 'admin';
            const actorIsAdmin = activeRoom.Members.find(member => member.IdentityID === activeIdentity?.ID)?.Role === 'admin';
            
            return (
              <div 
                key={m.IdentityID} 
                className="group-member-item" 
                style={{ padding: '4px 0', cursor: m.Identity?.GaiaID ? 'pointer' : 'default' }}
                onClick={() => m.Identity?.GaiaID && openContactProfile(m.Identity.GaiaID)}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                    {m.Identity?.DisplayName || m.Username} {isSelf && '(Du)'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {m.Identity ? displayGaiaID(m.Identity.GaiaID) : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                  {actorIsAdmin && !isSelf ? (
                    <select 
                      className="member-role" 
                      value={m.Role} 
                      onChange={(e) => handleUpdateMemberRole(m.IdentityID, e.target.value)}
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.65rem', borderRadius: '4px', padding: '2px' }}
                    >
                      <option value="member">{t('mitglied') || 'Mitglied'}</option>
                      <option value="admin">{t('admin') || 'Admin'}</option>
                    </select>
                  ) : (
                    <span className={`member-role ${isAdmin ? 'admin' : ''}`}>
                      {m.Role === 'admin' ? (t('admin') || 'admin') : (t('mitglied') || 'member')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isCrisis ? (
          <>
            {/* Security Policy Section */}
            <div style={{ padding: '10px 15px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
                🛡️ Raum-Richtlinien
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <div style={{ marginBottom: '4px' }}>• <strong>Krisenraum:</strong> Audit-Trail & Key-Rotation aktiv.</div>
                <div>• <strong>Policy:</strong> Zero-Knowledge-Raum. E2EE quantensicher.</div>
              </div>
            </div>

            {/* Pinned Notes Section */}
            <div style={{ padding: '10px 15px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
                📌 Angeheftete Sicherheitsnotiz
              </div>
              <div style={{ padding: '8px', background: 'rgba(255,193,7,0.03)', border: '1px dashed var(--warning)', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                ⚠️ <strong>Sicherheits-Notiz:</strong> Alle Schlüsselwechsel werden über Key Transparency validiert. Nutzen Sie GaiaVault für private Backup-Logs.
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '10px 15px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              💬 Status
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Standard-Gruppenchat (E2EE verschlüsselt)
            </div>
          </div>
        )}
        
        {/* Leave Group Action */}
        <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn-secondary" style={{ width: '100%', padding: '8px', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.8rem' }} onClick={() => handleLeaveRoom(activeRoom.ID)}>
            {t('gruppe_verlassen') || 'Gruppe verlassen'}
          </button>
          {activeRoom.SecretHash && (
            <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 'bold', display: 'block', color: 'var(--accent-cyan)' }}>{t('einladungscode') || 'Einladungscode:'}</span>
              <code style={{ wordBreak: 'break-all', display: 'block', background: 'rgba(0,0,0,0.2)', padding: '4px', marginTop: '4px', borderRadius: '4px' }}>{activeRoom.SecretHash}</code>
              <button 
                className="btn-action" 
                style={{ width: '100%', marginTop: '6px', fontSize: '0.65rem', padding: '4px 0' }}
                onClick={() => {
                  navigator.clipboard.writeText(activeRoom.SecretHash);
                  triggerAlert(t('kopiert') || 'Kopiert', t('code_kopieren_success') || 'Der Einladungscode wurde kopiert.');
                }}
              >
                {t('code_kopieren') || 'Code kopieren'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* CHAT MAIN SECTION */}
      <div className="chat-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeChannel ? (
          <>
            <header className="reader-header" style={{ padding: '10px 20px', background: 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '1.8rem' }}>#</div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>#{activeChannel.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Kanal-ID: {activeChannel.id}</span>
                </div>
              </div>
              <button type="button" className="btn-secondary chat-header-action" onClick={handleClearGroupChannel}>
                {t('clear_chat') || 'Clear Chat'}
              </button>
            </header>

            <div className="chat-messages" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {chatMessages
                .filter(msg => msg.channelId === activeChannel.id)
                .map(msg => {
                  const isOutgoing = 
                    (msg.sender && activeIdentity?.ID && msg.sender === activeIdentity.ID) ||
                    (msg.sender && activeIdentity?.GaiaID && parseToGaiaID(msg.sender) === parseToGaiaID(activeIdentity.GaiaID)) ||
                    (msg.senderGaia && activeIdentity?.GaiaID && parseToGaiaID(msg.senderGaia) === parseToGaiaID(activeIdentity.GaiaID));
                  
                  const senderMember = activeRoom.Members?.find(m => 
                    m.IdentityID === msg.sender || 
                    (m.Identity?.GaiaID && parseToGaiaID(m.Identity.GaiaID) === parseToGaiaID(msg.sender)) ||
                    (m.Identity?.GaiaID && parseToGaiaID(m.Identity.GaiaID) === parseToGaiaID(msg.senderGaia))
                  );
                  const senderName = isOutgoing 
                    ? (activeIdentity?.DisplayName || activeIdentity?.displayName || 'Du')
                    : (senderMember?.Identity?.DisplayName || senderMember?.Username || (msg.senderGaia ? displayGaiaID(msg.senderGaia) : '') || (msg.sender ? displayGaiaID(msg.sender) : 'Unbekannt'));
                  
                  return (
                    <div key={msg.id} className={`chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                      {!isOutgoing && (
                        <button 
                          type="button" 
                          className="link-button contact-name-button" 
                          style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent-cyan)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'block', textAlign: 'left', marginBottom: '4px' }}
                          onClick={() => openContactProfile(msg.sender || msg.senderGaia)}
                        >
                          {senderName}
                        </button>
                      )}
                      <div>{renderMarkdown(msg.body)}</div>
                      <div className="chat-bubble-meta">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button type="button" className="chat-delete-btn" onClick={() => handleDeleteChatMessage(msg.id)}>
                          {t('delete') || 'Loeschen'}
                        </button>
                        {msg.untrusted && <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>⚠️ Untrusted</span>}
                      </div>
                    </div>
                  );
                })
              }
              {chatMessages.filter(msg => msg.channelId === activeChannel.id).length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto', fontSize: '0.85rem' }}>
                  {t('room_chat_start_hint') || 'Starten Sie die Konversation! Alle Nachrichten in diesem Gruppenkanal sind dezentral quantensicher E2E verschlüsselt.'}
                </div>
              )}
            </div>

            <form className="chat-input-row" onSubmit={handleSendGroupMessage}>
              <div className="emoji-control">
                <button type="button" className="btn-secondary emoji-toggle" onClick={() => setShowEmojiPicker(prev => !prev)}>
                  🙂
                </button>
                {showEmojiPicker && (
                  <div className="emoji-picker" role="listbox" aria-label="Emoji Auswahl">
                    {['😀', '😄', '😂', '😊', '😍', '😎', '🤝', '🙏', '👍', '🔥', '✨', '🚀', '🔒', '🛡️', '⚡', '✅', '❗', '❤️'].map(emoji => (
                      <button type="button" key={emoji} onClick={() => appendChatEmoji(emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder={activeChannel ? (t('message_to_channel') + ' #' + activeChannel.name) : `Nachricht an #${activeChannel.name}...`}
                value={chatInputText}
                onChange={e => setChatInputText(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary">
                {t('senden') || 'Senden'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <h3>{t('kein_kanal_ausgewaehlt') || 'Kein Kanal ausgewählt'}</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>{t('select_channel_chat') || 'Wähle einen Kanal aus der linken Seitenleiste aus, um zu chatten.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatPane;
