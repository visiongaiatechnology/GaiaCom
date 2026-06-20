import React from 'react';
import * as api from '../../api';
import Icons from '../common/Icons';

export const ListPane = ({
  currentMenu,
  contacts,
  setContacts,
  rooms,
  activeRoom,
  setActiveRoom,
  activeChatContact,
  setActiveChatContact,
  selectedMail,
  setSelectedMail,
  setIsComposing,
  setComposeTo,
  setComposeSubject,
  setComposeBody,
  setComposeReplyTo,
  setMobileMenuOpen,
  activeMailsList,
  readMessageIds,
  getUnreadChatCount,
  getUnreadRoomCount,
  formatBadgeCount,
  setMailListCollapsed,
  setContactProfile,
  openContactProfile,
  vaultUnlocked,
  vaultRecords,
  selectedVaultRecord,
  setSelectedVaultRecord,
  gaiaDropInbox,
  selectedDrop,
  setSelectedDrop,
  activeIdentity,
  loadGaiaDropInbox,
  gaiaDropLoading,
  user,
  t,
  displayGaiaID,
  parseToGaiaID,
  buildInitialKeyHistory,
  triggerAlert,
  setShowCreateGroupModal,
  setShowJoinGroupModal,
  activeProfileSection,
  setActiveProfileSection
}) => {
  const canComposeMail = currentMenu === 'inbox' || currentMenu === 'sent' || currentMenu === 'contacts' || currentMenu === 'smtp_inbox';
  const handleStartCompose = () => {
    setIsComposing(true);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeReplyTo(null);
    setSelectedMail(null);
  };

  return (
    <section className="mail-list-pane">
      <div className="pane-header">
        <div className="mobile-pane-actions">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menü öffnen"
          >
            Menu
          </button>
          {canComposeMail && (
            <button
              type="button"
              className="btn-primary mobile-compose-btn"
              onClick={handleStartCompose}
            >
              {t('mail_compose') || 'Schreiben'}
            </button>
          )}
        </div>
        <div className="pane-title-row">
          <h2>
            {currentMenu === 'inbox' && t('posteingang')}
            {currentMenu === 'smtp_inbox' && (t('smtp_inbox_title') || 'SMTP Empfang')}
            {currentMenu === 'sent' && (t('gesendet') || 'Gesendete Mails')}
            {currentMenu === 'contacts' && t('adressbuch')}
            {currentMenu === 'chat' && (t('quanten_chat') || 'Quanten-Chats')}
            {currentMenu === 'groups' && t('gruppen_chats')}
            {currentMenu === 'profile' && (t('mein_profil') || 'Dein Profil')}
            {currentMenu === 'gaiadrop' && (t('drop_title') || 'GaiaDrop Inbox')}
          </h2>
          <div className="pane-title-actions">
            {canComposeMail && (
              <button
                type="button"
                className="btn-primary desktop-compose-btn"
                onClick={handleStartCompose}
              >
                <Icons.Plus /> {t('mail_compose') || 'Schreiben'}
              </button>
            )}
            <button 
              className="btn-action collapse-toggle-btn" 
              style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setMailListCollapsed(true)}
              title="Liste einklappen"
            >
              &lt;
            </button>
          </div>
        </div>
      </div>

      {currentMenu === 'groups' && (
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.03)', display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn-primary" 
            style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem', cursor: 'pointer' }}
            onClick={() => setShowCreateGroupModal(true)}
          >
            {t('gruppe_erstellen') || '+ Neue Gruppe'}
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem', cursor: 'pointer' }}
            onClick={() => setShowJoinGroupModal(true)}
          >
            {t('gruppe_beitreten') || 'Gruppe beitreten'}
          </button>
        </div>
      )}

      {currentMenu === 'gaiadrop' && (
        <div className="gaiadrop-list-tools">
          <div className="gaiadrop-address-card">
            <span>{t('drop_own_address') || 'Deine GaiaDrop-Adresse'}</span>
            <code>{activeIdentity ? displayGaiaID(activeIdentity.GaiaID) : 'deine_adresse'}</code>
          </div>
          <div className="gaiadrop-list-actions">
            <button
              type="button"
              className="btn-action"
              onClick={loadGaiaDropInbox}
              disabled={gaiaDropLoading}
            >
              {gaiaDropLoading ? (t('drop_btn_decrypting') || 'Laden...') : (t('drop_btn_load') || 'Inbox laden')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (!activeIdentity) return;
                navigator.clipboard.writeText(displayGaiaID(activeIdentity.GaiaID));
                triggerAlert(t('kopiert') || 'Kopiert', t('drop_address_copied') || 'GaiaDrop-Adresse kopiert.');
              }}
              disabled={!activeIdentity}
            >
              {t('copy') || 'Kopieren'}
            </button>
          </div>
        </div>
      )}

      {/* Search input for starting a chat with a new contact */}
      {currentMenu === 'chat' && (
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.03)' }}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const inputVal = e.target.elements.newChatGaiaId.value.trim();
            if (!inputVal) return;
            const gaiaId = parseToGaiaID(inputVal);
            try {
              const res = await api.getPublicIdentity(gaiaId);
              if (res && res.publicRecord) {
                const pubRecord = JSON.parse(res.publicRecord);
                const newContact = {
                  ID: res.id,
                  gaiaID: res.gaiaID,
                  displayName: res.displayName,
                  publicKey: pubRecord.public_keys.identity,
                  abuseScore: res.trustPassport?.abuseScore || res.abuseScore || { score: 0, escalationLevel: 0 },
                  trustPassport: res.trustPassport,
                  keyHistory: res.trustPassport?.keyHistory || buildInitialKeyHistory(pubRecord.public_keys.identity, true),
                  keyConfirmedAt: new Date().toISOString()
                };
                
                const exists = contacts.find(c => c.gaiaID === res.gaiaID);
                if (!exists) {
                  const updated = [...contacts, newContact];
                  setContacts(updated);
                  localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
                }
                
                setActiveChatContact(newContact);
                e.target.reset();
              } else {
                triggerAlert('Nicht gefunden', 'Diese Gaia-Adresse konnte nicht im föderierten Netz gefunden werden.', 'danger');
              }
            } catch (err) {
              triggerAlert('Fehler', err.message, 'danger');
            }
          }}>
            <input 
              name="newChatGaiaId" 
              type="text" 
              placeholder={t('suchen') || 'Neue Gaia-Adresse suchen...'} 
              className="input-field" 
              style={{ padding: '8px 12px', fontSize: '0.8rem', width: '100%' }}
            />
          </form>
        </div>
      )}

      <div className="list-scroll">
        {currentMenu === 'contacts' ? (
          contacts.map(c => (
            <div 
              key={c.ID} 
              className="mail-card"
              onClick={() => {
                setIsComposing(true);
                setComposeTo(displayGaiaID(c.gaiaID));
                setComposeSubject('');
                setComposeBody('');
                setComposeReplyTo(null);
                setSelectedMail(null);
              }}
            >
              <div className="mail-card-header">
                <div className="mail-sender">{c.displayName}</div>
                <button
                  type="button"
                  className="btn-action"
                  onClick={event => {
                    event.stopPropagation();
                    openContactProfile(c.gaiaID);
                  }}
                >
                  {t('profil') || 'Profil'}
                </button>
                {c.abuseScore && c.abuseScore.score > 0 && (
                  <span className="abuse-badge" style={{ color: 'var(--warning)' }}>Score: {c.abuseScore.score}</span>
                )}
              </div>
              <div className="mail-subject" style={{ color: 'var(--text-secondary)' }}>{displayGaiaID(c.gaiaID)}</div>
              <div className="mail-preview">{t('click_to_write_mail') || 'Klicken zum Schreiben einer Mail'}</div>
            </div>
          ))
        ) : currentMenu === 'chat' ? (
          contacts.map(c => {
            const isActive = activeChatContact && activeChatContact.ID === c.ID;
            const unreadCount = getUnreadChatCount(c);
            return (
              <div 
                key={c.ID} 
                className={`mail-card ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveChatContact(c);
                }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.95rem' }}>{c.displayName}</div>
                  <div className="mail-subject" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{displayGaiaID(c.gaiaID)}</div>
                  <div className="mail-preview" style={{ marginTop: '4px' }}>{t('e2e_chat_room_open') || 'E2E Chat-Raum öffnen'}</div>
                </div>
                {unreadCount > 0 && (
                  <span className="card-unread-badge">{formatBadgeCount(unreadCount)}</span>
                )}
              </div>
            );
          })
        ) : currentMenu === 'groups' ? (
          rooms.length === 0 ? (
            <div className="empty-action-card">
              <strong>{t('groups_empty_title') || 'Noch keine Gruppen-Chats'}</strong>
              <span>{t('groups_empty_desc') || 'Erstelle einen sicheren Arbeitsraum fuer Projekt-, Krisen- oder Teamkommunikation.'}</span>
              <div>
                <button type="button" className="btn-primary" onClick={() => setShowCreateGroupModal(true)}>
                  {t('gruppe_erstellen') || '+ Neue Gruppe'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowJoinGroupModal(true)}>
                  {t('gruppe_beitreten') || 'Gruppe beitreten'}
                </button>
              </div>
            </div>
          ) : rooms.map(r => {
            const isActive = activeRoom && activeRoom.ID === r.ID;
            const unreadCount = getUnreadRoomCount(r);
            return (
              <div 
                key={r.ID} 
                className={`mail-card ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveRoom(r);
                  setSelectedMail(null);
                  setIsComposing(false);
                }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-card-header" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{r.Avatar || 'G'}</span>
                      <span className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{r.Name}</span>
                    </div>
                  </div>
                  <div className="mail-subject" style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.8rem' }}>
                    {r.Description || t('no_description') || 'Keine Beschreibung'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                    {r.Members ? `${r.Members.length} ${t('mitglieder') || 'Mitglieder'}` : `0 ${t('mitglieder') || 'Mitglieder'}`}
                  </div>
                </div>
                {unreadCount > 0 && (
                  <span className="card-unread-badge">{formatBadgeCount(unreadCount)}</span>
                )}
              </div>
            );
          })
        ) : currentMenu === 'profile' ? (
          <div className="settings-menu-list" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div 
              className={`mail-card ${activeProfileSection === 'edit' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('edit');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>👤</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('edit_profile') || 'Profil bearbeiten'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('edit_profile_desc') || 'Anzeigename, Biografie und Avatar anpassen.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'password' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('password');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>🔒</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('change_password_title') || 'Passwort ändern'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('change_password_menu_desc') || 'GaiaCOM Login-Passwort aktualisieren.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'devices' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('devices');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>💻</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('device_sessions_title') || 'Angemeldete Geräte'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('device_sessions_menu_desc') || 'Aktive Sitzungen verwalten und beenden.'}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`mail-card ${activeProfileSection === 'keys' ? 'active' : ''}`}
              onClick={() => {
                setActiveProfileSection('keys');
                setMobileMenuOpen(false);
              }}
              style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontSize: '1.25rem' }}>🔑</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {t('kryptographische_schluessel') || 'Kryptographische Schlüssel'}
                  </div>
                  <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('kryptographische_schluessel_desc') || 'Private Schlüssel und Backup Seed Phrase anzeigen.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentMenu === 'vault' ? (
          !vaultUnlocked ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '0.85rem' }}>
              Tresor ist gesperrt. Bitte rechts entsperren.
            </div>
          ) : vaultRecords.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '0.85rem' }}>
              {t('vault_empty') || 'Keine Records gespeichert.'}
            </div>
          ) : (
            vaultRecords.map(rec => (
              <div 
                key={rec.id} 
                className={`mail-card ${selectedVaultRecord?.id === rec.id ? 'active' : ''}`}
                onClick={() => setSelectedVaultRecord(rec)}
                style={{ padding: '12px 24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{rec.category.toUpperCase()}</span>
                  <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{rec.title}</div>
                <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                  {rec.body && rec.body.length > 60 ? rec.body.substring(0, 60) + '...' : rec.body}
                </div>
              </div>
            ))
          )
        ) : currentMenu === 'gaiadrop' ? (
          gaiaDropInbox.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '0.85rem' }}>
              {t('drop_empty') || 'Keine Drops geladen.'}
            </div>
          ) : (
            gaiaDropInbox.map(drop => (
              <div 
                key={drop.id} 
                className={`mail-card ${selectedDrop?.id === drop.id ? 'active' : ''} ${drop.status === 'new' ? 'unread' : ''}`}
                onClick={() => setSelectedDrop(drop)}
                style={{ padding: '12px 24px', borderLeft: drop.status === 'new' ? '3px solid var(--warning)' : 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--warning)', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>DROP PROOF</span>
                  <span>{drop.created_at ? new Date(drop.created_at).toLocaleDateString() : 'Unbekannt'}</span>
                </div>
                <div className="mail-sender" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {drop.sender_label || t('anonymous_sender') || 'Anonymer Absender'}
                </div>
                <div className="mail-preview" style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                  {(() => {
                    const rawText = drop.decrypted ? (typeof drop.decrypted === 'string' ? drop.decrypted : drop.decrypted.body) : (drop.decryptError || 'Entschlüsselung ausstehend...');
                    return rawText && rawText.length > 60 ? rawText.substring(0, 60) + '...' : rawText;
                  })()}
                </div>
              </div>
            ))
          )
        ) : (
          activeMailsList.map(mail => {
            const isActive = selectedMail && selectedMail.id === mail.id;
            const isUnread = (currentMenu === 'inbox' || currentMenu === 'smtp_inbox') && !readMessageIds.has(mail.id);
            
            return (
              <div 
                key={mail.id} 
                className={`mail-card ${isActive ? 'active' : ''} ${mail.untrusted ? 'untrusted' : ''} ${isUnread ? 'unread' : ''}`}
                onClick={() => {
                  setSelectedMail(mail);
                  setIsComposing(false);
                }}
                style={isUnread ? { borderLeft: '3px solid var(--accent-cyan)' } : {}}
              >
                <div className="mail-card-header">
                  <div className="mail-sender" style={isUnread ? { fontWeight: 800 } : {}}>
                    {(currentMenu === 'inbox' || currentMenu === 'smtp_inbox') ? mail.senderGaia : mail.recipientGaia}
                    {isUnread && <span className="card-unread-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', marginLeft: '6px' }} />}
                  </div>
                  <div className="mail-time">
                    {new Date(mail.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="mail-subject" style={isUnread ? { fontWeight: 800, color: 'var(--text-primary)' } : {}}>{mail.subject}</div>
                <div className="mail-preview">{mail.body}</div>
                {mail.untrusted && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 'bold', marginTop: '6px' }}>
                    ! {mail.isSmtp ? (t('smtp_legacy_badge') || 'Legacy SMTP / Unsicher') : (t('spam_verdacht') || 'Spam/Verdacht')}
                  </div>
                )}
              </div>
            );
          })
        )}

        {currentMenu !== 'contacts' && currentMenu !== 'chat' && currentMenu !== 'profile' && currentMenu !== 'groups' && currentMenu !== 'vault' && currentMenu !== 'gaiadrop' && activeMailsList.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '0.85rem' }}>
            {t('keine_mails') || 'Keine Mails vorhanden.'}
          </div>
        )}
      </div>
    </section>
  );
};

export default ListPane;
