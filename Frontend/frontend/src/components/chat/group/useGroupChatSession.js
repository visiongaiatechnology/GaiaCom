import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../../api';
import { parseToGaiaID, displayGaiaID } from '../../../utils/gaiaAddress';

/**
 * Session state of a group channel: scroll anchoring, context menu / long press,
 * typing poll, outgoing typing signal and the @mention directory derived from
 * the real room members. Behaviour matches the legacy GroupChatPane.
 */
export default function useGroupChatSession({
  activeRoom,
  activeChannel,
  activeIdentity,
  chatInputText,
  lastMessageId,
  composerInputRef,
  setChatInputText
}) {
  const scrollRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const previousLastMessageIdRef = useRef('');

  const [actionMessageId, setActionMessageId] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);
  const [typingMembers, setTypingMembers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  /* ---------- scrolling ---------- */
  const syncScrollState = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    const nearBottom = distanceFromBottom <= 72;
    setIsNearBottom(current => (current === nearBottom ? current : nearBottom));
    if (nearBottom) {
      setPendingMessageCount(0);
    }
  }, []);

  const scrollToLatest = useCallback(behavior => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    setPendingMessageCount(0);
    setIsNearBottom(true);
  }, []);

  const jumpToMessage = useCallback(messageId => {
    const node = scrollRef.current;
    if (!node) return;
    const target = node.querySelector(`[data-message-id="${messageId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    setPendingMessageCount(0);
    setIsNearBottom(true);
    previousLastMessageIdRef.current = '';
    window.requestAnimationFrame(() => {
      scrollToLatest('auto');
    });
  }, [activeRoom?.ID, activeChannel?.id, scrollToLatest]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    syncScrollState();
    node.addEventListener('scroll', syncScrollState);

    return () => {
      node.removeEventListener('scroll', syncScrollState);
    };
  }, [activeRoom?.ID, activeChannel?.id, syncScrollState]);

  useEffect(() => {
    if (!lastMessageId) {
      previousLastMessageIdRef.current = '';
      return;
    }

    if (!previousLastMessageIdRef.current) {
      previousLastMessageIdRef.current = lastMessageId;
      window.requestAnimationFrame(() => {
        scrollToLatest('auto');
      });
      return;
    }

    if (previousLastMessageIdRef.current === lastMessageId) {
      return;
    }

    previousLastMessageIdRef.current = lastMessageId;
    if (isNearBottom) {
      window.requestAnimationFrame(() => {
        scrollToLatest('smooth');
      });
      return;
    }

    setPendingMessageCount(count => count + 1);
  }, [isNearBottom, lastMessageId, scrollToLatest]);

  useEffect(() => () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
  }, []);

  /* ---------- context menu / long press ---------- */
  const openMessageActions = useCallback((event, messageId) => {
    event.preventDefault();
    event.stopPropagation();
    setActionMessageId(messageId);
  }, []);

  const startLongPress = useCallback(messageId => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      setActionMessageId(messageId);
    }, 520);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  /* ---------- typing members poll ---------- */
  useEffect(() => {
    if (!activeIdentity?.ID || !activeChannel?.id) {
      setTypingMembers([]);
      return undefined;
    }

    let stopped = false;
    const loadTyping = async () => {
      try {
        const result = await api.getTypingStatus(activeIdentity.ID, {
          channelId: activeChannel.id
        });
        if (!stopped) {
          setTypingMembers((result?.channel || []).filter(entry => entry?.isTyping));
        }
      } catch (_) {
        if (!stopped) {
          setTypingMembers([]);
        }
      }
    };

    loadTyping();
    const interval = window.setInterval(loadTyping, 2000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeChannel?.id, activeIdentity?.ID]);

  /* ---------- outgoing typing signal ---------- */
  useEffect(() => {
    if (!activeIdentity?.ID || !activeChannel?.id) {
      return undefined;
    }

    const shouldSignalTyping = chatInputText.trim().length > 0;
    let cancelled = false;

    const sendTypingState = async isTyping => {
      try {
        await api.updateTypingStatus(activeIdentity.ID, {
          channelId: activeChannel.id,
          isTyping
        });
      } catch (_) {}
    };

    if (!shouldSignalTyping) {
      sendTypingState(false);
      return undefined;
    }

    sendTypingState(true);
    const interval = window.setInterval(() => {
      if (!cancelled) {
        sendTypingState(true);
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      sendTypingState(false);
    };
  }, [activeChannel?.id, activeIdentity?.ID, chatInputText]);

  /* ---------- mention directory (stable handles per room member) ---------- */
  const mentionDirectory = useMemo(() => {
    const seenHandles = new Set();
    return (activeRoom?.Members || []).map((member, index) => {
      const label = member.Identity?.DisplayName || member.Username || displayGaiaID(member.Identity?.GaiaID || member.IdentityID || '');
      const rawBase = (member.Username || member.Identity?.DisplayName || member.Identity?.GaiaID || `member-${index + 1}`)
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9._-]/g, '');
      const baseHandle = rawBase || `member-${index + 1}`;
      let handle = baseHandle;
      let suffix = 2;
      while (seenHandles.has(handle)) {
        handle = `${baseHandle}${suffix}`;
        suffix += 1;
      }
      seenHandles.add(handle);
      return {
        handle,
        label,
        gaiaID: member.Identity?.GaiaID || '',
        identityID: member.IdentityID,
        searchText: `${label} ${handle} ${member.Identity?.GaiaID || ''}`.toLowerCase()
      };
    });
  }, [activeRoom?.Members]);

  const ownMentionHandles = useMemo(() => mentionDirectory
    .filter(entry => entry.identityID === activeIdentity?.ID || (entry.gaiaID && parseToGaiaID(entry.gaiaID) === parseToGaiaID(activeIdentity?.GaiaID || '')))
    .map(entry => entry.handle), [activeIdentity?.GaiaID, activeIdentity?.ID, mentionDirectory]);

  const mentionSuggestions = useMemo(() => {
    const query = mentionQuery.trim().toLowerCase();
    if (!query) {
      return mentionDirectory.slice(0, 6);
    }
    return mentionDirectory.filter(entry => entry.searchText.includes(query)).slice(0, 6);
  }, [mentionDirectory, mentionQuery]);

  const mentionMenuOpen = mentionStartIndex >= 0 && mentionSuggestions.length > 0;

  useEffect(() => {
    setMentionQuery('');
    setMentionStartIndex(-1);
    setSelectedMentionIndex(0);
  }, [activeChannel?.id, activeRoom?.ID]);

  /* caret-aware @ detection while composing */
  useEffect(() => {
    const input = composerInputRef.current;
    if (!input) {
      setMentionQuery('');
      setMentionStartIndex(-1);
      return;
    }

    const caretPosition = typeof input.selectionStart === 'number' ? input.selectionStart : chatInputText.length;
    const beforeCaret = chatInputText.slice(0, caretPosition);
    const atIndex = beforeCaret.lastIndexOf('@');
    if (atIndex < 0) {
      setMentionQuery('');
      setMentionStartIndex(-1);
      return;
    }

    const previousChar = atIndex === 0 ? ' ' : beforeCaret[atIndex - 1];
    if (!/[\s([{]/.test(previousChar)) {
      setMentionQuery('');
      setMentionStartIndex(-1);
      return;
    }

    const token = beforeCaret.slice(atIndex + 1);
    if (/[^\w.-]/.test(token)) {
      setMentionQuery('');
      setMentionStartIndex(-1);
      return;
    }

    setMentionStartIndex(atIndex);
    setMentionQuery(token);
    setSelectedMentionIndex(0);
  }, [chatInputText, composerInputRef]);

  const applyMention = useCallback(suggestion => {
    if (!suggestion) return;
    const input = composerInputRef.current;
    const caretPosition = typeof input?.selectionStart === 'number' ? input.selectionStart : chatInputText.length;
    const beforeMention = chatInputText.slice(0, mentionStartIndex);
    const afterMention = chatInputText.slice(caretPosition);
    const insertedMention = `@${suggestion.handle} `;
    const nextValue = `${beforeMention}${insertedMention}${afterMention}`;
    setChatInputText(nextValue);
    setMentionQuery('');
    setMentionStartIndex(-1);
    setSelectedMentionIndex(0);
    window.requestAnimationFrame(() => {
      if (!input) return;
      const nextCaret = beforeMention.length + insertedMention.length;
      input.focus();
      input.setSelectionRange(nextCaret, nextCaret);
    });
  }, [chatInputText, composerInputRef, mentionStartIndex, setChatInputText]);

  const handleComposerKeyDown = useCallback(event => {
    if (mentionMenuOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedMentionIndex(index => (index + 1) % mentionSuggestions.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedMentionIndex(index => (index - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        applyMention(mentionSuggestions[selectedMentionIndex] || mentionSuggestions[0]);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setMentionQuery('');
        setMentionStartIndex(-1);
        setSelectedMentionIndex(0);
        return;
      }
    }

    if (event.nativeEvent?.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }, [applyMention, mentionMenuOpen, mentionSuggestions, selectedMentionIndex]);

  return {
    scrollRef,
    actionMessageId,
    setActionMessageId,
    isNearBottom,
    pendingMessageCount,
    scrollToLatest,
    jumpToMessage,
    openMessageActions,
    startLongPress,
    cancelLongPress,
    typingMembers,
    mentionDirectory,
    ownMentionHandles,
    mentionSuggestions,
    mentionMenuOpen,
    selectedMentionIndex,
    applyMention,
    handleComposerKeyDown
  };
}