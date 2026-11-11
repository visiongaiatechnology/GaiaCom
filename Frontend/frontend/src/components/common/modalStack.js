/**
 * Shared modal stack for keyboard handling.
 *
 * Multiple dialog implementations exist (useDialogA11y for the feedback/glass
 * modals, DialogShell for form dialogs). When dialogs are nested, only the
 * topmost one may react to Escape/Tab; otherwise one Escape closes several
 * dialogs and their focus traps fight each other.
 */
const MODAL_STACK = [];

export function pushModal(element) {
  if (!element) return;
  MODAL_STACK.push(element);
}

export function removeModal(element) {
  const index = MODAL_STACK.lastIndexOf(element);
  if (index >= 0) MODAL_STACK.splice(index, 1);
}

export function isTopModal(element) {
  return MODAL_STACK.length > 0 && MODAL_STACK[MODAL_STACK.length - 1] === element;
}