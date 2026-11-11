import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../ui/Icon';
import { formatClock } from '../shared/formatTime';

/** Voice note attachment: local audio playback with honest progress + duration. */
export default function VoiceNotePlayer({ inlineData }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
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

  const percent = duration ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  return (
    <div className="vgt-voice">
      <audio ref={audioRef} src={inlineData} preload="metadata" />
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
