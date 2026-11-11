import React from 'react';
import Icon from '../../ui/Icon';
import { PROFILE_DANGER_GROUP, PROFILE_GROUPS, resolveSettingsEntry } from './menuConfig';

function SettingsRow({ entry, t, isActive, onSelect }) {
  const { labelText, descText } = resolveSettingsEntry(entry, t);
  return (
    <li className="vgt-inbox-settings__item">
      <button
        type="button"
        className={`vgt-inbox-settings__row${isActive ? ' is-active' : ''}`}
        onClick={() => onSelect(entry.key)}
        aria-current={isActive ? 'true' : undefined}
      >
        <span className="vgt-inbox-settings__icon" aria-hidden="true">
          <Icon name={entry.icon} size={17} />
        </span>
        <span className="vgt-inbox-settings__text">
          <span className="vgt-inbox-settings__label">{labelText}</span>
          <span className="vgt-inbox-settings__desc">{descText}</span>
        </span>
        <span className="vgt-inbox-settings__chevron" aria-hidden="true">
          <Icon name="chevronRight" size={16} />
        </span>
      </button>
    </li>
  );
}

function SettingsGroup({ group, t, activeSection, onSelect, danger }) {
  return (
    <section className={`vgt-inbox-settings__group${danger ? ' vgt-inbox-settings__group--danger' : ''}`}>
      <h3 className="vgt-inbox-settings__heading">{group.heading}</h3>
      <ul className="vgt-inbox-settings__list">
        {group.items.map((entry) => (
          <SettingsRow
            key={entry.key}
            entry={entry}
            t={t}
            isActive={activeSection === entry.key}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * VGT GLASS 2100 — profile/settings navigation rail.
 *
 * Grouped settings rows (icon + label + description + chevron); the destructive
 * entry is separated into its own danger group. Section keys and the select
 * callback are exactly the ones App.jsx already owns.
 */
export default function ProfileSettingsNav({ t, activeProfileSection, onSelect }) {
  return (
    <div className="vgt-inbox-settings">
      {PROFILE_GROUPS.map((group) => (
        <SettingsGroup
          key={group.id}
          group={group}
          t={t}
          activeSection={activeProfileSection}
          onSelect={onSelect}
        />
      ))}
      <SettingsGroup
        group={PROFILE_DANGER_GROUP}
        t={t}
        activeSection={activeProfileSection}
        onSelect={onSelect}
        danger
      />
    </div>
  );
}
