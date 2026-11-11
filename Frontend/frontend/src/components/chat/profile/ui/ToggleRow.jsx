import React from 'react';

/**
 * On/off preference row with an explicit text label and description.
 *
 * The state is never communicated by colour alone: the switch is a native
 * checkbox with a visible track, the row text states what is enabled, and the
 * whole row is one large pointer target.
 */
export default function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false
}) {
  const descriptionId = description ? `${id}-desc` : undefined;
  return (
    <label
      className={`vgt-toggle-row ${checked ? 'is-on' : 'is-off'} ${disabled ? 'is-disabled' : ''}`.trim()}
      htmlFor={id}
    >
      <span className="vgt-toggle-row__text">
        <strong>{label}</strong>
        {description ? <small id={descriptionId}>{description}</small> : null}
      </span>
      <span className="vgt-switch">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-describedby={descriptionId}
        />
        <span className="vgt-switch__track" aria-hidden="true" />
      </span>
    </label>
  );
}
