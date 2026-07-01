// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { renderMarkdown } from '../../utils/markdown';
import { assertSecureExportClean, sanitizeSecureExport } from '../../utils/secureExport';
import * as api from '../../api';
import * as crypto from '../../crypto';
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

const VoiceNotePlayer = ({ inlineData }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="voice-note-player" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      borderRadius: '24px',
      background: 'rgba(0, 242, 254, 0.1)',
      border: '1px solid rgba(0, 242, 254, 0.2)',
      maxWidth: '280px',
      marginTop: '6px'
    }}>
      <audio ref={audioRef} src={inlineData} />
      <button type="button" onClick={togglePlay} style={{
        background: 'var(--accent-cyan)',
        border: 'none',
        color: 'var(--bg-dark)',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1rem',
        padding: 0
      }}>
        {playing ? '⏸️' : '▶️'}
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{
          height: '4px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'var(--accent-cyan)',
            width: `${duration ? (progress / duration) * 100 : 0}%`
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

const DecryptedImage = ({ fileId, keyHex, ivHex, alt }) => {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = "";
    const load = async () => {
      try {
        const blob = await api.downloadFileAttachment(fileId);
        const decrypted = await crypto.decryptFileSymmetric(blob, keyHex, ivHex);
        if (active) {
          createdUrl = URL.createObjectURL(decrypted);
          setImgUrl(createdUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to decrypt image:", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileId, keyHex, ivHex]);

  if (loading) return <div className="img-placeholder" style={{ width: '120px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Entschlüssele...</div>;
  if (error) return <div style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>Bild konnte nicht geladen werden.</div>;

  return (
    <>
      <img
        src={imgUrl}
        alt={alt}
        style={{
          maxWidth: '240px',
          maxHeight: '240px',
          borderRadius: '8px',
          marginTop: '6px',
          border: '1px solid var(--border-color)',
          cursor: 'zoom-in',
          transition: 'transform 0.2s ease-in-out'
        }}
        onClick={() => setIsZoomed(true)}
      />
      {isZoomed && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
          onClick={() => setIsZoomed(false)}
        >
          <img
            src={imgUrl}
            alt={alt}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              animation: 'zoomIn 0.2s ease-out'
            }}
          />
          <button
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(false);
            }}
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
};

const DecryptedFileDownload = ({ fileId, keyHex, ivHex, fileName, triggerAlert }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await api.downloadFileAttachment(fileId);
      const decrypted = await crypto.decryptFileSymmetric(blob, keyHex, ivHex);
      const url = URL.createObjectURL(decrypted);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      triggerAlert?.('Download fehlgeschlagen', err.message || 'Datei konnte nicht entschluesselt werden.', 'danger');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={handleDownload}
      disabled={downloading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '6px',
        fontSize: '0.8rem',
        padding: '4px 8px'
      }}
    >
      📥 {downloading ? 'Lade herunter...' : `Datei herunterladen (${fileName})`}
    </button>
  );
};

const CHAT_EMOJIS = [
  '\u{1F600}', '\u{1F604}', '\u{1F602}', '\u{1F60A}', '\u{1F60D}', '\u{1F60E}',
  '\u{1F91D}', '\u{1F64F}', '\u{1F44D}', '\u{1F525}', '\u{2728}', '\u{1F680}',
  '\u{1F512}', '\u{1F6E1}\u{FE0F}', '\u{26A1}', '\u{2705}', '\u{2757}', '\u{2764}\u{FE0F}'
];

const REPORT_COMMENT_LIMIT = 8000;

export const ChatPane = ({
  activeChatContact,
  activeDirectTopSecret = false,
  setDirectTopSecretEnabled,
  chatMessages,
  activeIdentity,
  chatInputText,
  setChatInputText,
  handleSendChatMessage,
  setMobileMenuOpen,
  setActiveChatContact,
  showEmojiPicker,
  setShowEmojiPicker,
  handleDeleteChatMessage,
  handleEditChatMessage,
  openContactProfile,
  messageMeta = {},
  onToggleMessagePin,
  onToggleMessageSaved,
  onReactToMessage,
  messageReplyTarget,
  setMessageReplyTarget,
  t,
  getSenderRoles,
  contactPresence,
  unreadMarker,
  uploadProgress,
  uploadChatFile,
  driveRecords = [],
  prepareDriveRecordForChatShare,
  toggleBlockContact,
  triggerAlert
}) => {
  const scrollRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const previousLastMessageIdRef = useRef('');
  const [actionMessageId, setActionMessageId] = useState(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInputText, setEditInputText] = useState('');
  const [contactTyping, setContactTyping] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);

  const [toolsOpen, setToolsOpen] = useState(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('harassment');
  const [reportSeverity, setReportSeverity] = useState('medium');
  const [reportComment, setReportComment] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [exportPasswordModalOpen, setExportPasswordModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [gaiaProofConfirmOpen, setGaiaProofConfirmOpen] = useState(false);
  const peerTopSecretHint = Boolean(
    activeChatContact?.mldsa87Public ||
    activeChatContact?.mldsa87 ||
    activeChatContact?.publicKeys?.mldsa87 ||
    activeChatContact?.public_keys?.mldsa87
  );

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const lastIncomingMessageIdRef = useRef('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeChatContact && activeIdentity) {
      setIsBlocked(!!activeChatContact.blocked);
    }
  }, [activeChatContact, activeIdentity]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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

  const openReportContactModal = () => {
    setReportCategory('harassment');
    setReportSeverity('medium');
    setReportComment('');
    setReportModalOpen(true);
  };

  const submitContactReport = async () => {
    if (!activeIdentity || !activeChatContact) return;
    const comment = reportComment.trim();
    if (comment.length > REPORT_COMMENT_LIMIT) {
      triggerAlert?.('Meldung zu lang', `Maximal ${REPORT_COMMENT_LIMIT} Zeichen.`, 'warning');
      return;
    }
    setReportBusy(true);
    try {
      await api.submitAbuseReport(
        activeIdentity.ID,
        'user',
        activeChatContact.ID,
        reportCategory,
        reportSeverity,
        null,
        comment
      );
      setReportModalOpen(false);
      triggerAlert?.(t('success') || 'Erfolg', t('report_success') || 'Kontakt wurde erfolgreich gemeldet.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('report_failed') || 'Fehler beim Melden: ') + err.message, 'danger');
    } finally {
      setReportBusy(false);
    }
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
      const envelope = await crypto.encryptLocalRecord(visibleMessages, password);
      downloadJSON(`chatexport-${activeChatContact.displayName || 'chat'}.json`, envelope);
      setExportPasswordModalOpen(false);
      setExportPassword('');
      triggerAlert?.(t('success') || 'Erfolg', t('export_success') || 'Chat wurde erfolgreich verschluesselt exportiert.');
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
      for (const msg of visibleMessages) {
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
        chatPartner: activeChatContact.gaiaID,
        chatPartnerPublicKey: activeChatContact.publicKey,
        messages: exportedMessages
      };

      downloadJSON(`gaiaproof-chat-${activeChatContact.displayName || 'chat'}.json`, assertSecureExportClean(sanitizeSecureExport(gaiaProofPackage)));
      triggerAlert?.(t('success') || 'Erfolg', t('gaiaproof_export_success') || 'GaiaProof-Paket wurde erfolgreich exportiert.');
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('gaiaproof_export_failed') || 'GaiaProof-Export failed: ') + err.message, 'danger');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result;
            await handleSendChatMessage(null, [{
              fileId: 'voicenote-' + Date.now(),
              fileName: 'Sprachnachricht.webm',
              fileSize: audioBlob.size,
              mimeType: 'audio/webm',
              keyHex: '',
              ivHex: '',
              inlineData: base64data
            }]);
          };
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('mic_access_denied') || 'Mikrofonzugriff verweigert: ') + err.message, 'danger');
    }
  };

  const stopRecording = (cancel = false) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (cancel) {
      audioChunksRef.current = [];
    }
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    try {
      const att = await uploadChatFile(file);
      if (att) {
        setStagedAttachments(prev => [...prev, att]);
      }
    } catch (err) {
      // already handled
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const shareableDriveRecords = useMemo(() => {
    const now = Date.now();
    return (driveRecords || []).filter(record => (
      record?.type === 'file' &&
      record.keyHex &&
      record.ivHex &&
      (
        (record.cloudFileId && (!record.cloudExpiresAt || new Date(record.cloudExpiresAt).getTime() > now)) ||
        record.opfsName
      )
    ));
  }, [driveRecords]);

  const attachDriveRecord = async (record) => {
    if (!record) return;
    setUploading(true);
    try {
      const shareRecord = prepareDriveRecordForChatShare
        ? await prepareDriveRecordForChatShare(record)
        : record;
      if (!shareRecord?.cloudFileId) {
        throw new Error('GaiaDrive-Datei besitzt keine Cloud-Freigabe.');
      }
      setStagedAttachments(prev => [...prev, {
        fileId: shareRecord.cloudFileId,
        keyHex: shareRecord.keyHex,
        ivHex: shareRecord.ivHex,
        fileName: shareRecord.fileName || shareRecord.title || 'GaiaDrive Datei',
        mimeType: shareRecord.mimeType || 'application/octet-stream',
        size: shareRecord.sizeBytes || 0,
        source: 'gaiadrive',
        expiresInHours: 12
      }]);
      setDrivePickerOpen(false);
      triggerAlert?.('GaiaDrive', 'Datei wird fuer 12 Stunden im Chat freigegeben.');
    } catch (err) {
      triggerAlert?.('GaiaDrive', err.message || 'Datei konnte nicht fuer den Chat vorbereitet werden.', 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setChatInputText(val);
    const lastWord = val.split(/\s+/).pop();
    if (lastWord.startsWith('@')) {
      setMentionOpen(true);
      setMentionFilter(lastWord.slice(1).toLowerCase());
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (name) => {
    const words = chatInputText.split(/\s+/);
    words.pop();
    words.push(`@${name}`);
    setChatInputText(words.join(' ') + ' ');
    setMentionOpen(false);
  };

  const handleSendWrapper = async (e) => {
    if (e) e.preventDefault();
    if (isRecording) {
      stopRecording(false);
      return;
    }
    await handleSendChatMessage(e, stagedAttachments);
    setStagedAttachments([]);
  };

  const appendChatEmoji = emoji => {
    setChatInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const visibleMessages = useMemo(() => {
    if (!activeChatContact || !activeIdentity) return [];
    return chatMessages.filter(msg =>
      (msg.sender === activeChatContact.gaiaID && msg.recipient === activeIdentity.GaiaID) ||
      (msg.sender === activeIdentity.GaiaID && msg.recipient === activeChatContact.gaiaID)
    );
  }, [activeChatContact, activeIdentity, chatMessages]);

  const lastIncomingMessage = useMemo(() => {
    const incoming = visibleMessages.filter(m => m.sender !== activeIdentity.GaiaID);
    return incoming.length > 0 ? incoming[incoming.length - 1] : null;
  }, [visibleMessages, activeIdentity.GaiaID]);

  useEffect(() => {
    if (!lastIncomingMessage) return;
    if (lastIncomingMessageIdRef.current && lastIncomingMessageIdRef.current !== lastIncomingMessage.id) {
      if (document.hidden && Notification.permission === 'granted') {
        new Notification(activeChatContact.displayName || 'Neue Nachricht', {
          body: lastIncomingMessage.body || 'Datei empfangen',
          icon: '/favicon.ico'
        });
      }
    }
    lastIncomingMessageIdRef.current = lastIncomingMessage.id;
  }, [lastIncomingMessage, activeChatContact]);

  const filteredMessages = useMemo(() => {
    if (!localSearchQuery.trim()) return visibleMessages;
    const query = localSearchQuery.toLowerCase();
    return visibleMessages.filter(msg => {
      const body = String(msg.body || '').toLowerCase();
      const sender = String(msg.senderGaia || msg.sender || '').toLowerCase();
      return body.includes(query) || sender.includes(query);
    });
  }, [localSearchQuery, visibleMessages]);

  const timelineItems = useMemo(() => buildTimelineItems(filteredMessages), [filteredMessages]);
  const lastMessageId = filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1].id : '';
  const keyHistory = useMemo(
    () => (Array.isArray(activeChatContact?.keyHistory) ? activeChatContact.keyHistory : []),
    [activeChatContact?.keyHistory]
  );
  const keyRotationDismissKey = useMemo(() => {
    if (!activeChatContact?.gaiaID || keyHistory.length <= 1) return '';
    const fingerprints = keyHistory
      .map(entry => entry?.fingerprint || entry?.publicKey || '')
      .filter(Boolean)
      .join('|');
    return `${activeChatContact.gaiaID}|${fingerprints}`;
  }, [activeChatContact?.gaiaID, keyHistory]);
  const [dismissedKeyRotation, setDismissedKeyRotation] = useState('');
  const keyRotationDismissStorageKey = activeChatContact?.gaiaID
    ? `key_rotation_notice_${activeIdentity?.ID || 'local'}_${activeChatContact.gaiaID}`
    : '';
  const hasKeyRotation = keyHistory.length > 1 && keyRotationDismissKey !== dismissedKeyRotation;
  const recentSecurityAlerts = securityAlerts.slice(0, 3);
  const presenceLabel = contactPresence?.isOnline
    ? (contactPresence.status === 'away' ? 'abwesend' : contactPresence.status === 'busy' ? 'beschaeftigt' : 'online')
    : contactPresence?.lastSeenAt
      ? `zuletzt gesehen ${new Date(contactPresence.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'offline';
  const statusLabel = contactTyping ? 'tippt gerade...' : presenceLabel;

  useEffect(() => {
    if (!keyRotationDismissStorageKey) {
      setDismissedKeyRotation('');
      return;
    }
    setDismissedKeyRotation(localStorage.getItem(keyRotationDismissStorageKey) || '');
  }, [keyRotationDismissStorageKey]);

  const dismissKeyRotationNotice = () => {
    if (!keyRotationDismissKey) return;
    setDismissedKeyRotation(keyRotationDismissKey);
    if (keyRotationDismissStorageKey) {
      localStorage.setItem(keyRotationDismissStorageKey, keyRotationDismissKey);
    }
  };

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
    setLocalSearchQuery('');
    setSearchOpen(false);
    setPendingMessageCount(0);
    setIsNearBottom(true);
    previousLastMessageIdRef.current = '';
    window.requestAnimationFrame(() => {
      scrollToLatest('auto');
    });
  }, [activeChatContact?.ID, activeChatContact?.gaiaID]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    syncScrollState();
    const handleScroll = () => syncScrollState();
    node.addEventListener('scroll', handleScroll);

    return () => {
      node.removeEventListener('scroll', handleScroll);
    };
  }, [activeChatContact?.ID, activeChatContact?.gaiaID]);

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
    if (!activeIdentity?.ID) {
      setSecurityAlerts([]);
      return undefined;
    }

    let stopped = false;
    const isRelevantSecurityEvent = event => {
      const category = String(event?.category || '').toLowerCase();
      const summary = String(event?.summary || '').toLowerCase();
      return (
        category.includes('replay') ||
        category.includes('tamper') ||
        category.includes('integrity') ||
        summary.includes('replay') ||
        summary.includes('manipulation') ||
        summary.includes('integrity')
      );
    };

    const loadSecurityAlerts = async () => {
      try {
        const result = await api.getSecurityEvents();
        if (!stopped) {
          setSecurityAlerts((result?.events || []).filter(event => !event?.acknowledged_at && isRelevantSecurityEvent(event)));
        }
      } catch (_) {
        if (!stopped) {
          setSecurityAlerts([]);
        }
      }
    };

    loadSecurityAlerts();
    const interval = window.setInterval(loadSecurityAlerts, 15000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeIdentity?.ID]);

  useEffect(() => {
    if (!activeIdentity?.ID || !activeChatContact?.gaiaID) {
      setContactTyping(false);
      return undefined;
    }

    let stopped = false;
    const loadTyping = async () => {
      try {
        const result = await api.getTypingStatus(activeIdentity.ID, {
          peerGaiaId: activeChatContact.gaiaID
        });
        if (!stopped) {
          setContactTyping(!!result?.direct?.isTyping);
        }
      } catch (_) {
        if (!stopped) {
          setContactTyping(false);
        }
      }
    };

    loadTyping();
    const interval = window.setInterval(loadTyping, 2000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeChatContact?.gaiaID, activeIdentity?.ID]);

  useEffect(() => {
    if (!activeIdentity?.ID || !activeChatContact?.gaiaID) {
      return undefined;
    }

    const shouldSignalTyping = !isBlocked && chatInputText.trim().length > 0;
    let cancelled = false;

    const sendTypingState = async isTypingNow => {
      try {
        await api.updateTypingStatus(activeIdentity.ID, {
          peerGaiaId: activeChatContact.gaiaID,
          isTyping: isTypingNow
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
  }, [activeChatContact?.gaiaID, activeIdentity?.ID, chatInputText, isBlocked]);

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
      createdAt: message.createdAt
    });
  };

  const startEditingMessage = message => {
    setEditingMessageId(message.id);
    setEditInputText(message.body || '');
  };

  const saveEditedMessage = async message => {
    if (!editInputText.trim()) return;
    const succeeded = await handleEditChatMessage?.(message, editInputText);
    if (succeeded) {
      setEditingMessageId(null);
      setEditInputText('');
    }
  };

  if (!activeChatContact) {
    return (
      <div className="chat-container empty-chat-state nebula-empty-state">
        <h3>{t('kein_chat_ausgewaehlt') || 'Kein Chat ausgewaehlt'}</h3>
        <p>{t('select_contact_chat') || 'Waehle einen Kontakt aus dem linken Panel aus, um einen quantensicheren E2E-Chat zu starten.'}</p>
      </div>
    );
  }

  return (
    <div className="chat-container nebula-chat-shell">
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        .blink-dot {
          animation: blink 1s infinite;
        }
        .chat-attachments-list img {
          max-width: 240px;
          max-height: 240px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          display: block;
          margin-top: 6px;
        }
      `}</style>

      <div className="detail-mobile-actions chat-detail-mobile-actions">
        <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)}>
          {t('menu') || 'Menu'}
        </button>
        <button type="button" className="mobile-back-btn" onClick={() => setActiveChatContact(null)}>
          {'<'} {t('quanten_chat') || 'Chats'}
        </button>
      </div>

      <header className="reader-header chat-reader-header nebula-chat-hero" style={{ position: 'relative' }}>
        <div className="chat-header-primary">
          <div className="chat-peer-header">
            <div className="chat-peer-icon" aria-hidden="true">{'\u{1F464}'}</div>
            <button type="button" className="chat-peer-summary" onClick={() => openContactProfile(activeChatContact.gaiaID)}>
              <span className="chat-peer-name-row">
                <span className="contact-name-button">{activeChatContact.displayName}</span>
                {getSenderRoles && getSenderRoles(activeChatContact.gaiaID)?.slice(0, 2).map(role => {
                  let bg = 'rgba(255,255,255,0.06)';
                  let color = 'var(--text-primary)';
                  let border = '1px solid var(--border-color)';
                  let label = role;

                  if (role === 'node_operator') {
                    bg = 'rgba(168, 85, 247, 0.15)';
                    color = '#d8b4fe';
                    border = '1px solid rgba(168, 85, 247, 0.28)';
                    label = t('node_operator') || 'Node Operator';
                  } else if (role === 'senior_reviewer') {
                    bg = 'rgba(249, 115, 22, 0.15)';
                    color = '#fdba74';
                    border = '1px solid rgba(249, 115, 22, 0.28)';
                    label = t('senior_reviewer') || 'Senior Reviewer';
                  } else if (role === 'trusted_reviewer') {
                    bg = 'rgba(20, 184, 166, 0.15)';
                    color = '#5eead4';
                    border = '1px solid rgba(20, 184, 166, 0.28)';
                    label = t('trusted_reviewer') || 'Trusted Reviewer';
                  } else {
                    label = t(role) || role;
                  }

                  return (
                    <span key={role} className="chat-role-pill" style={{ background: bg, color, border }}>
                      {label}
                    </span>
                  );
                })}
              </span>
              <span className="chat-peer-subline chat-presence-status" style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                <span>{statusLabel}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 'bold' }} title="Ende-zu-Ende quantensicher verschlüsselt">
                    🔒 {t('encrypted') || 'Quantensicher'}
                  </span>
                  {activeChatContact.publicKey && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                      (FP: {activeChatContact.publicKey.slice(0, 8)}...{activeChatContact.publicKey.slice(-8)})
                    </span>
                  )}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="chat-header-tools nebula-chat-tools">
          <button
            type="button"
            className={`chat-icon-btn ${searchOpen ? 'active' : ''}`}
            onClick={() => setSearchOpen(prev => !prev)}
            aria-label="Chat durchsuchen"
            title="Chat durchsuchen"
          >
            {'\u2315'}
          </button>
          <button
            type="button"
            className={`chat-icon-btn ${toolsOpen ? 'active' : ''}`}
            onClick={() => setToolsOpen(prev => !prev)}
            aria-label="Weitere Aktionen"
            title="Weitere Aktionen"
          >
            {'\u22EF'}
          </button>
        </div>

        {toolsOpen && (
          <div className="glass-panel chat-tools-dropdown" style={{
            position: 'absolute',
            top: '60px',
            right: '16px',
            zIndex: 2400,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'rgba(8, 12, 22, 0.985)',
            backdropFilter: 'blur(18px) saturate(1.08)',
            boxShadow: '0 20px 58px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(88, 166, 255, 0.12)'
          }}>
            <button type="button" className="btn-secondary" style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem' }} onClick={() => { setToolsOpen(false); openContactProfile(activeChatContact.gaiaID); }}>
              🛡️ {t('check_fingerprint') || 'Fingerprint prüfen'}
            </button>
            <button type="button" className="btn-secondary" style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem' }} onClick={() => { setToolsOpen(false); toggleBlockContact(activeChatContact); }}>
              🚫 {isBlocked ? (t('unblock_contact') || 'Kontakt freigeben') : (t('block_contact') || 'Kontakt blockieren')}
            </button>
            <button type="button" className="btn-secondary" style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem' }} onClick={() => { setToolsOpen(false); openReportContactModal(); }}>
              ⚠️ {t('report_contact') || 'Kontakt melden'}
            </button>
            <button
              type="button"
              className={`btn-secondary ${activeDirectTopSecret ? 'active' : ''}`}
              style={{ textAlign: 'left', width: '100%', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}
              onClick={() => {
                setDirectTopSecretEnabled?.(!activeDirectTopSecret);
                setToolsOpen(false);
              }}
            >
              <span>{activeDirectTopSecret ? 'Top Secret Chat deaktivieren' : 'Top Secret Chat aktivieren'}</span>
              <small style={{ color: activeDirectTopSecret ? '#ff5bb0' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                {activeDirectTopSecret
                  ? 'PQ Signature Active: Ed25519 + ML-DSA-87'
                  : (peerTopSecretHint ? 'Empfaenger-Capability erkannt.' : 'ML-DSA-87 Capability wird beim Senden geprueft.')}
              </small>
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
      </header>

      {searchOpen && (
        <section className="chat-search-strip">
          <input
            type="text"
            className="input-field"
            placeholder="Chat durchsuchen..."
            value={localSearchQuery}
            onChange={event => setLocalSearchQuery(event.target.value)}
          />
        </section>
      )}

      {hasKeyRotation && (
        <div className="chat-security-banner chat-security-banner--warning">
          <strong>Schluesselwechsel erkannt.</strong>
          <span>
            Dieser Kontakt hat bereits mehr als einen bekannten Identitaetsschluessel. Vergleiche den Fingerprint vor weiterem Vertrauen.
          </span>
          <button type="button" className="btn-secondary" onClick={() => openContactProfile(activeChatContact.gaiaID)}>
            Fingerprint pruefen
          </button>
          <button type="button" className="btn-secondary" onClick={dismissKeyRotationNotice}>
            Ausblenden
          </button>
        </div>
      )}

      {recentSecurityAlerts.length > 0 && (
        <div className="chat-security-banner chat-security-banner--danger">
          <strong>GaiaShield hat Nachrichtenanomalien blockiert.</strong>
          <div className="chat-security-alert-list">
            {recentSecurityAlerts.map(event => (
              <span key={event.event_id}>{event.summary || event.category}</span>
            ))}
          </div>
        </div>
      )}

      {isBlocked && (
        <div className="smtp-security-banner" style={{ background: 'rgba(255, 59, 48, 0.15)', borderColor: 'var(--danger)', padding: '12px', textAlign: 'center', color: '#ff8b8b' }}>
          <strong>Kontakt blockiert.</strong> Sie koennen keine Nachrichten senden oder empfangen.
        </div>
      )}

      <PinnedMessagesStrip
        messages={visibleMessages}
        messageMeta={messageMeta}
        onJumpToMessage={jumpToMessage}
        t={t}
      />

      <div className="chat-messages gaia-scrollbar nebula-chat-timeline" ref={scrollRef} onClick={() => setActionMessageId(null)}>
        {timelineItems.map(item => {
          if (item.type === 'divider') {
            return <DateDivider key={item.id} label={item.label} />;
          }

          const msg = item.message;
          const showUnreadDivider = unreadMarker?.firstUnreadMessageId && unreadMarker.firstUnreadMessageId === msg.id;
          const isOutgoing = msg.sender === activeIdentity.GaiaID;
          const meta = messageMeta[msg.id] || {};
          const isEditing = editingMessageId === msg.id;
          const hasBeenEdited = msg.editedAt && !isNaN(new Date(msg.editedAt).getTime()) && new Date(msg.editedAt).getFullYear() > 1970;
          const displayedBody = msg.body;
          const deliveryStatus = msg.isRead
            ? { text: '\u2713\u2713', label: 'Gelesen', color: 'var(--accent-cyan)' }
            : msg.delivered
              ? { text: '\u2713', label: 'Zugestellt', color: 'var(--text-muted)' }
              : { text: '\u2713', label: 'Gesendet', color: 'var(--text-muted)' };

          return (
            <React.Fragment key={msg.id}>
              {showUnreadDivider && <UnreadDivider count={unreadMarker?.count || 0} />}
              <div
                data-message-id={msg.id}
                className={`chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'} ${meta.pinned ? 'pinned' : ''} ${meta.saved ? 'saved' : ''} ${msg.topSecret ? 'top-secret' : ''}`}
                onContextMenu={event => openMessageActions(event, msg.id)}
                onTouchStart={() => startLongPress(msg.id)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                style={{ paddingBottom: '16px' }}
              >
                <ReplyContext replyTo={msg.replyTo} t={t} />
                {msg.topSecret && <div className="top-secret-badge">PQ Signature Active · ML-DSA-87</div>}

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <textarea
                      className="input-field"
                      value={editInputText}
                      onChange={e => setEditInputText(e.target.value)}
                      style={{ background: 'var(--bg-dark)', minHeight: '60px', resize: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setEditingMessageId(null)}>Abbrechen</button>
                      <button type="button" className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => saveEditedMessage(msg)}>Speichern</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {renderMarkdown(displayedBody, { mentionHandles: [activeIdentity?.DisplayName, activeIdentity?.displayName, activeIdentity?.GaiaID] })}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="chat-attachments-list" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.attachments.map((att, idx) => {
                          if (att.inlineData) {
                            return <VoiceNotePlayer key={idx} inlineData={att.inlineData} />;
                          }
                          if (att.mimeType && att.mimeType.startsWith('image/')) {
                            return (
                              <DecryptedImage
                                key={idx}
                                fileId={att.fileId}
                                keyHex={att.keyHex}
                                ivHex={att.ivHex}
                                alt={att.fileName}
                              />
                            );
                          }
                          return (
                            <DecryptedFileDownload
                              key={idx}
                              fileId={att.fileId}
                              keyHex={att.keyHex}
                              ivHex={att.ivHex}
                              fileName={att.fileName}
                              triggerAlert={triggerAlert}
                            />
                          );
                        })}
                      </div>
                    )}
                    {hasBeenEdited && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontStyle: 'italic', marginTop: '4px' }}>
                        (bearbeitet)
                      </span>
                    )}
                  </div>
                )}

                <MessageReactionStrip meta={meta} />

                <div className="chat-bubble-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {meta.saved && <span style={{ color: 'var(--accent-cyan)' }}>{t('message_saved') || 'Saved'}</span>}

                  {isOutgoing && !isEditing && (
                    <button
                      type="button"
                      className="chat-delete-btn"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                      onClick={() => startEditingMessage(msg)}
                    >
                      Bearbeiten
                    </button>
                  )}

                  <button type="button" className="chat-delete-btn" onClick={() => handleDeleteChatMessage(msg.id)}>
                     {t('delete') || 'Delete'}
                  </button>
                  {msg.untrusted && <span className="chat-untrusted">{t('untrusted') || 'Untrusted'}</span>}

                  {isOutgoing && (
                    <span style={{ fontSize: '0.85rem', color: deliveryStatus.color, marginLeft: '4px', fontWeight: 'bold' }} title={deliveryStatus.label} aria-label={deliveryStatus.label}>
                      {deliveryStatus.text}
                    </span>
                  )}
                </div>

                <MessageActionMenu
                  open={actionMessageId === msg.id}
                  message={msg}
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
            {t('chat_start_hint') || 'Starten Sie die Konversation. Alle Chat-Nachrichten sind quantensicher E2E verschluesselt.'}
          </div>
        )}
      </div>

      <div className="chat-composer-stack nebula-composer-dock" style={{ position: 'relative' }}>
        <ScrollToLatestButton count={pendingMessageCount} onClick={() => scrollToLatest('smooth')} />
        
        {mentionOpen && (
          <div className="glass-panel mentions-autocomplete" style={{
            position: 'absolute',
            bottom: '60px',
            left: '16px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'rgba(20, 20, 25, 0.95)',
            backdropFilter: 'blur(10px)',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {[
              { name: activeChatContact.displayName, id: activeChatContact.gaiaID },
              { name: activeIdentity?.DisplayName || activeIdentity?.displayName, id: activeIdentity?.GaiaID }
            ].filter(candidate => {
              const filter = mentionFilter.toLowerCase();
              return (candidate.name && candidate.name.toLowerCase().includes(filter)) || 
                     (candidate.id && candidate.id.toLowerCase().includes(filter));
            }).map((candidate, idx) => (
              <button
                key={idx}
                type="button"
                className="btn-secondary"
                style={{ textAlign: 'left', fontSize: '0.8rem', padding: '6px 12px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', width: '100%' }}
                onClick={() => insertMention(candidate.name || candidate.id)}
              >
                @{candidate.name || candidate.id}
              </button>
            ))}
          </div>
        )}

        <ReplyComposerPreview
          replyTarget={messageReplyTarget}
          onClear={() => setMessageReplyTarget(null)}
          t={t}
        />

        {stagedAttachments.length > 0 && (
          <div className="staged-attachments-preview" style={{ display: 'flex', gap: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }}>
            {stagedAttachments.map((att, idx) => (
              <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '4px', fontSize: '0.8rem' }}>
                <span>📄 {att.fileName}</span>
                <button type="button" onClick={() => setStagedAttachments(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0 4px', fontSize: '0.9rem', fontWeight: 'bold' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', padding: '4px 8px' }}>
            Uploading: {uploadProgress}%
          </div>
        )}

        <form className="chat-input-row nebula-chat-input-row" onSubmit={handleSendWrapper}>
          {isRecording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, padding: '0 8px' }}>
              <span className="blink-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff3b30', display: 'inline-block' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Aufnahme... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
              <button type="button" className="btn-secondary" style={{ color: 'var(--danger)', marginLeft: 'auto', padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => stopRecording(true)}>
                Verwerfen
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                Senden
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div className="emoji-control">
                  <button type="button" className="btn-secondary emoji-toggle" onClick={() => setShowEmojiPicker(prev => !prev)} disabled={isBlocked}>
                    {'\u{1F642}'}
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker" role="listbox" aria-label="Emoji Auswahl">
                      {CHAT_EMOJIS.map(emoji => (
                        <button type="button" key={emoji} onClick={() => appendChatEmoji(emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isBlocked || uploading} title="Datei anhängen" style={{ padding: '0 10px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  📎
                </button>

                <div className="chat-drive-attach-control">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setDrivePickerOpen(prev => !prev)}
                    disabled={isBlocked || uploading || shareableDriveRecords.length === 0}
                    title="GaiaDrive Datei fuer 12 Stunden freigeben"
                    style={{ padding: '0 10px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    GD
                  </button>
                  {drivePickerOpen && (
                    <div className="glass-panel chat-tools-dropdown chat-drive-picker">
                      <div className="chat-drive-picker-title">GaiaDrive Freigabe - 12h</div>
                      <div className="chat-drive-picker-list gaia-scrollbar">
                        {shareableDriveRecords.map(record => (
                          <button
                            type="button"
                            key={record.id}
                            className="chat-drive-picker-item"
                            onClick={() => attachDriveRecord(record)}
                          >
                            <span>{record.fileName || record.title}</span>
                            <small>
                              {record.cloudFileId
                                ? `${record.sizeBytes ? `${(record.sizeBytes / 1024).toFixed(1)} KB · ` : ''}bereit`
                                : `${record.sizeBytes ? `${(record.sizeBytes / 1024).toFixed(1)} KB · ` : ''}wird vorbereitet`}
                            </small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button type="button" className="btn-secondary" onClick={startRecording} disabled={isBlocked} title="Sprachnachricht aufnehmen" style={{ padding: '0 10px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  🎙️
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <input
                type="text"
                className="input-field"
                placeholder={isBlocked ? 'Chat blockiert' : (t('chat_input_placeholder') || 'Sichere Nachricht eingeben...')}
                value={chatInputText}
                onChange={handleInputChange}
                disabled={isBlocked}
                required={stagedAttachments.length === 0}
              />
              <button type="submit" className="btn-primary" disabled={isBlocked}>
                {t('senden') || 'Senden'}
              </button>
            </>
          )}
        </form>
      </div>

      {reportModalOpen && (
        <div className="gsn-report-overlay" style={{ position: 'fixed', inset: 0, zIndex: 25000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel gsn-report-dialog">
            <h3>Kontakt melden</h3>
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
                <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={submitContactReport} disabled={reportBusy || reportComment.length > REPORT_COMMENT_LIMIT}>
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
            <h3>Chat verschluesselt exportieren</h3>
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
              Das Paket enthaelt Signaturen und Server-Zustellnachweise fuer diesen Chat.
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
    </div>
  );
};

export default ChatPane;
