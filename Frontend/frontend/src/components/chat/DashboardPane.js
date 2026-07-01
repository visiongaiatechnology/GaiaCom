// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

export const DashboardPane = ({
  rooms,
  contacts,
  chatMessages,
  inboxEmails,
  activeIdentity,
  setCurrentMenu,
  setActiveChatContact,
  setActiveRoom,
  setShowCreateGroupModal,
  deferredPrompt,
  handleInstallApp,
  t
}) => {
  const recentEmails = React.useMemo(() => {
    return [...inboxEmails]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);
  }, [inboxEmails]);

  const recentChats = React.useMemo(() => {
    const contactsWithLatestMsg = contacts.map(contact => {
      const contactMessages = chatMessages.filter(msg =>
        (msg.sender === contact.gaiaID && msg.recipient === activeIdentity?.GaiaID) ||
        (msg.sender === activeIdentity?.GaiaID && msg.recipient === contact.gaiaID)
      );
      const latestMsg = contactMessages.length > 0
        ? contactMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        : null;
      return { contact, latestMsg };
    });

    return contactsWithLatestMsg
      .filter(item => item.latestMsg !== null)
      .sort((a, b) => new Date(b.latestMsg.createdAt) - new Date(a.latestMsg.createdAt))
      .slice(0, 4);
  }, [contacts, chatMessages, activeIdentity]);

  const handleOpenEmail = () => {
    setCurrentMenu('inbox');
  };

  const handleOpenChat = contact => {
    setActiveChatContact(contact);
    setCurrentMenu('chat');
  };

  const handleOpenRoom = room => {
    setActiveRoom(room);
    setCurrentMenu('groups');
  };

  return (
    <div className="dashboard-container gaia-scrollbar">
      <header className="dashboard-header-row">
        <div className="dashboard-title-area">
          <h1>{t('kommandozentrale') || 'Kommandozentrale'}</h1>
          <div className="dashboard-session-status">
            <span>{'\u{1F512}'}</span>
            <span>
              {(t('session_encrypted') || 'Sitzung verschlüsselt: {name}').replace(
                '{name}',
                activeIdentity ? (activeIdentity.DisplayName || activeIdentity.displayName) : (t('no_id') || 'Keine ID')
              )}
            </span>
          </div>
        </div>
        <div className="dashboard-network-pill-container">
          <div className="dashboard-network-pill">
            <span className="pulse-dot"></span>
            <span>{t('network_online') || 'NETWORK: ONLINE'}</span>
          </div>
          <button
            type="button"
            className="dashboard-refresh-btn"
            onClick={() => window.location.reload()}
            title="Neu laden"
          >
            {'\u{1F504}'}
          </button>
        </div>
      </header>

      {deferredPrompt && (
        <section className="dashboard-install-banner">
          <div className="dashboard-install-info">
            <span className="dashboard-install-icon">{'\u{1F4F1}'}</span>
            <div className="dashboard-install-text">
              <h4>{t('install_app') || 'GaiaCOM App installieren'}</h4>
              <p>{t('install_app_desc') || 'Für schnellen Start & Offline-Modus'}</p>
            </div>
          </div>
          <button type="button" className="dashboard-install-btn" onClick={handleInstallApp}>
            {t('install_app') || 'App installieren'}
          </button>
        </section>
      )}

      <section className="dashboard-grid-cards">
        <div className="dashboard-card glass-panel nebula-metric-card nebula-metric-card-blue">
          <div className="dashboard-card-top">
            <span className="dashboard-card-label">{t('connected_rooms') || 'VERBUNDENE RÄUME'}</span>
            <span className="dashboard-card-icon" aria-hidden="true">{'\u{1F465}'}</span>
          </div>
          <div className="dashboard-card-value">{rooms.length}</div>
          <div className="dashboard-card-bar-container">
            <div className="dashboard-card-bar" style={{ width: rooms.length > 0 ? '100%' : '0%' }}></div>
          </div>
        </div>

        <div className="dashboard-card glass-panel nebula-metric-card nebula-metric-card-purple">
          <div className="dashboard-card-top">
            <span className="dashboard-card-label">{t('primary_identity') || 'PRIMÄRE IDENTITÄT'}</span>
            <span className="dashboard-card-icon" aria-hidden="true">#</span>
          </div>
          <div className="dashboard-card-value" style={{ fontSize: activeIdentity ? '1.25rem' : '1.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeIdentity ? (activeIdentity.DisplayName || activeIdentity.displayName) : (t('no_id') || 'Keine ID')}
          </div>
          <div className="dashboard-card-footer-pill verified">
            <span>{'\u{1F512}'} ML-KEM VERIFIED</span>
          </div>
        </div>

        <div className="dashboard-card glass-panel nebula-metric-card nebula-metric-card-green" style={{ borderBottom: '2px solid var(--success)' }}>
          <div className="dashboard-card-top">
            <span className="dashboard-card-label">{t('gaiacom_uplink') || 'GAIACOM UPLINK'}</span>
            <span className="dashboard-card-icon" aria-hidden="true">{'\u{1F4C8}'}</span>
          </div>
          <div className="dashboard-card-value" style={{ color: 'var(--success)', textShadow: '0 0 10px rgba(46, 213, 115, 0.2)' }}>
            Online
          </div>
          <div className="dashboard-card-bar-container">
            <div className="dashboard-card-bar" style={{ background: 'var(--success)', width: '100%' }}></div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid-feed">
        <div className="dashboard-feed-pane glass-panel">
          <div className="dashboard-feed-header">
            <span className="dashboard-feed-title">{'\u2709\uFE0F'} {t('recent_messages') || 'Neueste Nachrichten'}</span>
          </div>
          <div className="dashboard-feed-list gaia-scrollbar">
            {recentEmails.length === 0 ? (
              <div className="dashboard-feed-empty">
                <span className="dashboard-feed-empty-icon">{'\u{1F4EC}'}</span>
                <span>{t('empty_messages') || 'Keine neuen Nachrichten vorhanden.'}</span>
              </div>
            ) : (
              recentEmails.map(email => (
                <div key={email.id} className="dashboard-feed-item" onClick={() => handleOpenEmail(email)}>
                  <div className="dashboard-feed-item-avatar">{'\u2709\uFE0F'}</div>
                  <div className="dashboard-feed-item-content">
                    <div className="dashboard-feed-item-header">
                      <span className="dashboard-feed-item-sender">{email.sender}</span>
                      <span className="dashboard-feed-item-time">
                        {new Date(email.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="dashboard-feed-item-preview">{email.subject}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="dashboard-feed-footer">
            <button type="button" className="btn-secondary dashboard-feed-footer-btn" onClick={() => setCurrentMenu('inbox')}>
              {t('open_inbox') || 'Posteingang öffnen'}
            </button>
          </div>
        </div>

        <div className="dashboard-feed-pane glass-panel">
          <div className="dashboard-feed-header">
            <span className="dashboard-feed-title">{'\u{1F4AC}'} {t('recent_chats') || 'Neue Chats'}</span>
          </div>
          <div className="dashboard-feed-list gaia-scrollbar">
            {recentChats.length === 0 ? (
              <div className="dashboard-feed-empty">
                <span className="dashboard-feed-empty-icon">{'\u{1F4AC}'}</span>
                <span>{t('empty_chats') || 'Keine aktiven Chats vorhanden.'}</span>
              </div>
            ) : (
              recentChats.map(item => (
                <div key={item.contact.gaiaID} className="dashboard-feed-item" onClick={() => handleOpenChat(item.contact)}>
                  <div className="dashboard-feed-item-avatar">{'\u{1F464}'}</div>
                  <div className="dashboard-feed-item-content">
                    <div className="dashboard-feed-item-header">
                      <span className="dashboard-feed-item-sender">{item.contact.displayName}</span>
                      <span className="dashboard-feed-item-time">
                        {new Date(item.latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="dashboard-feed-item-preview">{item.latestMsg.body}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="dashboard-feed-footer">
            <button type="button" className="btn-secondary dashboard-feed-footer-btn" onClick={() => setCurrentMenu('chat')}>
              {t('open_chats') || 'Chats öffnen'}
            </button>
          </div>
        </div>
      </section>

      <section className="dashboard-active-channels-card glass-panel">
        <div className="dashboard-feed-header">
          <span className="dashboard-feed-title">{'\u{1F4FB}'} {t('active_frequencies') || 'Aktive Frequenzen'} ({rooms.length})</span>
          <button type="button" className="btn-primary dashboard-inline-action" onClick={() => setShowCreateGroupModal(true)}>
            {'\u2795'} {t('new_room') || 'Neuer Raum'}
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="dashboard-empty-state-channels">
            <div className="dashboard-empty-state-icon">{'\u{1F4E1}'}</div>
            <div className="dashboard-empty-state-title">
              {t('no_frequencies_active') || 'Keine Frequenzen aktiv.'}
            </div>
            <div className="dashboard-empty-state-desc">
              {t('no_frequencies_active_desc') || 'Erstellen Sie einen neuen Raum, um die Kommunikation zu starten.'}
            </div>
          </div>
        ) : (
          <div className="dashboard-feed-list dashboard-active-frequencies-list gaia-scrollbar">
            {rooms.map(room => (
              <div key={room.ID} className="dashboard-feed-item" onClick={() => handleOpenRoom(room)}>
                <div className="dashboard-feed-item-avatar">{'\u{1F4FB}'}</div>
                <div className="dashboard-feed-item-content">
                  <div className="dashboard-feed-item-header">
                    <span className="dashboard-feed-item-sender dashboard-room-name">{room.Name}</span>
                    <span className="dashboard-feed-item-time dashboard-room-members">
                      {room.Members?.length || 0} Members
                    </span>
                  </div>
                  <div className="dashboard-feed-item-preview dashboard-room-preview">
                    {room.Description || 'Zero-Knowledge Crypto Room'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPane;
