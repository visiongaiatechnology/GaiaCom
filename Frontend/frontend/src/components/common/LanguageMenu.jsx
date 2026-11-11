import React from 'react';
import Icon from '../ui/Icon';
import { languageOptions, useTranslation } from '../../utils/i18n';

/**
 * Compact language switcher for the authenticated workspace (top bar).
 * Uses the shared language context, so every t() consumer re-renders live and
 * the choice is persisted in localStorage (`gaia_lang`).
 */
export default function LanguageMenu() {
  const { language, changeLanguage, t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
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

  const current = languageOptions.find(option => option.code === language) || languageOptions[0];

  return (
    <div className="ax4-lang" ref={wrapRef}>
      <button
        type="button"
        className="ax4-lang__button"
        onClick={() => setOpen(prev => !prev)}
        aria-label={t('language') || 'Sprache'}
        title={current.label}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Icon name="globe" size={16} />
        <span className="ax4-lang__code">{String(language || 'de').toUpperCase()}</span>
        <Icon name="chevronDown" size={13} />
      </button>

      {open && (
        <div className="ax4-lang__menu" role="listbox" aria-label={t('language') || 'Sprache'}>
          {languageOptions.map(option => (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={option.code === language}
              className={`ax4-lang__item${option.code === language ? ' is-active' : ''}`}
              onClick={() => {
                changeLanguage(option.code);
                setOpen(false);
              }}
            >
              <span className="ax4-lang__flag" aria-hidden="true">{option.flag}</span>
              <span className="ax4-lang__label">{option.label}</span>
              <span className="ax4-lang__item-code">{option.code.toUpperCase()}</span>
              {option.code === language && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
