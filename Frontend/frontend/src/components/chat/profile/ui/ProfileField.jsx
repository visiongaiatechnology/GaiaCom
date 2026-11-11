import React from 'react';

/**
 * Labelled form field for the identity workspace.
 *
 * A real <label for> is mandatory (a placeholder is never a label), so the
 * control id, hint id and error id are wired here once instead of being
 * repeated in every section. Validation state is announced, not merely
 * coloured.
 */
export default function ProfileField({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  children
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = React.Children.only(children);
  const controlProps = {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? 'true' : control.props['aria-invalid']
  };
  if (controlProps['aria-invalid'] === undefined) delete controlProps['aria-invalid'];

  return (
    <div className={`vgt-profile-field ${className}`.trim()}>
      <label className="input-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="vgt-profile-field__required" aria-hidden="true"> *</span>
        ) : null}
      </label>
      {React.cloneElement(control, controlProps)}
      {hint ? (
        <p className="field-hint" id={hintId}>{hint}</p>
      ) : null}
      {error ? (
        <p className="field-error" id={errorId} role="alert">{error}</p>
      ) : null}
    </div>
  );
}
