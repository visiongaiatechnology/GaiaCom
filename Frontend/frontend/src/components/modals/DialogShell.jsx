import React, { useEffect, useRef } from 'react';
import Icon from '../ui/Icon';
import { isTopModal, pushModal, removeModal } from '../common/modalStack';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * VGT GLASS 2100 — Z4 dialog shell.
 *
 * One consistent modal material for every dialog:
 * modal glass, labelled heading, Escape to dismiss, visible focus, and a real
 * focus trap (Tab/Shift+Tab cycle inside the dialog, focus restored on close).
 * Focus is initialized once on open and never steals focus on typing/re-renders.
 */
export default function DialogShell({
  id,
  eyebrow,
  title,
  description,
  children,
  footer,
  onClose,
  closeLabel = 'Schließen',
  dismissible = true,
  size = 'md',
  className = ''
}) {
  const cardRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;

  const titleId = `${id || 'vgt-dialog'}-title`;
  const descriptionId = description ? `${id || 'vgt-dialog'}-description` : undefined;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const card = cardRef.current;
    if (!card) return undefined;
    pushModal(card);

    const focusables = () => Array.from(card.querySelectorAll(FOCUSABLE)).filter(node => node.offsetParent !== null);
    
    // Initial focus: prefer first input/textarea, otherwise first focusable, otherwise card
    const inputs = Array.from(card.querySelectorAll('input:not([disabled]), textarea:not([disabled]), select:not([disabled])'));
    const initial = inputs[0] || focusables()[0];
    if (initial && !card.contains(document.activeElement)) {
      initial.focus({ preventScroll: true });
    }

    const onKeyDown = event => {
      // Nested dialogs: only the topmost one owns Escape/Tab.
      if (!isTopModal(card)) return;
      if (event.key === 'Escape' && dismissibleRef.current) {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        card.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      removeModal(card);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []); // Run once on mount to avoid re-focusing on typing

  return (
    <div
      className="vgt-dialog-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget && dismissibleRef.current) onCloseRef.current?.();
      }}
    >
      <div
        ref={cardRef}
        className={`vgt-dialog vgt-dialog--${size} vgt-glass vgt-glass--modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <header className="vgt-dialog__head">
          <div className="vgt-dialog__heading">
            {eyebrow && <p className="vgt-eyebrow">{eyebrow}</p>}
            <h2 className="vgt-dialog__title" id={titleId}>
              {title}
            </h2>
            {description && (
              <p className="vgt-dialog__description" id={descriptionId}>
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              className="btn-icon vgt-dialog__close"
              onClick={onClose}
              aria-label={closeLabel}
              title={closeLabel}
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </header>

        <div className="vgt-dialog__body">{children}</div>

        {footer && <footer className="vgt-dialog__footer">{footer}</footer>}
      </div>
    </div>
  );
}
