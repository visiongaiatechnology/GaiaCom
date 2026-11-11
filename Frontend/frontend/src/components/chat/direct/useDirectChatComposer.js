import { useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../../api';

/**
 * Composer state for a 1:1 conversation: staged attachments, GaiaDrive share,
 * voice notes, mention suggestions and the outgoing typing signal.
 */
export default function useDirectChatComposer({
  activeChatContact,
  activeIdentity,
  isBlocked,
  chatInputText,
  setChatInputText,
  showEmojiPicker,
  setShowEmojiPicker,
  handleSendChatMessage,
  uploadChatFile,
  driveRecords,
  prepareDriveRecordForChatShare,
  triggerAlert,
  t
}) {
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  /* ---------- outgoing typing signal ---------- */
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

  /* ---------- the mention popover never survives a cleared composer ---------- */
  useEffect(() => {
    if (!/(^|\s)@[^\s@]*$/.test(chatInputText)) {
      setMentionOpen(false);
    }
  }, [chatInputText]);

  /* ---------- textarea grows with content, capped by the composer budget ------ */
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`;
  }, [chatInputText]);

  /* ---------- release recorder resources on unmount (without sending) -------- */
  useEffect(() => () => {
    discardRecordingRef.current = true;
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (_) {}
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      discardRecordingRef.current = false;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        if (discardRecordingRef.current) {
          audioChunksRef.current = [];
          return;
        }
        if (audioChunksRef.current.length > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result;
            await handleSendChatMessage(null, [{
              fileId: `voicenote-${Date.now()}`,
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
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(previous => previous + 1);
      }, 1000);
    } catch (err) {
      triggerAlert?.(t('error') || 'Fehler', (t('mic_access_denied') || 'Mikrofonzugriff verweigert: ') + err.message, 'danger');
    }
  };

  const stopRecording = (cancel = false) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (cancel) {
      audioChunksRef.current = [];
      discardRecordingRef.current = true;
    }
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleFileSelect = async event => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    try {
      const attachment = await uploadChatFile(file);
      if (attachment) {
        setStagedAttachments(previous => [...previous, attachment]);
      }
    } catch (_) {
      /* the upload helper reports its own error */
    } finally {
      setUploading(false);
      event.target.value = '';
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

  const attachDriveRecord = async record => {
    if (!record) return;
    setUploading(true);
    try {
      const shareRecord = prepareDriveRecordForChatShare
        ? await prepareDriveRecordForChatShare(record)
        : record;
      if (!shareRecord?.cloudFileId) {
        throw new Error('GaiaDrive-Datei besitzt keine Cloud-Freigabe.');
      }
      setStagedAttachments(previous => [...previous, {
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
      triggerAlert?.('GaiaDrive', 'Datei wird für 12 Stunden im Chat freigegeben.');
    } catch (err) {
      triggerAlert?.('GaiaDrive', err.message || 'Datei konnte nicht für den Chat vorbereitet werden.', 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = event => {
    const value = event.target.value;
    setChatInputText(value);
    const lastWord = value.split(/\s+/).pop();
    if (lastWord.startsWith('@')) {
      setMentionOpen(true);
      setMentionFilter(lastWord.slice(1).toLowerCase());
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = name => {
    const words = chatInputText.split(/\s+/);
    words.pop();
    words.push(`@${name}`);
    setChatInputText(`${words.join(' ')} `);
    setMentionOpen(false);
  };

  const handleSendWrapper = async event => {
    if (event) event.preventDefault();
    if (isRecording) {
      stopRecording(false);
      return;
    }
    await handleSendChatMessage(event, stagedAttachments);
    setStagedAttachments([]);
  };

  const appendChatEmoji = emoji => {
    setChatInputText(previous => previous + emoji);
    setShowEmojiPicker(false);
  };

  const handleComposerKeyDown = event => {
    if (event.nativeEvent?.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const removeStagedAttachment = index => {
    setStagedAttachments(previous => previous.filter((_, position) => position !== index));
  };

  const mentionCandidates = [
    { name: activeChatContact?.displayName, id: activeChatContact?.gaiaID },
    { name: activeIdentity?.DisplayName || activeIdentity?.displayName, id: activeIdentity?.GaiaID }
  ].filter(candidate => {
    const filter = mentionFilter.toLowerCase();
    return (candidate.name && candidate.name.toLowerCase().includes(filter)) ||
      (candidate.id && candidate.id.toLowerCase().includes(filter));
  });

  return {
    inputRef,
    fileInputRef,
    drivePickerOpen,
    setDrivePickerOpen,
    stagedAttachments,
    removeStagedAttachment,
    isRecording,
    recordingTime,
    mentionOpen,
    mentionFilter,
    mentionCandidates,
    uploading,
    shareableDriveRecords,
    startRecording,
    stopRecording,
    handleFileSelect,
    attachDriveRecord,
    handleInputChange,
    insertMention,
    handleSendWrapper,
    appendChatEmoji,
    handleComposerKeyDown
  };
}