import React from 'react';
import { isTopModal, pushModal, removeModal } from './modalStack';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * VGT GLASS 2100 — dialog accessibility helper.
 *
 * Focus management only. It does not change dialog content, state or security
 * behaviour: it focuses the first meaningful control, keeps Tab inside the
 * dialog, closes on Escape (when the caller allows it) and restores focus to
 * the element that opened the dialog.
 */
export default function useDialogA11y(open, { onClose, initialFocusRef, closeOnEscape = true } = {}) {
  const containerRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!open) return undefined;
    const container = containerRef.current;
    const previousFocus = typeof document !== 'undefined' ? document.activeElement : null;

    const focusTarget = initialFocusRef?.current
      || (container ? container.querySelector(FOCUSABLE_SELECTOR) : null);
    focusTarget?.focus?.();

    if (!container) return () => {
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };

    pushModal(container);

    const handleKeyDown = event => {
      // Nested dialogs: only the topmost one owns keyboard interaction.
      if (!isTopModal(container)) return;
      if (event.key === 'Escape' && closeOnEscape && onCloseRef.current) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter(node => node.getClientRects().length > 0);
      if (!nodes.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = typeof document !== 'undefined' ? document.body.style.overflow : '';
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      removeModal(container);
      if (typeof document !== 'undefined') document.body.style.overflow = previousOverflow;
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [open, closeOnEscape, initialFocusRef]);

  return containerRef;
}
