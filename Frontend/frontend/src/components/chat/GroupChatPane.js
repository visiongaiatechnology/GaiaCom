// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { renderMarkdown } from '../../utils/markdown';
import { parseToGaiaID, displayGaiaID } from '../../utils/gaiaAddress';
import { assertSecureExportClean, sanitizeSecureExport } from '../../utils/secureExport';
import {
  buildTimelineItems,
  DateDivider,
  MessageActionMenu,
  MessageReactionStrip,
  PinnedMessagesStrip,
  ReplyComposerPreview,
  ReplyContext,
  ScrollToLatestButton,
  UnreadDivider,
  messagePreview
} from './MessageActions';
import * as api from '../../api';
import * as crypto from '../../crypto';

const GROUP_EMOJIS = [
  '\u{1F600}', '\u{1F604}', '\u{1F602}', '\u{1F60A}', '\u{1F60D}', '\u{1F60E}',
  '\u{1F91D}', '\u{1F64F}', '\u{1F44D}', '\u{1F525}', '\u{2728}', '\u{1F680}',
  '\u{1F512}', '\u{1F6E1}\u{FE0F}', '\u{26A1}', '\u{2705}', '\u{2757}', '\u{2764}\u{FE0F}'
];

const REPORT_COMMENT_LIMIT = 8000;

export const GroupChatPane = ({
  activeRoom,
  channels,
  activeChannel,
  setActiveChannel,
  chatMessages,
  activeIdentity,
  chatInputText,
  setChatInputText,
  handleSendGroupMessage,
  handleUpdateMemberRole,
  handleLeaveRoom,
  setShowCreateChannelModal,
  triggerAlert,
  displayGaiaID: displayGaiaIDProp,
  t,
  openContactProfile,
  handleOpenGroupSettings,
  handleDeleteChatMessage,
  handleClearGroupChannel,
  setActiveRoom,
  setMobileMenuOpen,
  messageMeta = {},
  onToggleMessagePin,
  onToggleMessageSaved,
  onReactToMessage,
  unreadMarker,
  messageReplyTarget,
  setMessageReplyTarget,
  getSenderRoles,
  contacts,
  fetchRooms,
  slowModeCooldowns = {},
  pinnedMessageIds = [],
  handleKickMember,
  handleTransferOwnership,
  handleGetJoinRequests,
  handleModerateJoinRequest,
  handleGetModerationLogs,
  handleSearchPublicRooms,
  handleCreateRoomInviteLink,
  handleJoinViaInviteLink,
  handleCreateJoinRequest,
  joinRequests,
  moderationLogs,
  publicRoomsSearchResult
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [actionMessageId, setActionMessageId] = useState(null);
  const scrollRef = useRef(null);
  const composerInputRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const previousLastMessageIdRef = useRef('');
  const isCrisis = activeRoom?.Description && activeRoom.Description.startsWith('[CRISIS]');

  const [toolsOpen, setToolsOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('harassment');
  const [reportSeverity, setReportSeverity] = useState('medium');
  const [reportComment, setReportComment] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [exportPasswordModalOpen, setExportPasswordModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [gaiaProofConfirmOpen, setGaiaProofConfirmOpen] = useState(false);
  const [kickConfirmMemberId, setKickConfirmMemberId] = useState(null);
  const members = activeRoom?.Members || [];
  const actor = members.find(m => m.IdentityID === activeIdentity?.ID);
  const isOwner = actor?.Role === 'owner';
  const isAdmin = actor?.Role === 'admin';
  const isPrivileged = isOwner || isAdmin;
  const isReadOnly = activeRoom?.ReadOnly && !isPrivileged;

  const slowModeCooldown = slowModeCooldowns?.[activeRoom?.id || activeRoom?.ID] || 0;
  const isSlowModeActive = slowModeCooldown > 0;
  const isComposerDisabled = isReadOnly || isSlowModeActive;

  const downloadJSON = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    setExportPassword('');
    setExportPasswordModalOpen(true);
  };

  const submitEncryptedExport = async () => {
    const password = exportPassword.trim();
    if (!password) {
      triggerAlert?.('Export blockiert', 'Bitte gib ein Export-Passwort ein.', 'warning');
      return;
    }
    setExportBusy(true);
    try {
      const envelope = await crypto.encryptLocalRecord(channelMessages, password);
      downloadJSON(`group-export-${activeRoom.Name || 'group'}-${activeChannel.name}.json`, envelope);
      setExportPasswordModalOpen(false);
      setExportPassword('');
      triggerAlert?.(t('success') || 'Erfolg', t('export_success') || 'Gruppenkanal wurde erfolgreich verschluesselt exportiert.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('export_failed') || 'Export failed: ') + err.message, 'danger');
    } finally {
      setExportBusy(false);
    }
  };

  const handleExportGaiaProof = async () => {
    setGaiaProofConfirmOpen(true);
  };

  const submitGaiaProofExport = async () => {
    setGaiaProofConfirmOpen(false);
    try {
      const exportedMessages = [];
      for (const msg of channelMessages) {
        let proof = null;
        if (msg.id) {
          try {
            proof = await api.getMessageProof(msg.id);
          } catch (_) {}
        }
        exportedMessages.push({
          id: msg.id,
          sender: msg.sender,
          recipient: msg.recipient,
          body: msg.body,
          timestamp: msg.timestamp,
          attachments: msg.attachments,
          proof
        });
      }

      const gaiaProofPackage = {
        version: "gaiaproof-chat-v1",
        exportedAt: new Date().toISOString(),
        roomID: activeRoom.id || activeRoom.ID,
        channelID: activeChannel.id,
        messages: exportedMessages
      };

      downloadJSON(`gaiaproof-group-${activeRoom.Name || 'group'}-${activeChannel.name}.json`, assertSecureExportClean(sanitizeSecureExport(gaiaProofPackage)));
      triggerAlert?.(t('success') || 'Erfolg', t('gaiaproof_export_success') || 'GaiaProof-Paket wurde erfolgreich exportiert.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('gaiaproof_export_failed') || 'GaiaProof-Export failed: ') + err.message, 'danger');
    }
  };

  const openReportGroupModal = () => {
    setReportCategory('harassment');
    setReportSeverity('medium');
    setReportComment('');
    setReportModalOpen(true);
  };

  const submitGroupReport = async () => {
    const comment = reportComment.trim();
    if (comment.length > REPORT_COMMENT_LIMIT) {
      triggerAlert?.('Meldung zu lang', `Maximal ${REPORT_COMMENT_LIMIT} Zeichen.`);
      return;
    }
    setReportBusy(true);
    try {
      await api.submitAbuseReport(
        activeIdentity.ID,
        'room',
        activeRoom.ID || activeRoom.id,
        reportCategory,
        reportSeverity,
        null,
        comment
      );
      setReportModalOpen(false);
      triggerAlert?.(t('success') || 'Erfolg', t('report_success') || 'Gruppe wurde erfolgreich gemeldet.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('report_failed') || 'Fehler beim Melden: ') + err.message);
    } finally {
      setReportBusy(false);
    }
  };


  // Group-local search for filtering historical messages
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Right-side members list panel toggle
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  // Search inside members panel
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [typingMembers, setTypingMembers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const appendChatEmoji = emoji => {
    setChatInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const channelMessages = useMemo(() => {
    if (!activeChannel) return [];
    return chatMessages.filter(msg => msg.channelId === activeChannel.id);
  }, [activeChannel, chatMessages]);

  // Filter messages based on localSearchQuery
  const filteredMessages = useMemo(() => {
    if (!localSearchQuery.trim()) return channelMessages;
    const query = localSearchQuery.toLowerCase();
    return channelMessages.filter(msg =>
      msg.body && msg.body.toLowerCase().includes(query)
    );
  }, [channelMessages, localSearchQuery]);

  const timelineItems = useMemo(() => buildTimelineItems(filteredMessages), [filteredMessages]);
  const lastMessageId = filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1].id : '';
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);
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

  const syncScrollState = () => {
    if (!scrollRef.current) return;
    const distanceFromBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight;
    const nearBottom = distanceFromBottom <= 72;
    setIsNearBottom(current => (current === nearBottom ? current : nearBottom));
    if (nearBottom) {
      setPendingMessageCount(0);
    }
  };

  const scrollToLatest = behavior => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior
    });
    setPendingMessageCount(0);
    setIsNearBottom(true);
  };

  useEffect(() => {
    setPendingMessageCount(0);
    setIsNearBottom(true);
    previousLastMessageIdRef.current = '';
    window.requestAnimationFrame(() => {
      scrollToLatest('auto');
    });
  }, [activeRoom?.ID, activeChannel?.id]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    syncScrollState();
    const handleScroll = () => syncScrollState();
    node.addEventListener('scroll', handleScroll);

    return () => {
      node.removeEventListener('scroll', handleScroll);
    };
  }, [activeRoom?.ID, activeChannel?.id]);

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
  }, [isNearBottom, lastMessageId]);

  useEffect(() => () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setMentionQuery('');
    setMentionStartIndex(-1);
    setSelectedMentionIndex(0);
  }, [activeChannel?.id, activeRoom?.ID]);

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
  }, [chatInputText]);

  const actorIsAdmin = !!activeRoom?.Members?.find(member => member.IdentityID === activeIdentity?.ID && member.Role === 'admin');
  const actorCanManage = !!(
    activeRoom &&
    activeIdentity &&
    (
      activeRoom.CreatorID === activeIdentity.ID ||
      activeRoom.CreatedBy === activeIdentity.ID ||
      actorIsAdmin
    )
  );

  const isOwnMessage = message => (
    (message.sender && activeIdentity?.ID && message.sender === activeIdentity.ID) ||
    (message.sender && activeIdentity?.GaiaID && parseToGaiaID(message.sender) === parseToGaiaID(activeIdentity.GaiaID)) ||
    (message.senderGaia && activeIdentity?.GaiaID && parseToGaiaID(message.senderGaia) === parseToGaiaID(activeIdentity.GaiaID))
  );

  const senderNameFor = message => {
    if (isOwnMessage(message)) {
      return activeIdentity?.DisplayName || activeIdentity?.displayName || t('you') || 'Du';
    }
    const senderMember = activeRoom?.Members?.find(member =>
      member.IdentityID === message.sender ||
      (member.Identity?.GaiaID && parseToGaiaID(member.Identity.GaiaID) === parseToGaiaID(message.sender)) ||
      (member.Identity?.GaiaID && parseToGaiaID(member.Identity.GaiaID) === parseToGaiaID(message.senderGaia))
    );
    return senderMember?.Identity?.DisplayName ||
      senderMember?.Username ||
      (message.senderGaia ? displayGaiaID(message.senderGaia) : '') ||
      (message.sender ? displayGaiaID(message.sender) : t('unknown_sender') || 'Unbekannt');
  };

  const memberNameForGaiaID = gaiaID => {
    const member = activeRoom?.Members?.find(entry =>
      entry.Identity?.GaiaID && parseToGaiaID(entry.Identity.GaiaID) === parseToGaiaID(gaiaID)
    );
    return member?.Identity?.DisplayName || member?.Username || displayGaiaID(gaiaID);
  };

  const applyMention = suggestion => {
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
  };

  const handleComposerKeyDown = event => {
    if (!mentionMenuOpen) {
      return;
    }

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
    }
  };

  const openMessageActions = (event, messageId) => {
    event.preventDefault();
    event.stopPropagation();
    setActionMessageId(messageId);
  };

  const startLongPress = messageId => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      setActionMessageId(messageId);
    }, 520);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const jumpToMessage = messageId => {
    if (!scrollRef.current) return;
    const target = scrollRef.current.querySelector(`[data-message-id="${messageId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const replyToMessage = message => {
    setMessageReplyTarget({
      messageId: message.id,
      sender: message.sender,
      senderGaia: message.senderGaia,
      bodyPreview: messagePreview(message),
      createdAt: message.createdAt,
      channelId: message.channelId,
      roomId: message.roomId
    });
  };

  const localKickMember = async (memberId) => {
    setKickConfirmMemberId(memberId);
  };

  const confirmKickMember = async () => {
    if (!activeRoom || !activeIdentity) return;
    const memberId = kickConfirmMemberId;
    if (!memberId) return;
    setKickConfirmMemberId(null);
    
    try {
      await handleKickMember(activeRoom.ID || activeRoom.id, memberId);
      triggerAlert('Mitglied entfernt', 'Das Mitglied wurde aus der Gruppe entfernt.');
      if (fetchRooms) {
        await fetchRooms();
      }
    } catch (err) {
      triggerAlert('Fehler', err.message, 'danger');
    }
  };

  // Filter members list based on memberSearchQuery
  const filteredMembers = useMemo(() => {
    if (!activeRoom?.Members) return [];
    if (!memberSearchQuery.trim()) return activeRoom.Members;
    const query = memberSearchQuery.toLowerCase();
    return activeRoom.Members.filter(m => {
      const displayName = (m.Identity?.DisplayName || m.Username || '').toLowerCase();
      const gaiaID = (m.Identity?.GaiaID || '').toLowerCase();
      return displayName.includes(query) || gaiaID.includes(query);
    });
  }, [activeRoom, memberSearchQuery]);

  if (!activeRoom) {
    return (
      <aside className="group-sidebar empty-group-state">
        {t('keine_gruppe_ausgewaehlt') || 'Keine Gruppe ausgewählt.'}
      </aside>
    );
  }

  // Determine if it is a public/private room. Default to private E2EE.
  const isPrivateRoom = activeRoom.IsPrivate !== false;

  return (
    <div className="group-chat-layout" style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="detail-mobile-actions">
        <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
          {t('menu') || 'Menü'}
        </button>
        <button type="button" className="mobile-back-btn" onClick={() => setActiveRoom(null)}>
          {t('gruppen_chats') || 'Gruppen'}
        </button>
        {activeChannel && (
          <button type="button" className="mobile-back-btn" onClick={() => setActiveChannel(null)}>
            {t('kanaele') || 'Kanäle'}
          </button>
        )}
      </div>

      {/* RIGHT SIDEBAR: CHANNELS */}
      <aside className="group-sidebar" style={{ order: 2, width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)' }}>
        <div className="group-nav-row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="group-room-title" style={{ fontWeight: 'bold', fontSize: '1rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {activeRoom.Name}
          </div>
          <div className="group-nav-actions" style={{ display: 'flex', gap: '8px' }}>
            {actorCanManage && (
              <button className="btn-action group-compact-action" onClick={() => setShowCreateChannelModal(true)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                {t('kanal_erstellen') || '+ Kanal'}
              </button>
            )}
            {actorCanManage && (
              <button
                type="button"
                className="btn-secondary group-settings-icon"
                onClick={handleOpenGroupSettings}
                title={t('group_settings_title') || 'Einstellungen'}
                style={{ padding: '4px 8px' }}
              >
                ⚙️
              </button>
            )}
          </div>
        </div>

        {/* CHANNELS LIST */}
        <div className="channel-list" style={{ flex: 1, padding: '14px 0', overflowY: 'auto' }}>
          <div className="channel-header" style={{ padding: '0 18px 8px 18px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <span>{t('kanaele') || '# Kanäle'}</span>
          </div>
          {channels.map(channel => (
            <button
              type="button"
              key={channel.id}
              className={`channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => setActiveChannel(channel)}
              style={{
                width: '100%',
                padding: '8px 18px',
                textAlign: 'left',
                background: activeChannel?.id === channel.id ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                border: 'none',
                color: activeChannel?.id === channel.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span># {channel.name}</span>
            </button>
          ))}
        </div>

        {/* POLICY BOX & LEAVE GROUP */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-color)' }}>
          <div className="group-policy-box" style={{ padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', fontSize: '0.75rem', marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {isPrivateRoom ? '🔒 Privater E2EE Raum' : '🌐 Öffentlicher Raum'}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              {isCrisis ? 'Krisen-Audit aktiv' : 'Gruppen-Verschlüsselung aktiv'}
            </div>
          </div>

          <button className="btn-secondary group-leave-btn" onClick={() => handleLeaveRoom(activeRoom.ID)} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: 'var(--danger)' }}>
            {t('gruppe_verlassen') || 'Gruppe verlassen'}
          </button>
          
          {/* Display Invite code if room is public, OR if user is admin/creator in a private room */}
          {( !isPrivateRoom || actorCanManage ) && activeRoom.SecretHash && (
            <div className="group-invite-box">
              <span>{t('einladungscode') || 'Einladungscode:'}</span>
              <code>{activeRoom.SecretHash}</code>
              <button
                type="button"
                className="btn-action"
                onClick={() => {
                  navigator.clipboard.writeText(activeRoom.SecretHash);
                  triggerAlert(t('kopiert') || 'Kopiert', t('code_kopieren_success') || 'Der Einladungscode wurde kopiert.');
                }}
              >
                {t('kopieren') || 'Kopieren'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* CENTER: CHAT VIEW */}
      <div className="chat-container group-main-chat" style={{ order: 1, flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {activeChannel ? (
          <>
            <header className="reader-header chat-reader-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="chat-peer-header">
                <div className="chat-peer-icon" aria-hidden="true">#</div>
                <div>
                  <h3>#{activeChannel.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('channel_id') || 'Kanal-ID'}: {activeChannel.id}</span>
                  {typingMembers.length > 0 && (
                    <span className="chat-typing-status" style={{ marginTop: '4px' }}>
                      {typingMembers.length === 1
                        ? `${memberNameForGaiaID(typingMembers[0].actorGaiaId)} tippt gerade...`
                        : `${typingMembers.length} Mitglieder tippen gerade...`}
                    </span>
                  )}
                </div>
              </div>

              {/* Chat Actions: Search + Members Toggle */}
              <div className="group-chat-header-actions">
                <input
                  type="text"
                  className="input-field group-chat-search-input"
                  placeholder="Kanal durchsuchen..."
                  value={localSearchQuery}
                  onChange={e => setLocalSearchQuery(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', height: 'auto', margin: 0 }}
                />
                <div className="chat-tools-wrapper">
                <button
                  type="button"
                  className="btn-secondary chat-header-action"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => setToolsOpen(prev => !prev)}
                >
                  ⋮ Tools
                </button>

                {toolsOpen && (
                  <div className="glass-panel chat-tools-dropdown group-tools-dropdown">
                    <button type="button" className="btn-secondary" style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem' }} onClick={() => { setToolsOpen(false); setShowMembersPanel(prev => !prev); }}>
                      👥 {showMembersPanel ? 'Mitglieder ausblenden' : 'Mitglieder'} ({activeRoom.Members?.length || 0})
                    </button>
                    <button type="button" className="btn-secondary" style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem' }} onClick={() => { setToolsOpen(false); handleClearGroupChannel(); }}>
                      {t('clear_chat') || 'Chat leeren'}
                    </button>
                    <button type="button" className="btn-secondary" style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem' }} onClick={() => { setToolsOpen(false); openReportGroupModal(); }}>
                      ⚠️ {t('report_group') || 'Gruppe melden'}
                    </button>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                    <button type="button" className="btn-secondary" style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem' }} onClick={() => { setToolsOpen(false); handleExportJSON(); }}>
                      🔒 {t('export_encrypted') || 'Export (Verschlüsselt)'}
                    </button>
                    <button type="button" className="btn-secondary" style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem' }} onClick={() => { setToolsOpen(false); handleExportGaiaProof(); }}>
                      📜 {t('export_gaiaproof') || 'Export (GaiaProof)'}
                    </button>
                  </div>
                )}
                </div>
              </div>
            </header>

            <PinnedMessagesStrip
              messages={channelMessages}
              messageMeta={messageMeta}
              onJumpToMessage={jumpToMessage}
              t={t}
            />

            {/* CHAT MESSAGES PANEL */}
            <div className="chat-messages gaia-scrollbar" ref={scrollRef} onClick={() => setActionMessageId(null)} style={{ flex: 1, overflowY: 'auto' }}>
              {timelineItems.map(item => {
                if (item.type === 'divider') {
                  return <DateDivider key={item.id} label={item.label} />;
                }

                const message = item.message;
                const showUnreadDivider = unreadMarker?.firstUnreadMessageId && unreadMarker.firstUnreadMessageId === message.id;
                const outgoing = isOwnMessage(message);
                const meta = messageMeta[message.id] || {};
                return (
                  <React.Fragment key={message.id}>
                    {showUnreadDivider && <UnreadDivider count={unreadMarker?.count || 0} />}
                    <div
                      data-message-id={message.id}
                      className={`chat-bubble ${outgoing ? 'outgoing' : 'incoming'} ${meta.pinned ? 'pinned' : ''} ${meta.saved ? 'saved' : ''} ${message.topSecret ? 'top-secret' : ''}`}
                      onContextMenu={event => openMessageActions(event, message.id)}
                      onTouchStart={() => startLongPress(message.id)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                    >
                      {!outgoing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <button
                            type="button"
                            className="link-button contact-name-button group-sender-button"
                            onClick={() => openContactProfile(message.senderGaia || message.sender)}
                            style={{ margin: 0, padding: 0 }}
                          >
                            {senderNameFor(message)}
                          </button>
                          {getSenderRoles && getSenderRoles(message.senderGaia || message.sender)?.map(role => {
                            let bg = 'rgba(255,255,255,0.05)';
                            let color = 'var(--text-secondary)';
                            let border = '1px solid var(--border-color)';
                            let label = role;

                            if (role === 'node_operator') {
                              bg = 'rgba(168, 85, 247, 0.15)';
                              color = '#c084fc';
                              border = '1px solid rgba(168, 85, 247, 0.3)';
                              label = t('node_operator') || 'Node Operator';
                            } else if (role === 'senior_reviewer') {
                              bg = 'rgba(249, 115, 22, 0.15)';
                              color = '#fdba74';
                              border = '1px solid rgba(249, 115, 22, 0.3)';
                              label = t('senior_reviewer') || 'Senior Reviewer';
                            } else if (role === 'trusted_reviewer') {
                              bg = 'rgba(20, 184, 166, 0.15)';
                              color = '#2dd4bf';
                              border = '1px solid rgba(20, 184, 166, 0.3)';
                              label = t('trusted_reviewer') || 'Trusted Reviewer';
                            } else {
                              label = t(role) || role;
                            }

                            return (
                              <span
                                key={role}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '1px 5px',
                                  borderRadius: '8px',
                                  fontSize: '0.6rem',
                                  fontWeight: '600',
                                  background: bg,
                                  color: color,
                                  border: border,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em'
                                }}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <ReplyContext replyTo={message.replyTo} t={t} />
                      {message.topSecret && <div className="top-secret-badge">PQ Signature Active · ML-DSA-87</div>}
                      <div>{renderMarkdown(message.body, { mentionHandles: ownMentionHandles })}</div>
                      <MessageReactionStrip meta={meta} />
                      <div className="chat-bubble-meta">
                        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {meta.saved && <span>{t('message_saved') || 'Saved'}</span>}
                        <button type="button" className="chat-delete-btn" onClick={() => handleDeleteChatMessage(message.id)}>
                          {t('delete') || 'Delete'}
                        </button>
                        {message.untrusted && <span className="chat-untrusted">{t('untrusted') || 'Untrusted'}</span>}
                      </div>
                      <MessageActionMenu
                        open={actionMessageId === message.id}
                        message={message}
                        meta={meta}
                        onClose={() => setActionMessageId(null)}
                        onTogglePin={onToggleMessagePin}
                        onToggleSave={onToggleMessageSaved}
                        onReply={replyToMessage}
                        onReact={onReactToMessage}
                        t={t}
                      />
                    </div>
                  </React.Fragment>
                );
              })}
              {filteredMessages.length === 0 && (
                <div className="chat-empty-hint">
                  {localSearchQuery ? 'Keine Nachrichten entsprechen Ihrer Suche.' : (t('room_chat_start_hint') || 'Starten Sie die Konversation! Alle Nachrichten in diesem Gruppenkanal sind dezentral quantensicher E2E verschlüsselt.')}
                </div>
              )}
            </div>

            {/* INPUT ROW */}
            <div className="chat-composer-stack">
              <ScrollToLatestButton count={pendingMessageCount} onClick={() => scrollToLatest('smooth')} />
              <ReplyComposerPreview
                replyTarget={messageReplyTarget}
                onClear={() => setMessageReplyTarget(null)}
                t={t}
              />
              <form className="chat-input-row" onSubmit={handleSendGroupMessage}>
                <div className="emoji-control">
                  <button type="button" className="btn-secondary emoji-toggle" onClick={() => setShowEmojiPicker(prev => !prev)}>
                    {'\u{1F642}'}
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker" role="listbox" aria-label="Emoji Auswahl">
                      {GROUP_EMOJIS.map(emoji => (
                        <button type="button" key={emoji} onClick={() => appendChatEmoji(emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  ref={composerInputRef}
                  type="text"
                  className="input-field"
                  placeholder={
                    isReadOnly 
                      ? (t('room_read_only_placeholder') || 'Nur Owner und Admins können schreiben')
                      : isSlowModeActive
                        ? `Slow Mode: Bitte warten Sie ${slowModeCooldown}s...`
                        : `${t('message_to_channel') || 'Nachricht an'} #${activeChannel.name}`
                  }
                  value={chatInputText}
                  onChange={event => setChatInputText(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  disabled={isComposerDisabled}
                  required={!isComposerDisabled}
                />
                {mentionMenuOpen && (
                  <div className="chat-mention-menu" role="listbox" aria-label="Mention Vorschlaege">
                    {mentionSuggestions.map((suggestion, index) => (
                      <button
                        type="button"
                        key={`${suggestion.handle}-${suggestion.identityID}`}
                        className={`chat-mention-option ${index === selectedMentionIndex ? 'active' : ''}`}
                        onMouseDown={event => {
                          event.preventDefault();
                          applyMention(suggestion);
                        }}
                      >
                        <strong>@{suggestion.handle}</strong>
                        <span>{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button type="submit" className="btn-primary" disabled={isComposerDisabled}>
                  {t('senden') || 'Senden'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="empty-chat-state" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <h3>{t('kein_kanal_ausgewaehlt') || 'Kein Kanal ausgewählt'}</h3>
            <p>{t('select_channel_chat') || 'Wähle einen Kanal aus der linken Seitenleiste aus, um zu chatten.'}</p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: MEMBERS LIST PANEL */}
      {showMembersPanel && (
        <aside className="group-sidebar group-members-panel" style={{ order: 3, width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', background: 'rgba(15, 15, 18, 0.95)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
              👤 members ({activeRoom.Members?.length || 0})
            </span>
            <button
              type="button"
              className="link-button"
              style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setShowMembersPanel(false)}
            >
              ✕
            </button>
          </div>

          {/* Search inside members panel */}
          <div style={{ padding: '10px 14px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Mitglieder durchsuchen..."
              value={memberSearchQuery}
              onChange={e => setMemberSearchQuery(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.8rem', margin: 0 }}
            />
          </div>

          {/* Members list */}
          <div className="group-members-list gaia-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredMembers.map(member => {
              const isSelf = member.IdentityID === activeIdentity?.ID;
              const isAdmin = member.Role === 'admin';

              return (
                <div
                  key={member.IdentityID}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}
                      onClick={() => member.Identity?.GaiaID && openContactProfile(member.Identity.GaiaID)}
                    >
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {member.Identity?.DisplayName || member.Username} {isSelf && `(${t('you') || 'Du'})`}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {member.Identity ? displayGaiaID(member.Identity.GaiaID) : ''}
                      </span>
                    </div>

                    <span className={`member-role ${isAdmin ? 'admin' : ''}`} style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: isAdmin ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255,255,255,0.05)', color: isAdmin ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                      {isAdmin ? 'Admin' : 'Mitglied'}
                    </span>
                  </div>

                  {/* Actions for Admin on other members */}
                  {actorIsAdmin && !isSelf && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                      <select
                        value={member.Role}
                        onChange={event => handleUpdateMemberRole(member.IdentityID, event.target.value)}
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 4px',
                          background: 'var(--bg-dark)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="member">Mitglied</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        type="button"
                        className="btn-action btn-danger"
                        style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                        onClick={() => localKickMember(member.IdentityID)}
                      >
                        Kick
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Keine Mitglieder gefunden.
              </div>
            )}
          </div>
        </aside>
      )}

      {reportModalOpen && (
        <div className="gsn-report-overlay" style={{ position: 'fixed', inset: 0, zIndex: 25000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel gsn-report-dialog">
            <h3>Gruppe melden</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <label>
                Kategorie
                <select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)} disabled={reportBusy}>
                  <option value="spam">Spam / Werbung</option>
                  <option value="phishing">Phishing / Betrug</option>
                  <option value="malware">Malware / Schadcode</option>
                  <option value="harassment">Belästigung</option>
                  <option value="illegal_content">Illegale Inhalte</option>
                  <option value="threat">Akute Bedrohung</option>
                  <option value="other">Sonstiges</option>
                </select>
              </label>
              <label>
                Schweregrad
                <select value={reportSeverity} onChange={(event) => setReportSeverity(event.target.value)} disabled={reportBusy}>
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="critical">Kritisch</option>
                </select>
              </label>
              <label>
                Begründung
                <textarea
                  className="gsn-report-textarea"
                  value={reportComment}
                  maxLength={REPORT_COMMENT_LIMIT + 500}
                  onChange={(event) => setReportComment(event.target.value)}
                  disabled={reportBusy}
                  placeholder="Optionaler Kontext für das Meldecenter..."
                />
              </label>
              <div className={`gsn-report-count ${reportComment.length > REPORT_COMMENT_LIMIT ? 'over' : ''}`}>
                {reportComment.length}/{REPORT_COMMENT_LIMIT}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setReportModalOpen(false)} disabled={reportBusy}>
                  Abbrechen
                </button>
                <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={submitGroupReport} disabled={reportBusy || reportComment.length > REPORT_COMMENT_LIMIT}>
                  {reportBusy ? 'Sendet...' : 'Melden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {exportPasswordModalOpen && (
        <div className="gsn-report-overlay" style={{ position: 'fixed', inset: 0, zIndex: 25000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel gsn-report-dialog">
            <h3>Gruppenkanal exportieren</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <label>
                Export-Passwort
                <input
                  type="password"
                  className="input-field"
                  value={exportPassword}
                  onChange={(event) => setExportPassword(event.target.value)}
                  disabled={exportBusy}
                  autoFocus
                />
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setExportPasswordModalOpen(false)} disabled={exportBusy}>
                  Abbrechen
                </button>
                <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={submitEncryptedExport} disabled={exportBusy || !exportPassword.trim()}>
                  {exportBusy ? 'Exportiert...' : 'Exportieren'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gaiaProofConfirmOpen && (
        <div className="gsn-report-overlay" style={{ position: 'fixed', inset: 0, zIndex: 25000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel gsn-report-dialog">
            <h3>GaiaProof exportieren</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Das Paket enthaelt Signaturen und Server-Zustellnachweise fuer diesen Gruppenkanal.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setGaiaProofConfirmOpen(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={submitGaiaProofExport}>
                Exportieren
              </button>
            </div>
          </div>
        </div>
      )}

      {kickConfirmMemberId && (
        <div className="gsn-report-overlay" style={{ position: 'fixed', inset: 0, zIndex: 25000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel gsn-report-dialog">
            <h3>Mitglied entfernen</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Dieses Mitglied wird aus der Gruppe entfernt.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setKickConfirmMemberId(null)}>
                Abbrechen
              </button>
              <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={confirmKickMember}>
                Entfernen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatPane;
