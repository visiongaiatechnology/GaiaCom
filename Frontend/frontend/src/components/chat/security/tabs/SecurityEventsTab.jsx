import React from 'react';
import Icon from '../../../ui/Icon';
import SeverityBadge from '../ui/SeverityBadge';
import {
  SEVERITY_KEYS,
  SEVERITY_LABELS,
  categoryLabel,
  formatDateTime
} from '../utils/securityFormat';

/**
 * Audit log tab. The table is dense, opaque content (no glass), rows are
 * separated by hairlines, and the only actions are the existing filters,
 * exports and acknowledgements.
 */
export default function SecurityEventsTab({
  events,
  filteredEvents,
  filterSeverity,
  setFilterSeverity,
  filterCategory,
  setFilterCategory,
  handleAcknowledge,
  handleExport,
  loadData,
  loading,
  loadError,
  t
}) {
  const hasEvents = Array.isArray(events) && events.length > 0;
  const categories = Array.from(new Set((events || []).map(event => event.category).filter(Boolean)));

  return (
    <div className="vgt-sec-stack">
      <div className="vgt-sec-toolbar" role="group" aria-label="Protokollfilter">
        <div className="vgt-sec-toolbar__fields">
          <div className="vgt-profile-field">
            <label className="input-label" htmlFor="vgt-sec-filter-severity">
              {t('sc_filter_severity') || 'Dringlichkeit'}
            </label>
            <select
              id="vgt-sec-filter-severity"
              className="input-field"
              value={filterSeverity}
              onChange={event => setFilterSeverity(event.target.value)}
            >
              <option value="all">{t('sc_opt_all') || 'Alle'}</option>
              {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{t(SEVERITY_KEYS[value]) || label}</option>
              ))}
            </select>
          </div>
          <div className="vgt-profile-field">
            <label className="input-label" htmlFor="vgt-sec-filter-category">
              {t('sc_filter_category') || 'Kategorie'}
            </label>
            <select
              id="vgt-sec-filter-category"
              className="input-field"
              value={filterCategory}
              onChange={event => setFilterCategory(event.target.value)}
            >
              <option value="all">{t('sc_opt_all') || 'Alle'}</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {categoryLabel(category, t)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="vgt-sec-toolbar__actions">
          <button type="button" className="btn-action" onClick={loadData} disabled={loading}>
            <Icon name="refresh" size={14} />
            {t('refresh') || 'Aktualisieren'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => handleExport('json')}>
            <Icon name="download" size={14} />
            {t('sc_btn_download_json') || 'JSON'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => handleExport('csv')}>
            <Icon name="download" size={14} />
            {t('sc_btn_download_csv') || 'CSV'}
          </button>
        </div>
      </div>

      {loadError && !hasEvents ? (
        <div className="vgt-empty-note">
          <p>Sicherheitsprotokoll nicht geladen: {loadError}</p>
          <button type="button" className="vgt-link" onClick={loadData}>
            {t('sc_btn_load_again') || 'Protokoll erneut laden'}
          </button>
        </div>
      ) : !hasEvents ? (
        <p className="vgt-empty-note">
          {t('sc_no_events') ||
            'Keine Sicherheitsereignisse gemeldet. Sobald der Server Ereignisse für dieses Konto protokolliert, erscheinen sie hier mit Zeitpunkt, Kategorie und Schweregrad.'}
        </p>
      ) : filteredEvents.length === 0 ? (
        <p className="vgt-empty-note">{t('sc_no_entries') || 'Kein Ereignis entspricht dem gewählten Filter.'}</p>
      ) : (
        <div className="vgt-table-wrap">
          <table className="vgt-table">
            <caption className="vgt-sr-only">Sicherheitsereignisse dieses Kontos</caption>
            <thead>
              <tr>
                <th scope="col">{t('sc_col_time') || 'Zeit'}</th>
                <th scope="col">{t('sc_col_category') || 'Kategorie'}</th>
                <th scope="col">{t('sc_filter_severity') || 'Dringlichkeit'}</th>
                <th scope="col">{t('sc_col_details') || 'Beschreibung'}</th>
                <th scope="col">{t('sc_col_action') || 'Aktion'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => (
                <tr key={event.event_id}>
                  <td className="vgt-numeric">{formatDateTime(event.created_at, t)}</td>
                  <td>{categoryLabel(event.category, t)}</td>
                  <td><SeverityBadge severity={event.severity} t={t} /></td>
                  <td>{event.summary || 'Ohne Beschreibung protokolliert.'}</td>
                  <td>
                    {event.acknowledged_at ? (
                      <span className="vgt-status vgt-status--ok">{t('bestaetigt') || 'Bestätigt'}</span>
                    ) : (
                      <button type="button" className="btn-action" onClick={() => handleAcknowledge(event.event_id)}>
                        {t('sc_btn_acknowledge') || 'Bestätigen'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
