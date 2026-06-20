import React from 'react';

export const ContactProfileModal = ({
  show,
  onClose,
  contactProfile,
  displayGaiaID,
  t
}) => {
  if (!show || !contactProfile) return null;

  const trustPassport = contactProfile.trustPassport || {};
  const abuseScore = contactProfile.abuseScore || { score: 0, escalationLevel: 0 };
  const keyHistory = contactProfile.keyHistory || [];

  // Determine reputation label/color based on abuse score
  let reputationColor = 'var(--success)';
  let reputationLabel = 'Vertrauenswürdig';
  if (abuseScore.score > 10 && abuseScore.score <= 50) {
    reputationColor = 'var(--warning)';
    reputationLabel = 'Auffällig';
  } else if (abuseScore.score > 50) {
    reputationColor = 'var(--danger)';
    reputationLabel = 'Gesperrt / Verdächtig';
  }

  const handleCopyFingerprint = (fingerprint) => {
    if (!fingerprint) return;
    navigator.clipboard.writeText(fingerprint);
  };

  return (
    <div className="popup-overlay" style={{ zIndex: 1100 }}>
      <div className="popup-card glass-panel" style={{ width: '100%', maxWidth: '520px', textAlign: 'left', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <div className="modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
            🛡️ {t('trust_passport_title') || 'Trust Passport'}
          </div>
          <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto' }} onClick={onClose}>
            ✖
          </button>
        </div>

        {/* PROFILE IDENTIFIER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '2.5rem', background: 'var(--bg-secondary)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid var(--accent-cyan)' }}>
            👤
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {contactProfile.displayName}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>
              {displayGaiaID(contactProfile.gaiaID)}
            </span>
          </div>
        </div>

        {/* TRUST GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div className="glass-panel" style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Reputation Status</span>
            <strong style={{ color: reputationColor, fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>
              {reputationLabel}
            </strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              Abuse Score: {abuseScore.score} (Lvl {abuseScore.escalationLevel})
            </small>
          </div>
          <div className="glass-panel" style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Vertrauensalter</span>
            <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>
              {trustPassport.trustAgeDays !== undefined ? `${trustPassport.trustAgeDays} Tage` : '0 Tage'}
            </strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              Node: {trustPassport.nodeReputation || 'local-verified'}
            </small>
          </div>
        </div>

        {/* FINGERPRINT BLOCK */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
            Kryptographischer Fingerprint
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <code style={{ flex: 1, background: 'rgba(0,0,0,0.15)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem', wordBreak: 'break-all', display: 'block', fontFamily: 'monospace' }}>
              {trustPassport.fingerprint || contactProfile.publicKey?.slice(0, 64) || 'Unbekannt'}
            </code>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => handleCopyFingerprint(trustPassport.fingerprint || contactProfile.publicKey)}
              style={{ width: 'auto', padding: '0 12px', fontSize: '0.7rem' }}
            >
              Kopieren
            </button>
          </div>
        </div>

        {/* KEY HISTORY (KEY TRANSPARENCY) */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
            Key Transparency (Schlüssel-Verlauf)
          </label>
          <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px' }}>
            {keyHistory.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '10px', textAlign: 'center' }}>
                Keine Schlüssel-Historie aufgezeichnet.
              </div>
            ) : (
              keyHistory.map((historyEntry, index) => (
                <div 
                  key={index} 
                  style={{ 
                    padding: '8px', 
                    borderBottom: index < keyHistory.length - 1 ? '1px solid var(--border-color)' : 'none',
                    fontSize: '0.75rem',
                    lineHeight: '1.4'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                      🔑 {historyEntry.type ? historyEntry.type.toUpperCase() : 'IDENTITY_KEY'}
                    </span>
                    <span style={{ color: historyEntry.confirmed ? 'var(--success)' : 'var(--warning)' }}>
                      {historyEntry.confirmed ? '✓ Bestätigt' : '⚠️ Unbestätigt'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: '2px' }}>
                    FP: {historyEntry.fingerprint || historyEntry.publicKey?.slice(0, 32) + '...'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    Aktiv von: {historyEntry.firstSeenAt ? new Date(historyEntry.firstSeenAt).toLocaleDateString() : 'Anfang'} - {historyEntry.lastSeenAt ? new Date(historyEntry.lastSeenAt).toLocaleDateString() : 'Aktiv'}
                  </div>
                  {historyEntry.warning && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.65rem', fontWeight: 'bold', marginTop: '2px' }}>
                      ⚠️ Warnung: {historyEntry.warning}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px', padding: 0 }}>
          <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            {t('close') || 'Schließen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactProfileModal;
