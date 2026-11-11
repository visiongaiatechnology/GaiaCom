import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../utils/i18n';

const LONG_PRESS_MS = 380;
const HOVER_CLOSE_MS = 220;

function totalCount(reactions) {
  return Object.values(reactions || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

/**
 * Reaction control used by GSN posts and public channel posts.
 *
 * Default reaction is the heart; hovering the control (desktop) or long-pressing
 * it (touch) opens the full palette. Choosing an emoji replaces the previously
 * selected reaction, so exactly one reaction is shown as the user's own. All
 * counts and selections come from the real server reaction state.
 */
export default function ReactionControl({
  options = [],
  reactions = {},
  reactedByMe = {},
  onReact,
  label = 'Reaktionen',
  className = ''
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation();
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  const safeOptions = options.length > 0 ? options : ['\u2764\uFE0F'];
  const myReaction = safeOptions.find(option => reactedByMe?.[option]) || safeOptions[0];
  const myCount = Number(reactions?.[myReaction]) || 0;
  const summary = safeOptions
    .filter(option => option !== myReaction)
    .map(option => ({ emoji: option, count: Number(reactions?.[option]) || 0 }))
    .filter(entry => entry.count > 0);
  const hasReactions = totalCount(reactions) > 0;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const applyReaction = async emoji => {
    if (busy || typeof onReact !== 'function') return;
    setBusy(true);
    try {
      const activeOthers = safeOptions.filter(option => option !== emoji && reactedByMe?.[option]);
      for (const other of activeOthers) {
        // eslint-disable-next-line no-await-in-loop
        await onReact(other);
      }
      if (!reactedByMe?.[emoji] || activeOthers.length === 0) {
        await onReact(emoji);
      }
      setOpen(false);
    } catch (_) {
      // The parent surfaces the error; keep the current state untouched.
    } finally {
      setBusy(false);
    }
  };

  const handleMainClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    applyReaction(myReaction);
  };

  const handlePointerDown = event => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      longPressTriggered.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        setOpen(true);
      }, LONG_PRESS_MS);
    }
  };

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  return (
    <div
      ref={wrapRef}
      className={`vgt-rx${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`vgt-rx__main${reactedByMe?.[myReaction] ? ' is-active' : ''}`}
        aria-label={`${label}: ${myReaction}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={handleMainClick}
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onFocus={() => setOpen(true)}
        onKeyDown={event => {
          if (event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            if (event.key !== 'Enter' && event.key !== ' ') event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="vgt-rx__emoji" aria-hidden="true">{myReaction}</span>
        {myCount > 0 && <span className="vgt-rx__count vgt-numeric">{myCount}</span>}
        {!hasReactions && <span className="vgt-rx__hint">{t('ui_ch_react') || 'Reagieren'}</span>}
      </button>

      {summary.length > 0 && (
        <div className="vgt-rx__summary" aria-label="Weitere Reaktionen">
          {summary.map(entry => (
            <button
              key={entry.emoji}
              type="button"
              className={`vgt-rx__chip${reactedByMe?.[entry.emoji] ? ' is-active' : ''}`}
              aria-label={`${entry.emoji} ${entry.count}`}
              disabled={busy}
              onClick={() => applyReaction(entry.emoji)}
            >
              <span aria-hidden="true">{entry.emoji}</span>
              <span className="vgt-rx__chip-count vgt-numeric">{entry.count}</span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="vgt-rx__palette" role="menu" aria-label={`${label} auswählen`}>
          {safeOptions.map(option => {
            const count = Number(reactions?.[option]) || 0;
            const active = Boolean(reactedByMe?.[option]);
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`vgt-rx__option${active ? ' is-active' : ''}`}
                title={count > 0 ? `${count}` : ''}
                disabled={busy}
                onClick={() => applyReaction(option)}
              >
                <span aria-hidden="true">{option}</span>
                {active && <span className="vgt-rx__check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
