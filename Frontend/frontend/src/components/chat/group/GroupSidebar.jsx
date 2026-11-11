import React from 'react';
import Icon from '../../ui/Icon';
import SecurityStateChip from '../shared/SecurityStateChip';

/**
 * Room + channel navigation of the group surface. Channel selection, create,
 * settings, invite code and leave all come from the room record — nothing is
 * hardcoded. The privacy label is factual (`isPrivate`); the security line is
 * the derived state (M-15, FE-02) and no crisis/audit claim is rendered because
 * the server exposes no such flag.
 */
export default function GroupSidebar({
  room,
  channels,
  activeChannel,
  canManage,
  isPrivate,
  securityState = null,
  readOnly = false,
  open = false,
  onSelectChannel,
  onCreateChannel,
  onOpenSettings,
  onLeaveRoom,
  onCopyInvite,
  onClose,
  t
}) {
  const showInvite = Boolean(room.SecretHash) && (!isPrivate || canManage);

  return (
    <aside className={`vgt-group__side ${open ? 'is-open' : ''}`} aria-label="Raum und Kanäle">
      <header className="vgt-group__side-head">
        <div className="vgt-group__side-title">
          <p className="vgt-eyebrow">Raum</p>
          <h2 className="vgt-group__room-name">{room.Name}</h2>
        </div>
        <div className="vgt-group__side-actions">
          {canManage ? (
            <button type="button" className="btn-action" onClick={onCreateChannel}>
              <Icon name="plus" size={14} />
              <span>Kanal</span>
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className="btn-icon"
              onClick={onOpenSettings}
              aria-label={t('group_settings_title') || 'Gruppeneinstellungen'}
              title={t('group_settings_title') || 'Gruppeneinstellungen'}
            >
              <Icon name="settings" size={17} />
            </button>
          ) : null}
          {onClose ? (
            <button type="button" className="btn-icon vgt-group__side-close" onClick={onClose} aria-label="Kanäle schließen">
              <Icon name="close" size={17} />
            </button>
          ) : null}
        </div>
      </header>

      <nav className="vgt-group__channels" aria-label="Kanäle">
        <p className="vgt-label vgt-group__channels-label">{t('kanaele') || 'Kanäle'}</p>
        <ul>
          {channels.map(channel => {
            const isActive = activeChannel?.id === channel.id;
            return (
              <li key={channel.id}>
                <button
                  type="button"
                  className={`vgt-group__channel ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelectChannel(channel)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <Icon name="chat" size={15} />
                  <span>{channel.name}</span>
                </button>
              </li>
            );
          })}
          {channels.length === 0 ? (
            <li className="vgt-group__side-empty">Noch kein Kanal vorhanden.</li>
          ) : null}
        </ul>
      </nav>

      <div className="vgt-group__policy">
        <p className="vgt-group__policy-title">
          <Icon name={isPrivate ? 'lock' : 'globe'} size={14} />
          <span>{isPrivate ? 'Privater Raum' : 'Öffentlicher Raum'}</span>
        </p>
        <SecurityStateChip state={securityState} className="vgt-group__policy-chip" />
        {readOnly ? <p className="vgt-caption vgt-group__policy-line">Nur-Lesen: Schreiben ist auf Owner/Admins beschränkt.</p> : null}
      </div>

      {showInvite ? (
        <div className="vgt-group__invite">
          <p className="vgt-label">{t('einladungscode') || 'Einladungscode'}</p>
          <code className="vgt-mono vgt-id vgt-group__invite-code">{room.SecretHash}</code>
          <button type="button" className="btn-action" onClick={() => onCopyInvite(room.SecretHash)}>
            <Icon name="copy" size={14} />
            <span>{t('kopieren') || 'Kopieren'}</span>
          </button>
        </div>
      ) : null}

      <button type="button" className="btn-danger-outline vgt-group__leave" onClick={() => onLeaveRoom(room.ID)}>
        <Icon name="logout" size={15} />
        <span>{t('gruppe_verlassen') || 'Gruppe verlassen'}</span>
      </button>
    </aside>
  );
}
