import React from 'react';
import Icon from '../ui/Icon';

/**
 * VGT GLASS 2100 — shared step indicator.
 *
 * Used by the setup wizard and the first-run onboarding. Steps are a real
 * ordered list; the current step is exposed with `aria-current="step"`, and
 * every step announces its position for screen readers.
 *
 * Jumping backwards is only allowed when the caller passes `onSelect`, so the
 * security-relevant order of a wizard is never bypassed by the indicator.
 */
export default function StepProgress({ steps, currentIndex, ariaLabel, onSelect }) {
  return (
    <ol className="vgt-step" aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        const canJump = Boolean(onSelect) && index <= currentIndex;
        const className = `vgt-step__item is-${state}`;
        const content = (
          <>
            <span className="vgt-step__marker" aria-hidden="true">
              {state === 'done' ? <Icon name="check" size={14} /> : index + 1}
            </span>
            <span className="vgt-step__label">{step.label}</span>
            <span className="vgt-sr-only">
              {`Schritt ${index + 1} von ${steps.length}`}
            </span>
          </>
        );

        return (
          <li key={step.key} className="vgt-step__cell">
            {canJump ? (
              <button
                type="button"
                className={className}
                aria-current={state === 'current' ? 'step' : undefined}
                onClick={() => onSelect(index)}
              >
                {content}
              </button>
            ) : (
              <div className={className} aria-current={state === 'current' ? 'step' : undefined}>
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
