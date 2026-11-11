import React, { useEffect, useId, useRef } from 'react';
import Icon from '../../ui/Icon';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Chat dialog shell (Z4). Reports, encrypted export and confirmation flows use
 * the same modal material: stable opaque glass, one clear title, explicit
 * cancel action, Escape closes, focus is trapped while open.
 */
export default function ChatDialog({
  eyebrow,
  title,
  description,
  onClose,
  children,
  footer,
  testLabel
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;

    const previousActive = document.activeElement;
    const focusables = () => Array.from(panel.querySelectorAll(FOCUSABLE)).filter(node => node.offsetParent !== null);
    const alreadyFocusedInside = previousActive && previousActive !== document.body &&
      previousActive !== panel && panel.contains(previousActive);
    if (!alreadyFocusedInside) {
      const first = focusables()[0];
      if (first) first.focus();
      else panel.focus();
    }

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previousActive && typeof previousActive.focus === 'function') {
        previousActive.focus();
      }
    };
  }, []);

  return (
    <div className="vgt-chat-scrim">
      <div
        ref={panelRef}
        className="vgt-chat-dialog vgt-glass vgt-glass--modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={testLabel}
        tabIndex={-1}
      >
        <header className="vgt-chat-dialog__head">
          <div className="vgt-chat-dialog__heading">
            {eyebrow ? <p className="vgt-eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId} className="vgt-chat-dialog__title">{title}</h2>
            {description ? <p id={descriptionId} className="vgt-caption">{description}</p> : null}
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Dialog schließen">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="vgt-chat-dialog__body">{children}</div>
        {footer ? <footer className="vgt-chat-dialog__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
