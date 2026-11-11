import { useEffect } from 'react';

/* Global mailbox keyboard shortcuts (moved verbatim; same listener and dependency array). */
export default function useMailKeyboardShortcuts({ ui, data }) {
  const {
    mailSettings, selectedMail, handleReplyMail, updateMailboxState, setIsComposing, setSelectedMail,
    setComposeTo, setComposeSubject, setComposeBody, setComposeReplyTo, activeDraftIdRef
  } = data.emails;
  const { triggerAlert, setCurrentMenu, setActiveProfileSection } = ui;

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (mailSettings?.keyboardMode !== 'gmail') return;

    let keysPressed = '';
    const handleKeyDown = (e) => {
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      ) {
        return;
      }

      // Ignore shortcuts if modifier keys (Ctrl, Cmd/Meta, Alt) are pressed (e.g. Ctrl+C)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      keysPressed += key;
      if (keysPressed.length > 2) {
        keysPressed = keysPressed.slice(-2);
      }

      if (keysPressed === 'gi') {
        setCurrentMenu('inbox');
        setSelectedMail(null);
        setIsComposing(false);
        keysPressed = '';
        return;
      }
      if (keysPressed === 'gs') {
        setCurrentMenu('sent');
        setSelectedMail(null);
        keysPressed = '';
        return;
      }
      if (keysPressed === 'gc') {
        setCurrentMenu('chat');
        keysPressed = '';
        return;
      }
      if (keysPressed === 'gg') {
        setCurrentMenu('groups');
        keysPressed = '';
        return;
      }
      if (keysPressed === 'gp') {
        setCurrentMenu('profile');
        setActiveProfileSection('edit');
        keysPressed = '';
        return;
      }

      if (key === 'c') {
        setIsComposing(true);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeReplyTo(null);
        setSelectedMail(null);
        if (activeDraftIdRef) {
          activeDraftIdRef.current = null;
        }
        e.preventDefault();
      } else if (key === 'r' && selectedMail) {
        handleReplyMail(selectedMail);
        e.preventDefault();
      } else if (key === 'f' && selectedMail) {
        handleReplyMail(selectedMail, { forward: true });
        e.preventDefault();
      } else if (key === 'e' && selectedMail) {
        updateMailboxState(selectedMail, { folder: 'archive', isArchived: true });
        triggerAlert('Archiviert', 'Die Mail wurde archiviert.');
        setSelectedMail(null);
        e.preventDefault();
      } else if ((key === 'delete' || key === 'backspace' || key === '#') && selectedMail) {
        updateMailboxState(selectedMail, { folder: 'trash' });
        triggerAlert('Gelöscht', 'Die Mail wurde in den Papierkorb verschoben.');
        setSelectedMail(null);
        e.preventDefault();
      } else if (key === 's' && selectedMail) {
        const nextStarred = !selectedMail.mailbox?.isStarred;
        updateMailboxState(selectedMail, { isStarred: nextStarred });
        triggerAlert(nextStarred ? 'Markiert' : 'Entmarkt', nextStarred ? 'Stern hinzugefügt.' : 'Stern entfernt.');
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mailSettings, selectedMail, handleReplyMail, updateMailboxState, triggerAlert, setComposeBody, setComposeReplyTo, setComposeSubject, setComposeTo, setIsComposing, setSelectedMail, setCurrentMenu, setActiveProfileSection, activeDraftIdRef]);
}
