import React from 'react';
import Icon from '../ui/Icon';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardStats from './dashboard/DashboardStats';
import DashboardFeed from './dashboard/DashboardFeed';
import DashboardRooms from './dashboard/DashboardRooms';

/**
 * Kommandozentrale — session dashboard.
 *
 * Every number on this surface is derived from data the client actually loaded
 * (rooms, contacts, chatMessages, inboxEmails). There are no hardcoded status
 * claims, no fake uptime, no fabricated encryption badges.
 */
export default function DashboardPane({
  rooms = [],
  contacts = [],
  chatMessages = [],
  inboxEmails = [],
  activeIdentity = null,
  setCurrentMenu,
  setActiveChatContact,
  setActiveRoom,
  setShowCreateGroupModal,
  displayGaiaID,
  deferredPrompt,
  handleInstallApp,
  t
}) {
  const go = React.useCallback((menu) => {
    if (typeof setCurrentMenu === 'function') setCurrentMenu(menu);
  }, [setCurrentMenu]);

  const recentEmails = React.useMemo(() => {
    return [...inboxEmails]
      .filter((email) => email && (email.createdAt || email.date))
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .slice(0, 4)
      .map((email) => ({
        key: `mail-${email.id ?? email.Id ?? email.subject}`,
        primary: email.sender || email.from || 'Unbekannter Absender',
        preview: email.subject || '(ohne Betreff)',
        timestamp: email.createdAt || email.date,
        raw: email
      }));
  }, [inboxEmails]);

  const identityIds = React.useMemo(() => {
    const ids = new Set();
    if (activeIdentity?.GaiaID) ids.add(activeIdentity.GaiaID.toLowerCase());
    if (activeIdentity?.gaiaID) ids.add(activeIdentity.gaiaID.toLowerCase());
    if (activeIdentity?.GaiaId) ids.add(activeIdentity.GaiaId.toLowerCase());
    return ids;
  }, [activeIdentity]);

  const recentChats = React.useMemo(() => {
    const byContact = contacts.map((contact) => {
      const contactId = (contact.gaiaID || contact.GaiaID || '').toLowerCase();
      const messages = chatMessages.filter((message) => {
        const sender = (message.sender || '').toLowerCase();
        const recipient = (message.recipient || '').toLowerCase();
        return (sender === contactId && identityIds.has(recipient)) ||
          (identityIds.has(sender) && recipient === contactId);
      });
      const latest = messages.reduce((acc, message) => {
        const current = new Date(message.createdAt || 0).getTime();
        return current > (acc?.time || 0) ? { message, time: current } : acc;
      }, null);
      return latest ? { contact, message: latest.message, time: latest.time } : null;
    }).filter(Boolean);

    return byContact
      .sort((a, b) => b.time - a.time)
      .slice(0, 4)
      .map((entry) => ({
        key: `chat-${entry.contact.gaiaID || entry.contact.GaiaID || entry.contact.displayName}`,
        primary: entry.contact.displayName || entry.contact.DisplayName || entry.contact.gaiaID || 'Kontakt',
        preview: entry.message.body || '(leere Nachricht)',
        timestamp: entry.message.createdAt,
        raw: entry.contact
      }));
  }, [contacts, chatMessages, identityIds]);

  const openChat = React.useCallback((item) => {
    if (typeof setActiveChatContact === 'function') setActiveChatContact(item.raw);
    go('chat');
  }, [setActiveChatContact, go]);

  const openRoom = React.useCallback((room) => {
    if (typeof setActiveRoom === 'function') setActiveRoom(room);
    go('groups');
  }, [setActiveRoom, go]);

  const isEmpty = inboxEmails.length === 0 && contacts.length === 0 && rooms.length === 0;

  return (
    <div className="vgt-dash vgt-scroll-page">
      <DashboardHeader
        activeIdentity={activeIdentity}
        displayGaiaID={displayGaiaID}
        onNewRoom={() => setShowCreateGroupModal?.(true)}
        onOpenInbox={() => go('inbox')}
        onOpenChats={() => go('chat')}
        t={t}
      />

      <DashboardStats
        contactsCount={contacts.length}
        roomsCount={rooms.length}
        messagesCount={chatMessages.length}
        inboxCount={inboxEmails.length}
        t={t}
      />

      {isEmpty && (
        <section className="vgt-dash-start" aria-label="Erste Schritte">
          <div>
            <p className="vgt-eyebrow">Erste Schritte</p>
            <h2 className="vgt-h3">Dein Kommunikationsraum ist bereit — aber noch leer.</h2>
            <p className="vgt-body vgt-body--sm">
              Lege einen Raum an, öffne den Posteingang oder sende eine Nachricht an eine GaiaID.
              Alle Aktionen laufen über dieselbe Identität.
            </p>
          </div>
          <div className="vgt-dash-start__actions">
            <button type="button" className="btn-primary" onClick={() => setShowCreateGroupModal?.(true)}>
              <Icon name="plus" size={15} />
              Raum erstellen
            </button>
            <button type="button" className="btn-secondary" onClick={() => go('inbox')}>
              <Icon name="mail" size={15} />
              {t('onboarding_inbox_title') || 'Posteingang'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => go('gaiadrop')}>
              <Icon name="send" size={15} />
              {t('public_drop_send') || 'GaiaDrop senden'}
            </button>
          </div>
        </section>
      )}

      <div className="vgt-dash-feeds">
        <DashboardFeed
          kind="mail"
          title={t('recent_messages') || 'Neueste Nachrichten'}
          icon="mail"
          items={recentEmails}
          emptyTitle={t('empty_messages') || 'Keine Nachrichten im Postfach.'}
          emptyBody="Neue Mail erscheint hier, sobald der Posteingang Nachrichten enthält."
          emptyActionLabel={t('open_inbox') || 'Posteingang öffnen'}
          onEmptyAction={() => go('inbox')}
          onOpenItem={() => go('inbox')}
          footerLabel="Alle Mails"
          onFooter={() => go('inbox')}
        />

        <DashboardFeed
          kind="chat"
          title={t('recent_chats') || 'Neueste Chats'}
          icon="chat"
          items={recentChats}
          emptyTitle={t('empty_chats') || 'Noch keine Chatverläufe.'}
          emptyBody="Wähle einen Kontakt aus, um ein verschlüsseltes Gespräch zu beginnen."
          emptyActionLabel="Kontakte ansehen"
          onEmptyAction={() => go('contacts')}
          onOpenItem={openChat}
          footerLabel="Alle Chats"
          onFooter={() => go('chat')}
        />
      </div>

      <DashboardRooms
        rooms={rooms}
        onOpenRoom={openRoom}
        onCreateRoom={() => setShowCreateGroupModal?.(true)}
        t={t}
      />

      {deferredPrompt && (
        <aside className="vgt-dash-install" aria-label={t('install_app') || 'App installieren'}>
          <div>
            <p className="vgt-h4">GaiaCom als App installieren</p>
            <p className="vgt-caption">Schnellerer Start und ein eigenes Fenster auf diesem Gerät.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={handleInstallApp}>
            <Icon name="download" size={15} />
            {t('install_app') || 'Installieren'}
          </button>
        </aside>
      )}

      <p className="vgt-dash__provenance">
        Alle Werte sind Sitzungsdaten. Keine geschätzten oder dekorativen Kennzahlen.
      </p>
    </div>
  );
}
