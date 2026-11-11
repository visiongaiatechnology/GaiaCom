import React from 'react';
import Icon from '../../ui/Icon';

export default function DashboardRooms({ rooms, onOpenRoom, onCreateRoom, t }) {
  return (
    <section className="vgt-dash-rooms" aria-label={t('gruppen_chats') || 'Räume'}>
      <header className="vgt-dash-rooms__head">
        <h2 className="vgt-h4">
          <Icon name="megaphone" size={17} />
          {t('gruppen_chats') || 'Räume'}
          <span className="vgt-caption vgt-numeric">{rooms.length}</span>
        </h2>
        <button type="button" className="btn-secondary" onClick={onCreateRoom}>
          <Icon name="plus" size={15} />
          {t('new_room') || 'Neuer Raum'}
        </button>
      </header>

      {rooms.length === 0 ? (
        <div className="vgt-dash-rooms__empty">
          <p className="vgt-body vgt-body--sm">{t('no_rooms_active') || 'Noch kein Raum aktiv.'}</p>
          <p className="vgt-caption">
            Räume verbinden mehrere Identitäten in einem gemeinsamen, verschlüsselten Kontext.
          </p>
          <button type="button" className="btn-primary" onClick={onCreateRoom}>
            <Icon name="plus" size={15} />
            {t('new_room') || 'Ersten Raum erstellen'}
          </button>
        </div>
      ) : (
        <ul className="vgt-dash-rooms__list">
          {rooms.map((room) => (
            <li key={room.ID || room.id || room.Name}>
              <button type="button" className="vgt-dash-rooms__row" onClick={() => onOpenRoom(room)}>
                <span className="vgt-dash-rooms__mark" aria-hidden="true">
                  <Icon name="users" size={16} />
                </span>
                <span className="vgt-dash-rooms__body">
                  <span className="vgt-dash-rooms__name">{room.Name || room.name || 'Unbenannter Raum'}</span>
                  <span className="vgt-dash-rooms__meta">
                    <span className="vgt-numeric">
                      {(room.Members?.length || room.members?.length || 0)} {t('mitglieder') || 'Mitglieder'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{room.Description || room.description || (t('no_description') || 'Keine Beschreibung')}</span>
                  </span>
                </span>
                <Icon name="chevronRight" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
