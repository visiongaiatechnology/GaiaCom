import React from 'react';
import Icon from '../ui/Icon';
import DialogShell from './DialogShell';

/**
 * Contact discovery dialog: search a GaiaID, preview the resolved identity and
 * add it to the local contact list. Behaviour and props are unchanged.
 */
export const AddContactModal = ({
  show,
  onClose,
  discoverGaiaId,
  setDiscoverGaiaId,
  handleDiscoverSubmit,
  discoverError,
  discoveredContact,
  addDiscoveredContact,
  displayGaiaID,
  t
}) => {
  if (!show) return null;

  return (
    <DialogShell
      id="add-contact"
      eyebrow="Kontakte"
      title={t('add_contact_title') || 'Kontakt hinzufügen'}
      description="Suche eine GaiaID, prüfe den Treffer und füge ihn deinem Adressbuch hinzu."
      onClose={onClose}
      closeLabel={t('close') || 'Schließen'}
      size="sm"
      footer={
        <div className="vgt-dialog__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('close') || 'Schließen'}
          </button>
        </div>
      }
    >
      <form className="vgt-dialog__form" onSubmit={handleDiscoverSubmit}>
        <div className="vgt-field">
          <label className="vgt-label" htmlFor="add-contact-query">
            {t('search_gaia_label') || 'Suchen per GaiaID / E-Mail'}
          </label>
          <div className="vgt-inline-field">
            <input
              id="add-contact-query"
              type="text"
              className="input-field"
              placeholder="bob@gaiacom.de"
              value={discoverGaiaId}
              onChange={event => setDiscoverGaiaId(event.target.value)}
            />
            <button type="submit" className="btn-primary">
              <Icon name="search" size={15} />
              {t('suchen') || 'Suchen'}
            </button>
          </div>
        </div>
      </form>

      {discoverError && (
        <p className="field-error" role="alert">
          {discoverError}
        </p>
      )}

      {discoveredContact && (
        <div className="vgt-contact-result">
          <div className="vgt-contact-result__identity">
            <span className="vgt-contact-result__avatar" aria-hidden="true">
              {(discoveredContact.displayName || '?').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{discoveredContact.displayName}</strong>
              <span className="vgt-id">{displayGaiaID(discoveredContact.gaiaID)}</span>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={addDiscoveredContact}>
            <Icon name="plus" size={15} />
            {t('add_btn') || 'Hinzufügen'}
          </button>
        </div>
      )}
    </DialogShell>
  );
};

export default AddContactModal;
