'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { messages, Locale } from '@/lib/i18n';

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof messages.en) => string;
  dir: 'ltr' | 'rtl';
};

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => String(k),
  dir: 'ltr',
});

const STORAGE_KEY = 'site-locale';

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === 'en' || stored === 'ar') {
        setLocaleState(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };

  const t = (key: keyof typeof messages.en) => {
    const dict = messages[locale] || messages.en;
    return (dict as Record<string, string>)[key as string] || (messages.en as Record<string, string>)[key as string] || String(key);
  };

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t, dir: locale === 'ar' ? 'rtl' : 'ltr' }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
