import React, { useState } from 'react';
import ar from './locales/ar';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fa from './locales/fa';
import fr from './locales/fr';
import hi from './locales/hi';
import id from './locales/id';
import it from './locales/it';
import ja from './locales/ja';
import ko from './locales/ko';
import pl from './locales/pl';
import pt from './locales/pt';
import ru from './locales/ru';
import sq from './locales/sq';
import tr from './locales/tr';
import uk from './locales/uk';
import zh from './locales/zh';
import landing from './locales/landing';
import appChrome from './locales/appChrome';

export const languageOptions = [
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'fa', flag: '🇮🇷', label: 'فارسی' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'zh', flag: '🇨🇳', label: '简体中文' },
  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'pl', flag: '🇵🇱', label: 'Polski' },
  { code: 'uk', flag: '🇺🇦', label: 'Українська' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'id', flag: '🇮🇩', label: 'Indonesia' },
  { code: 'sq', flag: '🇦🇱', label: 'Shqip' }
];

export const translations = {
  ar,
  de,
  en,
  es,
  fa,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  pl,
  pt,
  ru,
  sq,
  tr,
  uk,
  zh
};

// Landing-page copy is maintained as one self-contained dictionary and merged
// into the main table so every t() consumer sees it (all 18 languages).
for (const [lang, values] of Object.entries(landing)) {
  translations[lang] = { ...(translations[lang] || {}), ...values };
}

// Authenticated UI chrome (navigation, dashboard, channels) follows the same
// merge so switching language updates the whole workspace, not just landing.
for (const [lang, values] of Object.entries(appChrome)) {
  translations[lang] = { ...(translations[lang] || {}), ...values };
}

const LanguageContext = React.createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('gaia_lang') || 'de';
  });

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      localStorage.setItem('gaia_lang', lang);
    }
  };

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' || language === 'fa' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key) => {
    if (!key) return '';
    const langData = translations[language] || translations.de;
    if (langData && langData[key] !== undefined) return langData[key];
    // Never leak German into another language: fall back to English first.
    if (language !== 'en' && translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    if (translations.de && translations.de[key] !== undefined) return translations.de[key];
    return undefined;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
