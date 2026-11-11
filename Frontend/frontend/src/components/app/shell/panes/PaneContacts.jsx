import React from 'react';
import Icon from '../../../ui/Icon';

/**
 * Address book workspace pane (VGT GLASS 2100).
 *
 * The list column keeps the compact contact rows; this pane is the calm
 * overview: contact cards with identity, abuse signal only when the server
 * actually returned one, plus the two real entry points (add a contact via the
 * discovery dialog, open the trust profile).
 */
function initials(value) {
  const text = String(value || '').trim();
  if (!text) return '?';
  const parts = text.replace(/[@._-]+/g, ' ').trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

export default function PaneContacts({ currentMenu, contacts, displayGaiaID: display, t, contactActions, onComposeContact }) {
  if (currentMenu !== 'contacts') return null;

  const list = Array.isArray(contacts) ? contacts : [];
  const openProfile = contactActions?.openContactProfile;
  const openAdd = contactActions?.setShowAddContact;
  const composeTo = typeof onComposeContact === 'function' ? onComposeContact : null;
  const label = (key, fallback) => (typeof t === 'function' && (t(key) || fallback)) || fallback;

  return (
    <section className="vgt-contacts-pane" aria-labelledby="vgt-contacts-title">
      <header className="vgt-pane-head vgt-contacts-head">
        <div>
          <p className="vgt-eyebrow">{label('adressbuch', 'Adressbuch')}</p>
          <h1 className="vgt-h2" id="vgt-contacts-title">{label('adressbuch', 'Adressbuch')}</h1>
          <p className="vgt-caption">
            <span className="vgt-numeric">{list.length}</span>{' '}
            {label('contacts_pane_caption', 'contacts · trust profiles, mail and chat in one place')}
          </p>
        </div>
        <div className="vgt-pane-head__actions">
          <button type="button" className="btn-primary" onClick={() => openAdd?.(true)}>
            <Icon name="user" size={16} />
            {label('add_contact', 'Add contact')}
          </button>
        </div>
      </header>

      {list.length === 0 ? (
        <div className="vgt-contacts-empty vgt-glass">
          <span className="vgt-contacts-empty__glyph" aria-hidden="true">
            <Icon name="users" size={22} />
          </span>
          <h2 className="vgt-h3">{label('contacts_empty_title', 'No contacts yet')}</h2>
          <p className="vgt-body vgt-body--sm">
            {label(
              'contacts_empty_desc',
              'Add a GaiaID to see encrypted mail, chats and the trust passport of this contact.'
            )}
          </p>
          <button type="button" className="btn-primary" onClick={() => openAdd?.(true)}>
            <Icon name="user" size={16} />
            {label('add_contact', 'Add contact')}
          </button>
        </div>
      ) : (
        <div className="vgt-contacts-scroll gaia-scrollbar">
          <ul className="vgt-contacts-grid">
            {list.map((contact) => {
              const name = contact.displayName || contact.gaiaID || '';
              const gaiaId = typeof display === 'function'
                ? display(contact.gaiaID)
                : (contact.gaiaID || '');
              const abuseScore = contact.abuseScore && contact.abuseScore.score > 0
                ? Number(contact.abuseScore.score)
                : null;
              return (
                <li key={contact.ID || contact.id || contact.gaiaID} className="vgt-contact-card vgt-glass">
                  <button
                    type="button"
                    className="vgt-contact-card__main"
                    onClick={() => openProfile?.(contact.gaiaID)}
                  >
                    <span className="vgt-contact-card__avatar" aria-hidden="true">
                      {initials(name)}
                    </span>
                    <span className="vgt-contact-card__body">
                      <span className="vgt-contact-card__name">{name}</span>
                      <span className="vgt-contact-card__id vgt-mono">{gaiaId}</span>
                      <span className="vgt-contact-card__chips">
                        {contact.blocked ? (
                          <span className="vgt-status vgt-status--danger">
                            {label('blocked', 'Blockiert')}
                          </span>
                        ) : null}
                        {abuseScore !== null ? (
                          <span className="vgt-status vgt-status--warn">
                            Abuse <span className="vgt-numeric">{abuseScore}</span>
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                  <div className="vgt-contact-card__actions">
                    {composeTo ? (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => composeTo(contact)}
                      >
                        {label('mail_schreiben', 'Mail')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => openProfile?.(contact.gaiaID)}
                    >
                      {label('profil', 'Profil')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
