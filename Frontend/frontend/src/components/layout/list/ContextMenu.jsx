import React from 'react';
import Icon from '../../ui/Icon';

/**
 * VGT GLASS 2100 — conversation context menu (Z3 floating material).
 *
 * Same two actions and the same fixed coordinates as before (pin/unpin, delete
 * chat or delete/leave group). Keyboard reachable: real buttons, Escape is
 * handled by the list orchestrator, and the window click closes it as before.
 */
export default function ContextMenu({ menu, toggleLabel, deleteLabel, onTogglePin, onDelete, onClose }) {
  return (
    <div
      className="vgt-inbox-menu"
      role="menu"
      aria-label="Kontextmenü"
      style={{ top: `${menu.mouseY}px`, left: `${menu.mouseX}px` }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className="vgt-inbox-menu__item"
        onClick={() => {
          onTogglePin();
          onClose();
        }}
      >
        <Icon name="pin" size={15} />
        <span>{toggleLabel}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className="vgt-inbox-menu__item vgt-inbox-menu__item--danger"
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        <Icon name="trash" size={15} />
        <span>{deleteLabel}</span>
      </button>
    </div>
  );
}
