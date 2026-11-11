import React from 'react';
import Icon from '../../ui/Icon';
import VerificationBadges from '../../common/VerificationBadges';
import useDismissibleMenu from '../shared/useDismissibleMenu';
import { buildRoleBadges, senderInitials } from '../shared/roleBadges';
import SecurityStateChip from '../shared/SecurityStateChip';

/**
 * Conversation header of the 1:1 chat: identity, presence, the derived message
 * security state (suite from the delivered envelope or an explicit
 * "nicht bestätigt") and the actions menu. Only the derived state is rendered;
 * there is no unconditional encryption badge.
 */
export default function DirectChatHeader({
  contact,
  statusLabel,
  isOnline,
  isTyping,
  securityState = null,
  topSecret = false,
  peerTopSecretHint = false,
  getSenderRoles,
  searchOpen,
  onToggleSearch,
  onOpenProfile,
  isBlocked,
  onToggleBlock,
  onOpenReport,
  onToggleTopSecret,
  onExportEncrypted,
  onExportProof,
  t
}) {
  const menu = useDismissibleMenu();
  const roles = buildRoleBadges(getSenderRoles?.(contact.gaiaID), t, 2);
  const publicKey = typeof contact.publicKey === 'string' ? contact.publicKey : '';
  const fingerprint = publicKey.length > 16
    ? `${publicKey.slice(0, 8)}…${publicKey.slice(-8)}`
    : publicKey;
  const displayName = contact.displayName || t('unknown_contact') || 'Unbekannter Kontakt';

  const closeThen = action => () => {
    menu.close();
    action?.();
  };

  return (
    <header className="vgt-chat-head">
      {/* B-04: exactly one semantic h1 per chat route; the visual design uses
          the identity row, so the route heading is screen-reader only. */}
      <h1 className="vgt-sr-only">Chat mit {displayName}</h1>
      <div className="vgt-chat-head__identity">
        <span className="vgt-chat-avatar" aria-hidden="true">{senderInitials(displayName)}</span>

        <button
          type="button"
          className="vgt-chat-head__peer"
          onClick={() => onOpenProfile?.(contact.gaiaID)}
          aria-label={`${displayName} — Profil und Fingerprint öffnen`}
        >
          <span className="vgt-chat-head__name-row">
            <span className="vgt-chat-head__name">{displayName}</span>
            <VerificationBadges gaiaID={contact.gaiaID} compact />
            {roles.map(role => (
              <span key={role.key} className={`vgt-role vgt-role--${role.variant}`}>{role.label}</span>
            ))}
          </span>

          <span className="vgt-chat-head__sub">
            <span className={`vgt-chat-presence ${isOnline ? 'is-online' : ''} ${isTyping ? 'is-typing' : ''}`}>
              <span className="vgt-chat-presence__dot" aria-hidden="true" />
              <span>{statusLabel}</span>
            </span>

            {fingerprint ? (
              <span className="vgt-chat-chip vgt-chat-chip--key" title="Veröffentlichter Identitätsschlüssel des Kontakts; keine Suite-Attestierung">
                <Icon name="key" size={12} />
                <span>Schlüssel</span>
                <code className="vgt-mono vgt-chat-chip__value">{fingerprint}</code>
              </span>
            ) : null}

            <SecurityStateChip state={securityState} />
          </span>
        </button>
      </div>

      <div className="vgt-chat-head__actions">
        <button
          type="button"
          className="btn-icon"
          onClick={onToggleSearch}
          aria-label="Chat durchsuchen"
          title="Chat durchsuchen"
          aria-expanded={searchOpen}
        >
          <Icon name="search" size={18} />
        </button>

        <div className="vgt-chat-anchor" ref={menu.containerRef}>
          <button
            type="button"
            className="btn-icon"
            onClick={menu.toggle}
            aria-label="Weitere Aktionen"
            title="Weitere Aktionen"
            aria-haspopup="menu"
            aria-expanded={menu.open}
          >
            <Icon name="more" size={18} />
          </button>

          {menu.open ? (
            <div className="vgt-chat-menu vgt-glass vgt-glass--floating" role="menu" aria-label="Chat-Aktionen">
              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(() => onOpenProfile?.(contact.gaiaID))}>
                <Icon name="fingerprint" size={15} />
                <span>{t('check_fingerprint') || 'Fingerprint prüfen'}</span>
              </button>

              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(() => onToggleBlock?.(contact))}>
                <Icon name={isBlocked ? 'unlock' : 'shieldOff'} size={15} />
                <span>
                  {isBlocked
                    ? (t('unblock_contact') || 'Kontakt freigeben')
                    : (t('block_contact') || 'Kontakt blockieren')}
                </span>
              </button>

              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(onOpenReport)}>
                <Icon name="alertTriangle" size={15} />
                <span>{t('report_contact') || 'Kontakt melden'}</span>
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                className="vgt-chat-menu__item vgt-chat-menu__item--stacked"
                aria-checked={topSecret}
                onClick={closeThen(() => onToggleTopSecret?.(!topSecret))}
              >
                <Icon name={topSecret ? 'unlock' : 'lock'} size={15} />
                <span className="vgt-chat-menu__stack">
                  <span>{topSecret ? 'Top Secret Chat deaktivieren' : 'Top Secret Chat aktivieren'}</span>
                  <small>
                    {topSecret
                      ? 'Dual-PQC + hybride Signatur + 4-fache Cipher-Kaskade aktiv'
                      : (peerTopSecretHint
                        ? 'Dual-PQC-Capability erkannt.'
                        : 'HQC-256, ML-KEM-1024 und ML-DSA-87 werden beim Senden geprüft.')}
                  </small>
                </span>
              </button>

              <hr className="vgt-divider" />

              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(onExportEncrypted)}>
                <Icon name="export" size={15} />
                <span>{t('export_encrypted') || 'Export (verschlüsselt)'}</span>
              </button>

              <button type="button" role="menuitem" className="vgt-chat-menu__item" onClick={closeThen(onExportProof)}>
                <Icon name="seal" size={15} />
                <span>{t('export_gaiaproof') || 'Export (GaiaProof)'}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
