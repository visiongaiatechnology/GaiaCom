import React from 'react';
import Icon from '../../ui/Icon';
import AvatarMark from '../profile/ui/AvatarMark';

/**
 * Gruppe-Chats im GSN: echte GaiaCom-Räume, nichts wird nachgebaut. Ein Klick
 * öffnet den realen Gruppen-Chat.
 */
export default function GsnGroupsSection({ rooms = [], onOpenRoom, onOpenGroupMenu }) {
  return (
    <section className="vgt-gsn-section" aria-labelledby="gsn-groups-title">
      <header className="vgt-gsn-section__head">
        <div>
          <h2 className="vgt-gsn-section__title" id="gsn-groups-title">Gruppen</h2>
          <p className="vgt-gsn-section__sub">
            Deine echten GaiaCom-Gruppen-Chats – verschlüsselt und direkt verbunden.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onOpenGroupMenu}>
          <Icon name="chatDouble" size={15} />
          Alle Gruppen-Chats
        </button>
      </header>

      {rooms.length === 0 ? (
        <div className="vgt-gsn-feed-empty">
          <Icon name="users" size={26} />
          <strong>Noch keine Gruppen</strong>
          <span>Erstelle im Gruppen-Chat eine Gruppe – sie erscheint hier automatisch.</span>
        </div>
      ) : (
        <ul className="vgt-gsn-rooms">
          {rooms.map(room => {
            const members = Array.isArray(room.Members) ? room.Members.length : Number(room.MemberCount) || 0;
            return (
              <li key={room.ID || room.Name} className="vgt-gsn-rooms__row">
                <button type="button" className="vgt-gsn-rooms__open" onClick={() => onOpenRoom?.(room)}>
                  <AvatarMark
                    avatar={room.Avatar || ''}
                    displayName={room.Name}
                    variant="default"
                    className="vgt-gsn-rooms__avatar"
                  />
                  <span className="vgt-gsn-rooms__copy">
                    <strong>{room.Name || 'Gruppe'}</strong>
                    <span>
                      {room.Description || (room.IsPrivate ? 'Private Gruppe' : 'Offene Gruppe')}
                    </span>
                  </span>
                  <span className="vgt-gsn-rooms__meta">
                    <Icon name="users" size={13} />
                    {members > 0 ? members : '–'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
