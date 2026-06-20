import React from 'react';
import { renderMarkdown } from '../../utils/markdown';

const CHAT_EMOJIS = ['😀', '😄', '😂', '😊', '😍', '😎', '🤝', '🙏', '👍', '🔥', '✨', '🚀', '🔒', '🛡️', '⚡', '✅', '❗', '❤️'];

export const ChatPane = ({
  activeChatContact,
  chatMessages,
  activeIdentity,
  chatInputText,
  setChatInputText,
  handleSendChatMessage,
  setActiveChatContact,
  showEmojiPicker,
  setShowEmojiPicker,
  handleDeleteChatMessage,
  handleClearDirectChat,
  openContactProfile,
  t,
  displayGaiaID
}) => {
  const appendChatEmoji = (emoji) => {
    setChatInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (!activeChatContact) {
    return (
      <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <h3>{t('kein_chat_ausgewaehlt') || 'Kein Chat ausgewählt'}</h3>
        <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>{t('select_contact_chat') || 'Wähle einen Kontakt aus dem linken Panel aus, um einen quantensicheren E2E-Chat zu starten.'}</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <header className="reader-header" style={{ padding: '10px 20px', background: 'transparent' }}>
        <button type="button" className="mobile-back-btn" onClick={() => setActiveChatContact(null)}>← {t('quanten_chat') || 'Chats'}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '1.8rem' }}>💬</div>
          <div>
            <button type="button" className="link-button contact-name-button" onClick={() => openContactProfile(activeChatContact.gaiaID)}>
              {activeChatContact.displayName}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{displayGaiaID(activeChatContact.gaiaID)}</span>
          </div>
        </div>
        <button type="button" className="btn-secondary chat-header-action" onClick={handleClearDirectChat}>
          {t('clear_chat') || 'Clear Chat'}
        </button>
      </header>

      <div className="chat-messages">
        {chatMessages
          .filter(msg => 
            (msg.sender === activeChatContact.gaiaID && msg.recipient === activeIdentity.GaiaID) ||
            (msg.sender === activeIdentity.GaiaID && msg.recipient === activeChatContact.gaiaID)
          )
          .map(msg => {
            const isOutgoing = msg.sender === activeIdentity.GaiaID;
            return (
              <div key={msg.id} className={`chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
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
        {chatMessages.filter(msg => 
          (msg.sender === activeChatContact.gaiaID && msg.recipient === activeIdentity.GaiaID) ||
          (msg.sender === activeIdentity.GaiaID && msg.recipient === activeChatContact.gaiaID)
        ).length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto', fontSize: '0.85rem' }}>
            {t('chat_start_hint') || 'Starten Sie die Konversation! Alle Chat-Nachrichten sind quantensicher E2E verschlüsselt.'}
          </div>
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSendChatMessage}>
        <div className="emoji-control">
          <button type="button" className="btn-secondary emoji-toggle" onClick={() => setShowEmojiPicker(prev => !prev)}>
            🙂
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker" role="listbox" aria-label="Emoji Auswahl">
              {CHAT_EMOJIS.map(emoji => (
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
          placeholder={t('chat_input_placeholder') || 'Sichere Nachricht eingeben...'}
          value={chatInputText}
          onChange={e => setChatInputText(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary">
          {t('senden') || 'Senden'}
        </button>
      </form>
    </div>
  );
};

export default ChatPane;
