import React from 'react';
import Icon from '../ui/Icon';
import { BrandIcon } from '../ui/BrandIcon';
import useDashboardOverview from '../../hooks/useDashboardOverview';

/**
 * Aurora UI v3 — Dashboard matching Mockup 1:
 * Hero banner with cinematic aurora mountains and glowing quantum lock dome,
 * 4 metric cards (Nachrichten, Chats, Channels, GSN Social),
 * Systemstatus & Aktivität 2-column cards,
 * and the 6-item Schnellzugriff row.
 */
export default function DashboardHome({
  rooms = [],
  contacts = [],
  chatMessages = [],
  inboxEmails = [],
  publicChannels = [],
  gaiaDropInbox = [],
  activeIdentity = null,
  setCurrentMenu,
  setActiveChatContact,
  setActiveRoom,
  setShowCreateGroupModal,
  displayGaiaID,
  deferredPrompt,
  handleInstallApp,
  serverVersion,
  serverConsensus,
  keysUnlocked = false,
  t
}) {
  const go = (menu) => {
    if (typeof setCurrentMenu === 'function') setCurrentMenu(menu);
  };

  const name = activeIdentity?.DisplayName || activeIdentity?.displayName || activeIdentity?.Username || 'GaiaCom User';

  /* Kennzahlen und Aktivität stammen ausschließlich aus echten App-Daten
     (Mails, Direkt-Chats, Channels, GSN-Feed). Leere Konten zeigen echte Nullen. */
  const { mailCount, chatCount, channelCount, socialCount, gsnUnread, gsnLoaded, activity } = useDashboardOverview({
    activeIdentity,
    inboxEmails,
    chatMessages,
    publicChannels,
    contacts,
    rooms
  });
  const dropCount = Array.isArray(gaiaDropInbox) ? gaiaDropInbox.length : 0;

  const metrics = [
    {
      key: 'mail',
      tone: 'cyan',
      icon: 'mail',
      label: t('onboarding_sec_messages_title') || 'Nachrichten',
      count: mailCount,
      suffix: t('ui_metric_inbox') || 'im Posteingang',
      go: 'inbox'
    },
    {
      key: 'chat',
      tone: 'teal',
      icon: 'chat',
      label: 'Chats',
      count: chatCount,
      suffix: t('ui_metric_conversations') || 'Konversationen',
      go: 'chat'
    },
    {
      key: 'channels',
      tone: 'purple',
      icon: 'channels',
      label: t('kanaele') || 'Channels',
      count: channelCount,
      suffix: t('ui_metric_channels') || 'Kanäle',
      go: 'public_channels'
    },
    {
      key: 'social',
      tone: 'magenta',
      icon: 'social',
      label: 'GSN Social',
      count: gsnLoaded ? socialCount : '–',
      suffix: gsnLoaded
        ? (gsnUnread > 0 ? `${gsnUnread} · ${t('ui_metric_posts') || 'Beiträge'}` : (t('ui_metric_posts') || 'Beiträge'))
        : '…',
      go: 'gsn'
    }
  ];

  /* Systemstatus: nur echte Werte aus dem laufenden Client/Backend. */
  const statusRows = [
    {
      key: 'backend',
      label: 'Backend',
      value: serverVersion || '—',
      ok: Boolean(serverVersion)
    },
    {
      key: 'protocol',
      label: t('tab_logs') || 'Protokoll',
      value: serverConsensus || '—',
      ok: Boolean(serverConsensus)
    },
    {
      key: 'vault',
      label: t('local_key_vault') || t('vault') || 'Key vault',
      value: keysUnlocked ? 'Unlocked' : 'Locked',
      ok: Boolean(keysUnlocked)
    },
    {
      key: 'drop',
      label: 'GaiaDrop',
      value: dropCount > 0 ? `${dropCount} · ${t('ui_files') || 'Dateien'}` : '—',
      ok: true
    }
  ];

  const quick = [
    {
      key: 'mail',
      icon: 'edit',
      label: t('neue_mail') || 'Neue Mail',
      go: 'inbox'
    },
    {
      key: 'chat',
      icon: 'chat',
      label: t('ui_new_chat') || 'Neuer Chat',
      go: 'chat'
    },
    {
      key: 'group',
      icon: 'groups',
      label: t('ui_new_group') || 'Gruppe erstellen',
      action: () => setShowCreateGroupModal?.(true)
    },
    {
      key: 'channel',
      icon: 'channels',
      label: t('ui_new_channel') || 'Channel erstellen',
      go: 'public_channels'
    },
    {
      key: 'files',
      icon: 'upload',
      label: t('ui_share_files') || 'Dateien teilen',
      go: 'vault'
    },
    {
      key: 'security',
      icon: 'shieldCheck',
      label: t('ui_security_scan') || 'Security Scan',
      go: 'security_center'
    }
  ];

  return (
    <div className="ax3-dash">
      <section className="ax3-hero" aria-labelledby="ax3-dash-title">
        <div className="ax3-hero__copy">
          <p className="ax3-kicker">{t('kommandozentrale') || 'KOMMANDOZENTRALE'}</p>
          <h2 id="ax3-dash-title" className="ax3-hero__title">
            {t('ui_welcome_back') || 'Willkommen zurück'}, <span className="ax3-hero__name-highlight">{name}</span>
          </h2>
          <p className="ax3-hero__sub">{t('ui_dash_subtitle') || 'Deine souveräne Kommunikationszentrale.'}</p>
        </div>
        <div className="ax3-hero__scene" aria-hidden="true">
          <div className="ax3-hero__lock-sphere">
            <div className="ax3-hero__lock-glow" />
            <div className="ax3-hero__lock-ring" />
            <div className="ax3-hero__lock-icon">
              <BrandIcon name="lock" size={36} />
            </div>
          </div>
        </div>
      </section>

      <section className="ax3-metrics" aria-label="Kennzahlen">
        {metrics.map((metric) => (
          <button
            type="button"
            key={metric.key}
            className={`ax3-metric ax3-metric--${metric.tone}`}
            onClick={() => go(metric.go)}
          >
            <div className="ax3-metric__icon-box">
              <BrandIcon name={metric.icon} size={24} />
            </div>
            <div className="ax3-metric__text">
              <span className="ax3-metric__label">{metric.label}</span>
              <div className="ax3-metric__value-row">
                <span className="ax3-metric__count">{metric.count}</span>
                <span className="ax3-metric__suffix">{metric.suffix}</span>
              </div>
            </div>
            <Icon name="chevronRight" size={16} className="ax3-metric__chevron" />
          </button>
        ))}
      </section>

      <div className="ax3-columns">
        <section className="ax3-card" aria-labelledby="ax3-status-title">
          <header className="ax3-card__head">
            <span className="ax3-card__icon ax3-card__icon--teal">
              <Icon name="activity" size={17} />
            </span>
            <h3 id="ax3-status-title">{t('ui_system_status') || 'Systemstatus'}</h3>
          </header>
          <ul className="ax3-status-list">
            {statusRows.map((row) => (
              <li key={row.key} className="ax3-status-item">
                <span className="ax3-status-check">
                  <Icon name="check" size={12} />
                </span>
                <span className="ax3-status-label">{row.label}</span>
                <span className="ax3-status-value">{row.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ax3-card" aria-labelledby="ax3-activity-title">
          <header className="ax3-card__head">
            <span className="ax3-card__icon ax3-card__icon--violet">
              <Icon name="layers" size={17} />
            </span>
            <h3 id="ax3-activity-title">{t('ui_activity') || 'Aktivität'}</h3>
          </header>
          <ul className="ax3-activity-list">
            {activity.length === 0 ? (
              <li className="ax3-activity-empty">
                {t('ui_empty_activity') || 'Noch keine Aktivität. Echte Mails, Chats und GSN-Beiträge erscheinen hier automatisch.'}
              </li>
            ) : (
              activity.map((item) => (
                <li key={item.id} className="ax3-activity-item">
                  <button type="button" className="ax3-activity-row" onClick={() => go(item.menu)}>
                    <div className="ax3-activity-icon">
                      <BrandIcon name={item.icon} size={18} />
                    </div>
                    <div className="ax3-activity-text">
                      <strong className="ax3-activity-title">{item.title}</strong>
                      <span className="ax3-activity-sub">{item.sub}</span>
                    </div>
                    <span className="ax3-activity-time">{item.time}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="ax3-card ax3-quick" aria-labelledby="ax3-quick-title">
        <header className="ax3-card__head">
          <span className="ax3-card__icon ax3-card__icon--cyan">
            <Icon name="zap" size={17} />
          </span>
          <h3 id="ax3-quick-title">{t('ui_quick_actions') || 'Schnellzugriff'}</h3>
        </header>
        <div className="ax3-quick__grid">
          {quick.map((item) => (
            <button
              type="button"
              key={item.key}
              className="ax3-quick__btn ax3-quick__item"
              onClick={() => {
                if (item.action) item.action();
                else go(item.go);
              }}
            >
              <div className="ax3-quick__icon-wrap ax3-quick__btn-icon">
                <BrandIcon name={item.icon} size={22} />
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {deferredPrompt && (
        <aside className="ax3-install">
          <div>
            <strong>{t('ui_install_title') || 'GaiaCom als App installieren'}</strong>
            <span>{t('ui_install_desc') || 'Schnellerer Start und ein eigenes Fenster.'}</span>
          </div>
          <button type="button" className="ax3-btn btn-primary" onClick={handleInstallApp}>{t('ui_install_btn') || 'Installieren'}</button>
        </aside>
      )}
    </div>
  );
}
