import { useEffect, useRef, useState } from 'react';

/**
 * Popover/menu state with the two dismiss gestures users expect:
 * Escape and a pointer press outside the anchor. The menu itself stays a plain
 * DOM group so it can be implemented as role="menu" with menuitem children.
 */
export default function useDismissibleMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };
    const onPointerDown = event => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onPointerDown, true);
    };
  }, [open]);

  return {
    open,
    setOpen,
    toggle: () => setOpen(value => !value),
    close: () => setOpen(false),
    containerRef
  };
}
