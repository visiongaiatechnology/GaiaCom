// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React from 'react';

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
    <div className="popup-overlay">
      <div className="popup-card glass-panel modal-card-compact">
        <div className="modal-title">{t('add_contact_title') || 'Kontakt hinzufügen'}</div>
        <form onSubmit={handleDiscoverSubmit}>
          <div className="form-group">
            <label>{t('search_gaia_label') || 'Suchen per GaiaID / E-Mail'}</label>
            <div className="modal-inline-action-row">
              <input
                type="text"
                className="input-field"
                placeholder="bob@gaiacom.de"
                value={discoverGaiaId}
                onChange={e => setDiscoverGaiaId(e.target.value)}
              />
              <button type="submit" className="btn-primary modal-search-btn">
                {t('suchen') || 'Suchen'}
              </button>
            </div>
          </div>
        </form>

        {discoverError && <p className="modal-error-text">{discoverError}</p>}

        {discoveredContact && (
          <div className="mail-card modal-discovery-card">
            <div className="mail-card-header">
              <div className="mail-sender">{discoveredContact.displayName}</div>
              <button className="btn-action" onClick={addDiscoveredContact}>
                {t('add_btn') || '+ Hinzufügen'}
              </button>
            </div>
            <div className="modal-discovery-id">
              {displayGaiaID(discoveredContact.gaiaID)}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            {t('close') || 'Schließen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;
