import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../ui/Icon';
import AvatarMark from '../profile/ui/AvatarMark';

const senderOf = message => message?.sender || message?.Sender || '';
const recipientOf = message => message?.recipient || message?.Recipient || '';
const textOf = message => message?.text || message?.Text || message?.body || message?.Body || '';
const timeOf = message => message?.timestamp || message?.Timestamp || message?.createdAt || message?.CreatedAt || '';

function formatClock(isoString) {
  const timestamp = Date.parse(isoString);
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Nachrichten-Popup (unten rechts). Es nutzt ausschließlich den echten
 * GaiaCom-Chat: reale Kontakte, reale Nachrichtenliste und den realen
 * Sende-Handler der Anwendung.
 */
export default function GsnChatDock({
  open,
  onClose,
  contacts = [],
  chatMessages = [],
  activeIdentity,
  activeChatContact,
  setActiveChatContact,
  chatInputText = '',
  setChatInputText,
  handleSendChatMessage,
  onOpenFullChat,
  t
}) {
  const [search, setSearch] = useState('');
  const streamRef = useRef(null);
  const myGaiaID = activeIdentity?.GaiaID || '';

  const conversations = useMemo(() => {
    const lastByGaia = new Map();
    (Array.isArray(chatMessages) ? chatMessages : []).forEach(message => {
      const sender = senderOf(message);
      const recipient = recipientOf(message);
      if (!sender && !recipient) return;
      const other = sender === myGaiaID ? recipient : sender;
      if (!other || other === myGaiaID) return;
      const timestamp = Date.parse(timeOf(message)) || 0;
      const current = lastByGaia.get(other);
      if (!current || timestamp > current.timestamp) {
        lastByGaia.set(other, { timestamp, text: textOf(message) });
      }
    });

    const query = search.trim().toLowerCase();
    return (Array.isArray(contacts) ? contacts : [])
      .filter(Boolean)
      .map(contact => {
        const id = contact.gaiaID || contact.GaiaID || '';
        const last = lastByGaia.get(id);
        return {
          id,
          displayName: contact.displayName || contact.DisplayName || contact.name || id,
          avatar: contact.avatar || contact.Avatar || '',
          lastTimestamp: last?.timestamp || 0,
          lastText: last?.text || ''
        };
      })
      .filter(item => Boolean(item.id))
      .filter(item => {
        if (!query) return true;
        return (
          String(item.displayName).toLowerCase().includes(query) ||
          String(item.id).toLowerCase().includes(query)
        );
      })
      .sort((left, right) =>
        right.lastTimestamp - left.lastTimestamp || left.displayName.localeCompare(right.displayName, 'de'));
  }, [contacts, chatMessages, myGaiaID, search]);

  const activeGaiaID = activeChatContact?.gaiaID || activeChatContact?.GaiaID || '';
  const activeName = activeChatContact?.displayName || activeChatContact?.DisplayName || activeGaiaID;
  const thread = useMemo(() => {
    if (!activeGaiaID) return [];
    return (Array.isArray(chatMessages) ? chatMessages : []).filter(message => {
      const sender = senderOf(message);
      const recipient = recipientOf(message);
      return (
        (sender === myGaiaID && recipient === activeGaiaID) ||
        (sender === activeGaiaID && recipient === myGaiaID)
      );
    });
  }, [chatMessages, activeGaiaID, myGaiaID]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [thread.length, activeGaiaID, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <aside className="vgt-gsn-chatdock" role="dialog" aria-label="Nachrichten">
      <header className="vgt-gsn-chatdock__head">
        <div className="vgt-gsn-chatdock__title-row">
          {activeGaiaID ? (
            <button
              type="button"
              className="btn-icon"
              onClick={() => setActiveChatContact?.(null)}
              aria-label="Zurück zur Kontaktliste"
            >
              <Icon name="arrowLeft" size={16} />
            </button>
          ) : (
            <span className="vgt-gsn-chatdock__mark" aria-hidden="true">
              <Icon name="chat" size={16} />
            </span>
          )}
          <div className="vgt-gsn-chatdock__title">
            <strong>{activeGaiaID ? activeName : 'Nachrichten'}</strong>
            <span>{activeGaiaID ? 'Direktchat · Ende-zu-Ende verschlüsselt' : 'Echter GaiaCom-Chat'}</span>
          </div>
        </div>
        <div className="vgt-gsn-chatdock__actions">
          <button
            type="button"
            className="btn-icon"
            onClick={onOpenFullChat}
            title="Im GaiaCom-Chat öffnen"
            aria-label="Im GaiaCom-Chat öffnen"
          >
            <Icon name="external" size={16} />
          </button>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Nachrichten schließen">
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>

      {!activeGaiaID ? (
        <div className="vgt-gsn-chatdock__body">
          <label className="vgt-gsn-chatdock__search">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Kontakt suchen"
              aria-label="Kontakt suchen"
            />
          </label>
          {conversations.length === 0 ? (
            <p className="vgt-gsn-section__state">
              {contacts.length === 0
                ? 'Noch keine Kontakte im Adressbuch.'
                : 'Kein Kontakt passt zur Suche.'}
            </p>
          ) : (
            <ul className="vgt-gsn-chatdock__contacts">
              {conversations.map(conversation => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className="vgt-gsn-chatdock__contact"
                    onClick={() =>
                      setActiveChatContact?.({
                        gaiaID: conversation.id,
                        displayName: conversation.displayName
                      })
                    }
                  >
                    <AvatarMark
                      avatar={conversation.avatar}
                      displayName={conversation.displayName}
                      variant="default"
                      className="vgt-gsn-chatdock__avatar"
                    />
                    <span className="vgt-gsn-chatdock__contact-copy">
                      <strong>{conversation.displayName}</strong>
                      <span>{conversation.lastText || 'Noch keine Nachricht'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="vgt-gsn-chatdock__stream" ref={streamRef}>
            {thread.length === 0 ? (
              <p className="vgt-gsn-section__state">Noch keine Nachrichten – schreibe die erste.</p>
            ) : (
              thread.map((message, index) => {
                const mine = senderOf(message) === myGaiaID;
                return (
                  <div key={message.id || `${index}`} className={`vgt-gsn-chatdock__msg${mine ? ' is-own' : ''}`}>
                    <p>{textOf(message)}</p>
                    <time>{formatClock(timeOf(message))}</time>
                  </div>
                );
              })
            )}
          </div>
          <form className="vgt-gsn-chatdock__composer" onSubmit={handleSendChatMessage}>
            <input
              type="text"
              value={chatInputText}
              onChange={event => setChatInputText?.(event.target.value)}
              placeholder="Nachricht schreiben…"
              aria-label="Nachricht schreiben"
            />
            <button type="submit" className="btn-primary" disabled={!String(chatInputText || '').trim()} aria-label="Nachricht senden">
              <Icon name="send" size={15} />
            </button>
          </form>
        </>
      )}
    </aside>
  );
}
