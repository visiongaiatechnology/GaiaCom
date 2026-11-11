import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../ui/Icon';
import { formatClock } from '../shared/formatTime';

/**
 * Voice note attachment: local audio playback with honest progress + duration.
 *
 * Security/robustness notes:
 * - Received voice notes arrive as `data:audio/webm;base64,...`. The CSP allows
 *   `media-src 'self' blob:` (no `data:`), so the data URL is decoded once into
 *   a Blob object URL instead of being assigned to <audio src> directly.
 * - The object URL is revoked on unmount (and when the note changes).
 * - A decode/playback failure renders a factual fallback instead of an
 *   unhandled promise rejection.
 */
function dataUrlToBlobUrl(dataUrl) {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Invalid inline media data URL');
  const meta = dataUrl.slice(5, comma);
  const payload = dataUrl.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  const mime = (meta.split(';')[0] || 'audio/webm').trim() || 'audio/webm';
  if (!isBase64) {
    return URL.createObjectURL(new Blob([decodeURIComponent(payload)], { type: mime }));
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.codePointAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export default function VoiceNotePlayer({ inlineData }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let createdUrl = '';
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setFailed(false);
    try {
      if (inlineData) {
        createdUrl = String(inlineData).startsWith('data:')
          ? dataUrlToBlobUrl(String(inlineData))
          : String(inlineData);
        setSrc(createdUrl);
      } else {
        setSrc('');
        setFailed(true);
      }
    } catch (_) {
      setSrc('');
      setFailed(true);
    }
    return () => {
      if (createdUrl?.startsWith('blob:')) URL.revokeObjectURL(createdUrl);
    };
  }, [inlineData]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onError = () => {
      setPlaying(false);
      setFailed(true);
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      Promise.resolve(audio.play())
        .then(() => setPlaying(true))
        .catch(() => setFailed(true));
    }
  };

  const percent = duration ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  if (failed) {
    return (
      <output className="vgt-voice vgt-voice--failed">
        <Icon name="alertTriangle" size={15} />
        <span>Sprachnachricht nicht verfügbar.</span>
      </output>
    );
  }

  return (
    <div className="vgt-voice">
      {src ? (
        <audio ref={audioRef} src={src} preload="metadata">
          {/* Encrypted voice notes carry no caption track; the empty track keeps
              the media element accessible to assistive technologies. */}
          <track kind="captions" srcLang="de" label="Sprachnachricht" />
        </audio>
      ) : null}
      <button
        type="button"
        className="vgt-voice__play"
        onClick={togglePlay}
        aria-label={playing ? 'Sprachnachricht pausieren' : 'Sprachnachricht abspielen'}
        aria-pressed={playing}
      >
        <Icon name={playing ? 'pause' : 'play'} size={15} />
      </button>
      <div className="vgt-voice__track">
        <span className="vgt-voice__bar" aria-hidden="true">
          <span className="vgt-voice__fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="vgt-voice__time">
          <span className="vgt-numeric">{formatClock(progress)}</span>
          <span className="vgt-numeric">{formatClock(duration)}</span>
        </span>
      </div>
    </div>
  );
}
