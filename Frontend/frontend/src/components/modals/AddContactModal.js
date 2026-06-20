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
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '440px', textAlign: 'left' }}>
        <div className="modal-title">{t('add_contact_title') || 'Kontakt hinzufügen'}</div>
        <form onSubmit={handleDiscoverSubmit}>
          <div className="form-group">
            <label>{t('search_gaia_label') || 'Suchen per GaiaID / E-Mail'}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="bob@gaiacom.de"
                value={discoverGaiaId}
                onChange={e => setDiscoverGaiaId(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 18px' }}>
                {t('suchen') || 'Suchen'}
              </button>
            </div>
          </div>
        </form>

        {discoverError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '10px' }}>{discoverError}</p>}

        {discoveredContact && (
          <div className="mail-card" style={{ background: 'rgba(255,255,255,0.02)', margin: '15px 0' }}>
            <div className="mail-card-header">
              <div className="mail-sender">{discoveredContact.displayName}</div>
              <button className="btn-action" onClick={addDiscoveredContact}>
                {t('add_btn') || '+ Hinzufügen'}
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
