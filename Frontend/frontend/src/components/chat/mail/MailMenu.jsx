import React, { useEffect, useRef } from 'react';

/**
 * Floating glass menu (Z3) for mail actions. Keyboard reachable through the
 * native buttons it contains; Escape and an outside press close it.
 * The trigger button owns aria-expanded/aria-haspopup and must reference `id`.
 */
export default function MailMenu({ id, open, label, onClose, children }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id={id}
      className="vgt-glass vgt-glass--floating vgt-mail-menu"
      role="menu"
      aria-label={label}
      ref={menuRef}
    >
      {children}
    </div>
  );
}
