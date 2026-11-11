import React from 'react';
import Icon from '../../ui/Icon';

export default function DashboardStats({ contactsCount, roomsCount, messagesCount, inboxCount, t }) {
  const stats = [
    { key: 'contacts', label: t('onboarding_contacts_title') || 'Kontakte', value: contactsCount, hint: 'verknüpfte Identitäten', icon: 'users' },
    { key: 'rooms', label: t('gruppen_chats') || 'Räume', value: roomsCount, hint: 'aktive Gruppen', icon: 'megaphone' },
    { key: 'messages', label: t('onboarding_sec_messages_title') || 'Nachrichten', value: messagesCount, hint: 'in dieser Sitzung geladen', icon: 'chat' },
    { key: 'inbox', label: t('onboarding_inbox_title') || 'Posteingang', value: inboxCount, hint: 'Nachrichten im Postfach', icon: 'mail' }
  ];

  return (
    <section className="vgt-dash-stats" aria-label={t('session_metrics') || 'Sitzungskennzahlen'}>
      {stats.map((stat) => (
        <div className="vgt-dash-stats__item" key={stat.key}>
          <span className="vgt-dash-stats__icon" aria-hidden="true">
            <Icon name={stat.icon} size={17} />
          </span>
          <div>
            <span className="vgt-label">{stat.label}</span>
            <strong className="vgt-dash-stats__value vgt-numeric">{stat.value}</strong>
            <span className="vgt-caption">{stat.hint}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
