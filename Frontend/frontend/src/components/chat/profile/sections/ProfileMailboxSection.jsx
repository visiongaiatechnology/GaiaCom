import React from 'react';
import Icon from '../../../ui/Icon';
import ProfileField from '../ui/ProfileField';
import ProfileSection from '../ui/ProfileSection';

const FILTER_ACTION_LABELS = {
  important: 'Als wichtig markieren',
  star: 'Stern hinzufügen',
  read: 'Als gelesen markieren',
  label: 'Label zuweisen'
};

function describeRule(rule) {
  const parts = [];
  if (rule.triggerSender) parts.push(`Sender enthält „${rule.triggerSender}“`);
  if (rule.triggerSubject) parts.push(`Betreff enthält „${rule.triggerSubject}“`);
  const when = parts.length > 0 ? parts.join(' und ') : 'beliebige Nachricht';
  const action = rule.action === 'label'
    ? `Label „${rule.actionLabel || 'ohne Namen'}“ zuweisen`
    : (FILTER_ACTION_LABELS[rule.action] || rule.action);
  return { when, action };
}

export default function ProfileMailboxSection({
  sigInput,
  setSigInput,
  localeInput,
  setLocaleInput,
  keyboardModeInput,
  setKeyboardModeInput,
  handleSaveMailboxSettings,
  filterRules,
  filterSender,
  setFilterSender,
  filterSubject,
  setFilterSubject,
  filterAction,
  setFilterAction,
  filterLabelVal,
  setFilterLabelVal,
  handleAddFilter,
  labelsList,
  onOpenKeys,
  t
}) {
  const rules = Array.isArray(filterRules) ? filterRules : [];
  const canCreateRule = Boolean(filterSender || filterSubject);

  return (
    <ProfileSection
      eyebrow="Kommunikation"
      title={t('mailbox_settings_title') || 'Mailbox-Einstellungen'}
      description="Signatur, Sprache und automatische Filterregeln für eingehende Nachrichten."
    >
      <div className="vgt-profile-stack">
        <form className="vgt-profile-form" onSubmit={handleSaveMailboxSettings}>
          <h3 className="vgt-h4">Signatur &amp; Präferenzen</h3>
          <ProfileField
            id="vgt-mailbox-signature"
            label="E-Mail-Signatur"
            hint="Wird automatisch an neue Nachrichten angehängt."
          >
            <textarea
              className="input-field"
              value={sigInput}
              onChange={e => setSigInput(e.target.value)}
              placeholder="Mit freundlichen Grüßen, …"
            />
          </ProfileField>

          <div className="vgt-profile-form__row">
            <ProfileField id="vgt-mailbox-locale" label="Sprache (Locale)">
              <select
                className="input-field"
                value={localeInput}
                onChange={e => setLocaleInput(e.target.value)}
              >
                <option value="de">Deutsch (DE)</option>
                <option value="en">English (EN)</option>
              </select>
            </ProfileField>

            <ProfileField
              id="vgt-mailbox-keyboard"
              label="Tastatur-Kurzbefehle"
              hint="Gmail-Style: gi, gs, gc, c, r, e, #"
            >
              <select
                className="input-field"
                value={keyboardModeInput}
                onChange={e => setKeyboardModeInput(e.target.value)}
              >
                <option value="default">Deaktiviert</option>
                <option value="gmail">Aktiviert</option>
              </select>
            </ProfileField>
          </div>

          <div className="vgt-profile-form__actions">
            <button type="submit" className="btn-primary">
              {t('speichern') || 'Speichern'}
            </button>
          </div>
        </form>

        <hr className="vgt-divider" />

        <div className="vgt-profile-stack">
          <div className="vgt-profile-record">
            <h3 className="vgt-h4">Eingehende Filterregeln</h3>
            <p className="vgt-caption">
              Regeln verarbeiten eingehende Nachrichten automatisch nach Sender oder Betreff.
            </p>
            {rules.length === 0 ? (
              <p className="vgt-empty-note">
                Noch keine Filterregel definiert. Lege unten die erste Regel an — sie greift für alle
                künftig eingehenden Nachrichten.
              </p>
            ) : (
              <ul className="vgt-rule-list">
                {rules.map((rule, idx) => {
                  const description = describeRule(rule);
                  return (
                    <li className="vgt-rule-list__item" key={`${idx}-${rule.triggerSender || rule.triggerSubject || 'rule'}`}>
                      <strong>Regel {idx + 1}</strong>
                      <span>
                        Wenn {description.when} &rarr; {description.action}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form className="vgt-profile-form" onSubmit={handleAddFilter}>
            <h3 className="vgt-h4">Neue Filterregel</h3>
            <div className="vgt-profile-form__row">
              <ProfileField id="vgt-filter-sender" label="Wenn Sender enthält">
                <input
                  type="text"
                  className="input-field"
                  placeholder="z. B. alice@gaiacom.de"
                  value={filterSender}
                  onChange={e => setFilterSender(e.target.value)}
                />
              </ProfileField>
              <ProfileField id="vgt-filter-subject" label="Wenn Betreff enthält">
                <input
                  type="text"
                  className="input-field"
                  placeholder="z. B. Dringend"
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                />
              </ProfileField>
            </div>

            <div className="vgt-profile-form__row">
              <ProfileField id="vgt-filter-action" label="Aktion ausführen">
                <select
                  className="input-field"
                  value={filterAction}
                  onChange={e => setFilterAction(e.target.value)}
                >
                  <option value="important">Als wichtig markieren</option>
                  <option value="star">Stern hinzufügen</option>
                  <option value="read">Als gelesen markieren</option>
                  <option value="label">Label zuweisen</option>
                </select>
              </ProfileField>

              {filterAction === 'label' ? (
                <ProfileField id="vgt-filter-label" label="Zuzuweisendes Label" required>
                  <select
                    className="input-field"
                    value={filterLabelVal}
                    onChange={e => setFilterLabelVal(e.target.value)}
                    required
                  >
                    <option value="">Label wählen</option>
                    {(labelsList || []).map(label => (
                      <option key={label.id || label.name} value={label.name}>{label.name}</option>
                    ))}
                  </select>
                </ProfileField>
              ) : null}
            </div>

            <div className="vgt-profile-form__actions">
              <button type="submit" className="btn-primary" disabled={!canCreateRule}>
                Regel erstellen
              </button>
            </div>
          </form>
        </div>

        <aside className="vgt-notice" aria-labelledby="vgt-key-backup-title">
          <Icon name="alertTriangle" size={18} />
          <div>
            <h3 className="vgt-h4" id="vgt-key-backup-title">Schlüssel-Backup &amp; Recovery</h3>
            <p className="vgt-body vgt-body--sm">
              GaiaCom ist ein Zero-Knowledge-System. Private Schlüssel verlassen dein Gerät nicht;
              es gibt keinen Administrator-Zugang und keine serverseitige „Passwort vergessen“-Funktion.
              Notiere die Mnemonic Seed Phrase auf Papier und verwahre sie getrennt von diesem Gerät.
            </p>
            <button type="button" className="vgt-link" onClick={onOpenKeys}>
              Schlüssel und Seed anzeigen
            </button>
          </div>
        </aside>
      </div>
    </ProfileSection>
  );
}
