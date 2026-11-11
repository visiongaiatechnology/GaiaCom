import * as api from '../../../api';
import { safeJsonParse } from '../../../utils/safeJson';

/**
 * VGT GLASS 2100 — list rail action handlers.
 *
 * Every handler below is the original ListPane closure with the same props,
 * same API calls and same guard clauses. A factory (not a hook) because none of
 * these need state of their own.
 */
export default function createInboxActions({
  setIsComposing,
  setComposeTo,
  setComposeSubject,
  setComposeBody,
  setComposeReplyTo,
  setSelectedMail,
  setIsSmtpMode,
  activeDraftIdRef,
  displayGaiaID,
  setActiveChatContact,
  setActiveRoom,
  setActivePublicChannel,
  setPublicChannelCreatorOpen,
  setMobileMenuOpen,
  setActiveProfileSection,
  setCurrentMenu,
  setMailboxLabel,
  activeIdentity,
  triggerAlert,
  t,
  parseToGaiaID,
  buildInitialKeyHistory,
  contacts,
  setContacts,
  user
}) {
  const handleStartCompose = () => {
    setIsComposing(true);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeReplyTo(null);
    setSelectedMail(null);
  };

  const handleOpenMail = (mail) => {
    if (mail.isDraft) {
      setIsComposing(true);
      setComposeTo(mail.recipient || '');
      setComposeSubject(mail.subject || '');
      setComposeBody(mail.body || '');
      setComposeReplyTo(mail.messages?.[0]?.replyTo || null);
      if (setIsSmtpMode) {
        setIsSmtpMode(!!mail.isSmtp);
      }
      setSelectedMail(null);
      if (activeDraftIdRef) {
        activeDraftIdRef.current = mail.id;
      }
    } else {
      setSelectedMail(mail);
      setIsComposing(false);
    }
  };

  const handleOpenContact = (contact) => {
    setIsComposing(true);
    setComposeTo(displayGaiaID(contact.gaiaID));
    setComposeSubject('');
    setComposeBody('');
    setComposeReplyTo(null);
    setSelectedMail(null);
  };

  const handleOpenChat = (contact) => {
    setActiveChatContact(contact);
  };

  const handleOpenRoom = (room) => {
    setActiveRoom(room);
    setSelectedMail(null);
    setIsComposing(false);
  };

  const handleOpenChannel = (channel) => {
    setActivePublicChannel(channel);
    if (setPublicChannelCreatorOpen) setPublicChannelCreatorOpen(false);
    setMobileMenuOpen(false);
  };

  const handleOpenChannelCreator = () => {
    setActivePublicChannel(null);
    if (setPublicChannelCreatorOpen) setPublicChannelCreatorOpen(true);
    setMobileMenuOpen(false);
  };

  const handleOpenProfileSection = (section) => {
    setActiveProfileSection(section);
    setMobileMenuOpen(false);
  };

  const handleFolderChange = (key) => {
    setCurrentMenu(key);
    setSelectedMail(null);
  };

  const handleLabelToggle = (name, isActive) => {
    setMailboxLabel(isActive ? '' : name);
  };

  const handleCopyDropAddress = () => {
    if (!activeIdentity) return;
    navigator.clipboard.writeText(displayGaiaID(activeIdentity.GaiaID));
    triggerAlert(t('kopiert') || 'Kopiert', t('drop_address_copied') || 'GaiaDrop-Adresse kopiert.');
  };

  const handleNewChatSubmit = async (e) => {
    e.preventDefault();
    const inputVal = e.target.elements.newChatGaiaId.value.trim();
    if (!inputVal) return;
    const gaiaId = parseToGaiaID(inputVal);
    try {
      const res = await api.getPublicIdentity(gaiaId);
      if (res && res.publicRecord) {
        const pubRecord = safeJsonParse(res.publicRecord, null);
        if (!pubRecord?.public_keys?.identity) {
          throw new Error('Kontakt besitzt keinen gueltigen Schluesselsatz.');
        }
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
        let nextActiveContact = newContact;
        if (!exists) {
          const persisted = await api.saveMailContact({
            id: newContact.id || newContact.ID,
            gaiaId: newContact.gaiaID,
            displayName: newContact.displayName,
            publicKey: newContact.publicKey || '',
            blocked: !!newContact.blocked
          });
          const mergedContact = {
            ...newContact,
            ...persisted,
            gaiaID: persisted?.gaiaId || persisted?.gaiaID || newContact.gaiaID
          };
          const updated = [...contacts, mergedContact];
          setContacts(updated);
          localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updated));
          nextActiveContact = mergedContact;
        }

        setActiveChatContact(nextActiveContact);
        e.target.reset();
      } else {
        triggerAlert('Nicht gefunden', 'Diese Gaia-Adresse konnte nicht im föderierten Netz gefunden werden.', 'danger');
      }
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  return {
    handleStartCompose,
    handleOpenMail,
    handleOpenContact,
    handleOpenChat,
    handleOpenRoom,
    handleOpenChannel,
    handleOpenChannelCreator,
    handleOpenProfileSection,
    handleFolderChange,
    handleLabelToggle,
    handleCopyDropAddress,
    handleNewChatSubmit
  };
}
