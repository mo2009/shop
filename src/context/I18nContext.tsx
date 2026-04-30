'use client';

import { createContext, ReactNode, useContext, useEffect } from 'react';
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
  const locale: Locale = 'en';

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('dir', 'ltr');
  }, []);

  const setLocale = () => {};

  const t = (key: keyof typeof messages.en) => {
    return (messages.en as Record<string, string>)[key as string] || String(key);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir: 'ltr' }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
